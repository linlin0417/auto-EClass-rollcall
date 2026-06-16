'use strict';

const LM = require('ml-levenberg-marquardt').default;
const turf = require('@turf/turf');
const { createSafeLogger } = require('../utils/logger');

/**
 * Executes a multilateration optimization to find the center point
 * given an array of observations: { lat, lng, distanceMeters }.
 * Uses NPM libraries instead of custom WGS84 math to avoid IP issues.
 */
class MultilaterationSolver {
  constructor(options = {}) {
    this.logger = createSafeLogger(options.logger);
  }

  /**
   * Evaluates the error function (distance between guess and actual observation distance).
   * @param {Array<number>} params - [lat, lng] guess
   * @returns {Function} Error function for LM solver
   */
  _createErrorFunction(observations) {
    return ([guessLat, guessLng]) => {
      return observations.map(obs => {
        const from = turf.point([guessLng, guessLat]);
        const to = turf.point([obs.lng, obs.lat]);
        // Turf distance is in kilometers, convert to meters
        const computedDist = turf.distance(from, to, { units: 'meters' });
        return computedDist;
      });
    };
  }

  /**
   * Given a set of observations, solves for the best [lat, lng].
   * @param {Array<{lat: number, lng: number, distanceMeters: number}>} observations 
   * @returns {{ lat: number, lng: number } | null}
   */
  solve(observations) {
    if (observations.length < 3) {
      this.logger.warn('Not enough observations for robust multilateration (need >= 3).');
      return null;
    }

    // Prepare target data (the observed distances)
    const observedDistances = observations.map(o => o.distanceMeters);

    // Initial guess: Centroid of all observation points
    const points = turf.featureCollection(observations.map(o => turf.point([o.lng, o.lat])));
    const center = turf.centroid(points);
    const initialGuess = [center.geometry.coordinates[1], center.geometry.coordinates[0]]; // [lat, lng]

    const errorFn = this._createErrorFunction(observations);

    const options = {
      damping: 1.5,
      initialValues: initialGuess,
      gradientDifference: 10e-5,
      maxIterations: 100,
      errorTolerance: 10e-3
    };

    try {
      this.logger.debug(`Starting LM optimization with ${observations.length} points...`);
      const result = LM(observedDistances, errorFn, options);
      
      this.logger.debug(`Optimization finished in ${result.iterations} iterations. Param Error: ${result.parameterError}`);
      
      return {
        lat: result.parameterValues[0],
        lng: result.parameterValues[1]
      };
    } catch (err) {
      this.logger.error(`Multilateration failed: ${err.message}`);
      return null;
    }
  }
}

module.exports = {
  MultilaterationSolver
};
