'use strict';

const turf = require('@turf/turf');

/**
 * Generates coordinate points forming concentric circles (or grids) outwards from a center point.
 * Replaces the custom grid offset generator in the old Python logic.
 */
class RadialGridSearch {
  /**
   * @param {number} centerLat 
   * @param {number} centerLng 
   */
  constructor(centerLat, centerLng) {
    this.center = turf.point([centerLng, centerLat]);
  }

  /**
   * Generator that yields coordinate points in expanding rings.
   * @param {number} stepMeters - Distance between concentric rings
   * @param {number} angularResolution - Number of points per ring
   */
  *generatePoints(stepMeters = 50, angularResolution = 8) {
    // Yield the exact center first
    yield {
      lat: this.center.geometry.coordinates[1],
      lng: this.center.geometry.coordinates[0],
      distance: 0
    };

    let currentRadius = stepMeters;
    
    // Infinite generator, typically broken out of by the caller when they hit a success or max limits
    while (true) {
      for (let angle = 0; angle < 360; angle += (360 / angularResolution)) {
        const dest = turf.destination(this.center, currentRadius, angle, { units: 'meters' });
        yield {
          lat: dest.geometry.coordinates[1],
          lng: dest.geometry.coordinates[0],
          distance: currentRadius
        };
      }
      currentRadius += stepMeters;
    }
  }
}

module.exports = {
  RadialGridSearch
};
