'use strict';

const { GeoPoint, LocalPoint, LocalFrame, RadarGeometryError } = require('./solver');

const WGS84_A = 6378137.0;
const WGS84_F = 1.0 / 298.257223563;
const WGS84_B = WGS84_A * (1.0 - WGS84_F);
const MEAN_EARTH_RADIUS_M = 6371008.8;
const SQRT_CHI2_2D_95 = Math.sqrt(5.991464547107979);

// ---------------------------------------------------------------------------
// Configuration & Models
// ---------------------------------------------------------------------------

class GlobalRadarSolverConfig {
  constructor(opts = {}) {
    this.anchorCount = opts.anchorCount ?? 12;
    this.bearingCount = opts.bearingCount ?? 12;
    this.standardRadiiMeters = opts.standardRadiiMeters ?? [10000.0, 3000.0, 1000.0, 300.0, 100.0];
    this.supplementRadiiMeters = opts.supplementRadiiMeters ?? [300.0, 100.0, 30.0];
    this.robustFScaleMeters = opts.robustFScaleMeters ?? 50.0;
    this.measurementSigmaMeters = opts.measurementSigmaMeters ?? 0.289;
    this.targetUncertainty95Meters = opts.targetUncertainty95Meters ?? 35.0;
    this.maxPatternIterations = opts.maxPatternIterations ?? 220;
    this.maxLmIterations = opts.maxLmIterations ?? 60;
    Object.freeze(this);
  }
}

class GlobalDistanceObservation {
  /**
   * @param {GeoPoint} point
   * @param {number} distance
   * @param {string} [label='']
   */
  constructor(point, distance, label = '') {
    this.point = point;
    this.distance = distance;
    this.label = label;
    Object.freeze(this);
  }
}

class GlobalRadarEstimate {
  /**
   * @param {Object} opts
   * @param {GeoPoint} opts.point
   * @param {number} opts.residualRmse
   * @param {number} opts.robustCost
   * @param {number} opts.uncertainty95Meters
   * @param {number} opts.observationCount
   * @param {number} opts.iterations
   */
  constructor({ point, residualRmse, robustCost, uncertainty95Meters, observationCount, iterations }) {
    this.point = point;
    this.residualRmse = residualRmse;
    this.robustCost = robustCost;
    this.uncertainty95Meters = uncertainty95Meters;
    this.observationCount = observationCount;
    this.iterations = iterations;
    Object.freeze(this);
  }
}

// ---------------------------------------------------------------------------
// Math / Internal Helpers
// ---------------------------------------------------------------------------

function _normalizeLongitude(lon) {
  let normalized = (Number(lon) + 180.0) % 360.0 - 180.0;
  // JS modulo of negative can be negative. We want standard python-style modulo.
  normalized = ((Number(lon) + 180.0) % 360.0 + 360.0) % 360.0 - 180.0;
  if (normalized === -180.0 && lon > 0.0) return 180.0;
  return normalized;
}

function _normalizePoint(point) {
  const lat = Math.max(-90.0, Math.min(90.0, Number(point.lat)));
  return new GeoPoint(lat, _normalizeLongitude(Number(point.lon)));
}

function _sphericalDistanceMeters(left, right) {
  const lat1 = left.lat * (Math.PI / 180.0);
  const lat2 = right.lat * (Math.PI / 180.0);
  const dlat = lat2 - lat1;
  const dlon = _normalizeLongitude(right.lon - left.lon) * (Math.PI / 180.0);
  const haversine = Math.sin(dlat / 2.0) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2.0) ** 2;
  return MEAN_EARTH_RADIUS_M * 2.0 * Math.atan2(Math.sqrt(Math.max(haversine, 0.0)), Math.sqrt(Math.max(1.0 - haversine, 0.0)));
}

function _sphericalDirectPoint(origin, bearingDegrees, distanceMeters) {
  const lat1 = origin.lat * (Math.PI / 180.0);
  const lon1 = origin.lon * (Math.PI / 180.0);
  const bearing = bearingDegrees * (Math.PI / 180.0);
  const angular = Number(distanceMeters) / MEAN_EARTH_RADIUS_M;
  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinAngular = Math.sin(angular);
  const cosAngular = Math.cos(angular);
  const lat2 = Math.asin(sinLat1 * cosAngular + cosLat1 * sinAngular * Math.cos(bearing));
  const lon2 = lon1 + Math.atan2(Math.sin(bearing) * sinAngular * cosLat1, cosAngular - sinLat1 * Math.sin(lat2));
  return new GeoPoint(lat2 * (180.0 / Math.PI), _normalizeLongitude(lon2 * (180.0 / Math.PI)));
}

// ---------------------------------------------------------------------------
// Vincenty Formulae
// ---------------------------------------------------------------------------

function wgs84DistanceMeters(left, right) {
  left = _normalizePoint(left);
  right = _normalizePoint(right);
  if (Math.abs(left.lat - right.lat) < 1e-14 && Math.abs(left.lon - right.lon) < 1e-14) return 0.0;

  const phi1 = left.lat * (Math.PI / 180.0);
  const phi2 = right.lat * (Math.PI / 180.0);
  const lValue = _normalizeLongitude(right.lon - left.lon) * (Math.PI / 180.0);
  const u1 = Math.atan((1.0 - WGS84_F) * Math.tan(phi1));
  const u2 = Math.atan((1.0 - WGS84_F) * Math.tan(phi2));
  const sinU1 = Math.sin(u1);
  const cosU1 = Math.cos(u1);
  const sinU2 = Math.sin(u2);
  const cosU2 = Math.cos(u2);
  let lambdaValue = lValue;

  let sinSigma = 0, cosSigma = 0, sigma = 0, sinAlpha = 0, cosSqAlpha = 0, cos2SigmaM = 0;
  let converged = false;

  for (let i = 0; i < 100; i++) {
    const sinLambda = Math.sin(lambdaValue);
    const cosLambda = Math.cos(lambdaValue);
    sinSigma = Math.sqrt((cosU2 * sinLambda) ** 2 + (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) ** 2);
    if (sinSigma === 0.0) return 0.0;
    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);
    sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
    cosSqAlpha = 1.0 - sinAlpha * sinAlpha;
    if (cosSqAlpha <= 1e-15) {
      cos2SigmaM = 0.0;
    } else {
      cos2SigmaM = cosSigma - 2.0 * sinU1 * sinU2 / cosSqAlpha;
    }
    const cValue = WGS84_F / 16.0 * cosSqAlpha * (4.0 + WGS84_F * (4.0 - 3.0 * cosSqAlpha));
    const previousLambda = lambdaValue;
    lambdaValue = lValue + (1.0 - cValue) * WGS84_F * sinAlpha * (
      sigma + cValue * sinSigma * (cos2SigmaM + cValue * cosSigma * (-1.0 + 2.0 * cos2SigmaM * cos2SigmaM))
    );
    if (Math.abs(lambdaValue - previousLambda) < 1e-12) {
      converged = true;
      break;
    }
  }

  if (!converged) return _sphericalDistanceMeters(left, right);

  const uSq = cosSqAlpha * (WGS84_A * WGS84_A - WGS84_B * WGS84_B) / (WGS84_B * WGS84_B);
  const aValue = 1.0 + uSq / 16384.0 * (4096.0 + uSq * (-768.0 + uSq * (320.0 - 175.0 * uSq)));
  const bValue = uSq / 1024.0 * (256.0 + uSq * (-128.0 + uSq * (74.0 - 47.0 * uSq)));
  const deltaSigma = bValue * sinSigma * (
    cos2SigmaM + bValue / 4.0 * (
      cosSigma * (-1.0 + 2.0 * cos2SigmaM * cos2SigmaM) -
      bValue / 6.0 * cos2SigmaM * (-3.0 + 4.0 * sinSigma * sinSigma) * (-3.0 + 4.0 * cos2SigmaM * cos2SigmaM)
    )
  );
  return WGS84_B * aValue * (sigma - deltaSigma);
}

function wgs84DirectPoint(origin, bearingDegrees, distanceMeters) {
  origin = _normalizePoint(origin);
  const distance = Number(distanceMeters);
  if (Math.abs(distance) < 1e-12) return origin;

  const alpha1 = bearingDegrees * (Math.PI / 180.0);
  const phi1 = origin.lat * (Math.PI / 180.0);
  const lambda1 = origin.lon * (Math.PI / 180.0);
  const tanU1 = (1.0 - WGS84_F) * Math.tan(phi1);
  const cosU1 = 1.0 / Math.sqrt(1.0 + tanU1 * tanU1);
  const sinU1 = tanU1 * cosU1;
  const sigma1 = Math.atan2(tanU1, Math.cos(alpha1));
  const sinAlpha = cosU1 * Math.sin(alpha1);
  let cosSqAlpha = 1.0 - sinAlpha * sinAlpha;
  const uSq = cosSqAlpha * (WGS84_A * WGS84_A - WGS84_B * WGS84_B) / (WGS84_B * WGS84_B);
  const aValue = 1.0 + uSq / 16384.0 * (4096.0 + uSq * (-768.0 + uSq * (320.0 - 175.0 * uSq)));
  const bValue = uSq / 1024.0 * (256.0 + uSq * (-128.0 + uSq * (74.0 - 47.0 * uSq)));
  let sigma = distance / (WGS84_B * aValue);

  let converged = false;
  let cos2SigmaM = 0, sinSigma = 0, cosSigma = 0;

  for (let i = 0; i < 100; i++) {
    cos2SigmaM = Math.cos(2.0 * sigma1 + sigma);
    sinSigma = Math.sin(sigma);
    cosSigma = Math.cos(sigma);
    const deltaSigma = bValue * sinSigma * (
      cos2SigmaM + bValue / 4.0 * (
        cosSigma * (-1.0 + 2.0 * cos2SigmaM * cos2SigmaM) -
        bValue / 6.0 * cos2SigmaM * (-3.0 + 4.0 * sinSigma * sinSigma) * (-3.0 + 4.0 * cos2SigmaM * cos2SigmaM)
      )
    );
    const previousSigma = sigma;
    sigma = distance / (WGS84_B * aValue) + deltaSigma;
    if (Math.abs(sigma - previousSigma) < 1e-12) {
      converged = true;
      break;
    }
  }

  if (!converged) return _sphericalDirectPoint(origin, bearingDegrees, distance);

  sinSigma = Math.sin(sigma);
  cosSigma = Math.cos(sigma);
  const tmp = sinU1 * sinSigma - cosU1 * cosSigma * Math.cos(alpha1);
  const phi2 = Math.atan2(
    sinU1 * cosSigma + cosU1 * sinSigma * Math.cos(alpha1),
    (1.0 - WGS84_F) * Math.sqrt(sinAlpha * sinAlpha + tmp * tmp)
  );
  const lambdaValue = Math.atan2(
    sinSigma * Math.sin(alpha1),
    cosU1 * cosSigma - sinU1 * sinSigma * Math.cos(alpha1)
  );
  cosSqAlpha = Math.max(cosSqAlpha, 0.0);
  const cValue = WGS84_F / 16.0 * cosSqAlpha * (4.0 + WGS84_F * (4.0 - 3.0 * cosSqAlpha));
  cos2SigmaM = Math.cos(2.0 * sigma1 + sigma);
  const lValue = lambdaValue - (1.0 - cValue) * WGS84_F * sinAlpha * (
    sigma + cValue * sinSigma * (cos2SigmaM + cValue * cosSigma * (-1.0 + 2.0 * cos2SigmaM * cos2SigmaM))
  );
  const lon2 = lambda1 + lValue;
  return new GeoPoint(phi2 * (180.0 / Math.PI), _normalizeLongitude(lon2 * (180.0 / Math.PI)));
}

// ---------------------------------------------------------------------------
// 3D Math & Anchors
// ---------------------------------------------------------------------------

function _unitFromGeo(point) {
  const lat = point.lat * (Math.PI / 180.0);
  const lon = point.lon * (Math.PI / 180.0);
  const cosLat = Math.cos(lat);
  return [cosLat * Math.cos(lon), cosLat * Math.sin(lon), Math.sin(lat)];
}

function _geoFromUnit(vector) {
  let [x, y, z] = vector;
  const norm = Math.sqrt(x * x + y * y + z * z);
  if (norm <= 0.0) throw new RadarGeometryError('cannot convert a zero vector to a global point');
  x /= norm;
  y /= norm;
  z = Math.max(-1.0, Math.min(1.0, z / norm));
  return new GeoPoint(Math.asin(z) * (180.0 / Math.PI), _normalizeLongitude(Math.atan2(y, x) * (180.0 / Math.PI)));
}

function _solve3x3(matrix, values) {
  const rows = [
    [...matrix[0].slice(0, 3), Number(values[0])],
    [...matrix[1].slice(0, 3), Number(values[1])],
    [...matrix[2].slice(0, 3), Number(values[2])],
  ];
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
    }
    if (Math.abs(rows[pivot][col]) < 1e-14) return null;
    if (pivot !== col) {
      const tmp = rows[col];
      rows[col] = rows[pivot];
      rows[pivot] = tmp;
    }
    const divisor = rows[col][col];
    for (let item = col; item < 4; item++) rows[col][item] /= divisor;
    for (let row = 0; row < 3; row++) {
      if (row === col) continue;
      const factor = rows[row][col];
      for (let item = col; item < 4; item++) rows[row][item] -= factor * rows[col][item];
    }
  }
  return [rows[0][3], rows[1][3], rows[2][3]];
}

function _sphericalInitialEstimate(observations) {
  if (observations.length < 3) return null;
  const ata = [[0.0, 0.0, 0.0], [0.0, 0.0, 0.0], [0.0, 0.0, 0.0]];
  const atb = [0.0, 0.0, 0.0];
  for (const obs of observations) {
    const unit = _unitFromGeo(obs.point);
    const centralAngle = Math.max(0.0, Math.min(Math.PI, obs.distance / MEAN_EARTH_RADIUS_M));
    const targetDot = Math.cos(centralAngle);
    for (let row = 0; row < 3; row++) {
      atb[row] += unit[row] * targetDot;
      for (let col = 0; col < 3; col++) {
        ata[row][col] += unit[row] * unit[col];
      }
    }
  }
  const solved = _solve3x3(ata, atb);
  if (!solved) return null;
  try {
    return _geoFromUnit(solved);
  } catch {
    return null;
  }
}

function _fibonacciPoints(count) {
  const points = [];
  const goldenAngle = Math.PI * (3.0 - Math.sqrt(5.0));
  for (let i = 0; i < Math.max(0, count); i++) {
    const y = 1.0 - (2.0 * (i + 0.5) / count);
    const radius = Math.sqrt(Math.max(0.0, 1.0 - y * y));
    const theta = goldenAngle * i;
    points.push(_geoFromUnit([Math.cos(theta) * radius, Math.sin(theta) * radius, y]));
  }
  return points;
}

function globalAnchorPoints(count = 12) {
  const phi = (1.0 + Math.sqrt(5.0)) / 2.0;
  const vertices = [
    [0.0, 1.0, phi], [0.0, -1.0, phi], [0.0, 1.0, -phi], [0.0, -1.0, -phi],
    [1.0, phi, 0.0], [-1.0, phi, 0.0], [1.0, -phi, 0.0], [-1.0, -phi, 0.0],
    [phi, 0.0, 1.0], [-phi, 0.0, 1.0], [phi, 0.0, -1.0], [-phi, 0.0, -1.0]
  ];
  const anchors = vertices.map(_geoFromUnit);
  const requested = Math.max(3, count);
  if (requested <= anchors.length) return anchors.slice(0, requested);
  return [...anchors, ..._fibonacciPoints(requested - anchors.length)];
}

function ringSamplePoints(center, radiiMeters, { bearingCount = 12, bearingOffsetDegrees = 0.0 } = {}) {
  const points = [];
  const count = Math.max(3, bearingCount);
  for (const radius of radiiMeters) {
    const radiusValue = Math.abs(Number(radius));
    if (radiusValue <= 0.0) continue;
    for (let i = 0; i < count; i++) {
      const bearing = bearingOffsetDegrees + 360.0 * i / count;
      points.push(wgs84DirectPoint(center, bearing, radiusValue));
    }
  }
  return points;
}

function standardSamplePoints(center, config = null) {
  const cfg = config || new GlobalRadarSolverConfig();
  return ringSamplePoints(center, cfg.standardRadiiMeters, { bearingCount: cfg.bearingCount });
}

function supplementSamplePoints(center, config = null) {
  const cfg = config || new GlobalRadarSolverConfig();
  return ringSamplePoints(center, cfg.supplementRadiiMeters, {
    bearingCount: cfg.bearingCount,
    bearingOffsetDegrees: 360.0 / Math.max(3, cfg.bearingCount) / 2.0
  });
}

// ---------------------------------------------------------------------------
// Optimization
// ---------------------------------------------------------------------------

function _softL1Cost(residual, fScale) {
  const scale = Math.max(Number(fScale), 1.0);
  const value = residual / scale;
  return 2.0 * scale * scale * (Math.sqrt(1.0 + value * value) - 1.0);
}

function _robustWeight(residual, fScale) {
  const scale = Math.max(Number(fScale), 1.0);
  const value = residual / scale;
  return 1.0 / Math.sqrt(1.0 + value * value);
}

function _residuals(point, observations) {
  return observations.map(obs => wgs84DistanceMeters(point, obs.point) - obs.distance);
}

function _rmse(residuals) {
  if (!residuals || !residuals.length) return Infinity;
  const sumSq = residuals.reduce((sum, val) => sum + val * val, 0.0);
  return Math.sqrt(sumSq / residuals.length);
}

function _robustCost(point, observations, config) {
  return _residuals(point, observations).reduce((sum, res) => sum + _softL1Cost(res, config.robustFScaleMeters), 0.0);
}

function _bestSeed(observations, config, initial) {
  const candidates = [];
  if (initial) candidates.push(_normalizePoint(initial));
  const spherical = _sphericalInitialEstimate(observations);
  if (spherical) candidates.push(spherical);
  candidates.push(...globalAnchorPoints(config.anchorCount));
  candidates.push(..._fibonacciPoints(36));
  if (!candidates.length) throw new RadarGeometryError('could not build a global radar initial estimate');

  let bestPoint = candidates[0];
  let bestCost = Infinity;
  for (const pt of candidates) {
    const cost = _robustCost(pt, observations, config);
    if (cost < bestCost) {
      bestCost = cost;
      bestPoint = pt;
    }
  }
  return bestPoint;
}

function _patternRadii(initial) {
  if (!initial) {
    return [
      2000000.0, 1000000.0, 500000.0, 250000.0, 100000.0, 50000.0, 20000.0,
      10000.0, 5000.0, 2000.0, 1000.0, 500.0, 200.0, 100.0, 50.0, 20.0, 10.0, 5.0, 2.0, 1.0
    ];
  }
  return [
    50000.0, 20000.0, 10000.0, 5000.0, 2000.0, 1000.0, 500.0,
    200.0, 100.0, 50.0, 20.0, 10.0, 5.0, 2.0, 1.0
  ];
}

function _patternSearch(start, observations, config, initial) {
  let current = _normalizePoint(start);
  let currentCost = _robustCost(current, observations, config);
  let iterations = 0;
  const bearings = Array.from({ length: 16 }, (_, i) => 360.0 * i / 16.0);

  for (const radius of _patternRadii(initial)) {
    let improved = true;
    let localSteps = 0;
    while (improved && iterations < config.maxPatternIterations && localSteps < 20) {
      improved = false;
      localSteps++;
      iterations++;
      let bestPoint = current;
      let bestCost = currentCost;
      for (const bearing of bearings) {
        const candidate = wgs84DirectPoint(current, bearing, radius);
        const cost = _robustCost(candidate, observations, config);
        if (cost + 1e-9 < bestCost) {
          bestCost = cost;
          bestPoint = candidate;
        }
      }
      if (bestPoint !== current) {
        current = bestPoint;
        currentCost = bestCost;
        improved = true;
      }
    }
  }
  return { point: current, iterations };
}

function _solve2x2(a11, a12, a22, b1, b2) {
  const det = a11 * a22 - a12 * a12;
  if (Math.abs(det) < 1e-18) return null;
  return [(b1 * a22 - a12 * b2) / det, (a11 * b2 - b1 * a12) / det];
}

function _leastSquaresRefine(start, observations, config) {
  const frame = LocalFrame.fromPoints([start]);
  let current = new LocalPoint(0.0, 0.0);
  let damping = 1e-3;
  let iterations = 0;

  const pointFromLocal = (lp) => _normalizePoint(frame.toGeo(lp));
  const costAt = (lp) => _robustCost(pointFromLocal(lp), observations, config);

  let currentCost = costAt(current);

  for (iterations = 1; iterations <= config.maxLmIterations; iterations++) {
    const geo = pointFromLocal(current);
    const residuals = _residuals(geo, observations);
    const eastGeo = pointFromLocal(new LocalPoint(current.x + 1.0, current.y));
    const northGeo = pointFromLocal(new LocalPoint(current.x, current.y + 1.0));
    const eastResiduals = _residuals(eastGeo, observations);
    const northResiduals = _residuals(northGeo, observations);

    let h11 = 0, h12 = 0, h22 = 0, g1 = 0, g2 = 0;
    for (let i = 0; i < residuals.length; i++) {
      const residual = residuals[i];
      const weight = _robustWeight(residual, config.robustFScaleMeters);
      const j1 = eastResiduals[i] - residual;
      const j2 = northResiduals[i] - residual;
      h11 += weight * j1 * j1;
      h12 += weight * j1 * j2;
      h22 += weight * j2 * j2;
      g1 += weight * j1 * residual;
      g2 += weight * j2 * residual;
    }

    const solved = _solve2x2(
      h11 + damping * Math.max(h11, 1.0), h12,
      h22 + damping * Math.max(h22, 1.0),
      -g1, -g2
    );
    if (!solved) break;

    let [stepX, stepY] = solved;
    let stepNorm = Math.hypot(stepX, stepY);
    if (stepNorm > 25000.0) {
      const scale = 25000.0 / stepNorm;
      stepX *= scale;
      stepY *= scale;
      stepNorm = 25000.0;
    }

    const candidate = new LocalPoint(current.x + stepX, current.y + stepY);
    const candidateCost = costAt(candidate);

    if (candidateCost <= currentCost) {
      current = candidate;
      currentCost = candidateCost;
      damping = Math.max(damping * 0.35, 1e-12);
      if (stepNorm < 1e-4) break;
    } else {
      damping = Math.min(damping * 8.0, 1e12);
    }
  }

  return { point: pointFromLocal(current), iterations };
}

function _uncertainty95(point, observations, config, residualRmse) {
  if (observations.length < 3) return Infinity;
  const frame = LocalFrame.fromPoints([point]);
  const base = _residuals(point, observations);
  const eastPoint = _normalizePoint(frame.toGeo(new LocalPoint(1.0, 0.0)));
  const northPoint = _normalizePoint(frame.toGeo(new LocalPoint(0.0, 1.0)));
  const east = _residuals(eastPoint, observations);
  const north = _residuals(northPoint, observations);

  let h11 = 0, h12 = 0, h22 = 0;
  for (let i = 0; i < base.length; i++) {
    const residual = base[i];
    const weight = _robustWeight(residual, config.robustFScaleMeters);
    const j1 = east[i] - residual;
    const j2 = north[i] - residual;
    h11 += weight * j1 * j1;
    h12 += weight * j1 * j2;
    h22 += weight * j2 * j2;
  }

  const determinant = h11 * h22 - h12 * h12;
  if (determinant <= 1e-18) return Infinity;

  const inv11 = h22 / determinant;
  const inv12 = -h12 / determinant;
  const inv22 = h11 / determinant;
  const trace = inv11 + inv22;
  const spread = Math.sqrt(Math.max(0.0, (inv11 - inv22) ** 2 + 4.0 * inv12 ** 2));
  const maxVarianceUnit = Math.max(0.0, (trace + spread) / 2.0);
  const sigma = Math.max(config.measurementSigmaMeters, residualRmse);
  return Math.sqrt(maxVarianceUnit) * sigma * SQRT_CHI2_2D_95;
}

function solveGlobalRadar(observations, { config = null, initial = null } = {}) {
  const cfg = config || new GlobalRadarSolverConfig();
  const normalized = [];
  for (const obs of observations) {
    const dist = Number(obs.distance);
    if (Number.isNaN(dist)) throw new RadarGeometryError('global radar distance observations must be numeric');
    if (dist < 0.0) throw new RadarGeometryError('global radar distance observations must be non-negative');
    normalized.push(new GlobalDistanceObservation(_normalizePoint(obs.point), dist, obs.label));
  }
  if (normalized.length < 3) throw new RadarGeometryError('at least three global radar observations are required');

  const seed = _bestSeed(normalized, cfg, initial);
  const { point: patterned, iterations: patternIterations } = _patternSearch(seed, normalized, cfg, initial);
  const { point: refined, iterations: lmIterations } = _leastSquaresRefine(patterned, normalized, cfg);
  const { point: smallPatterned, iterations: smallIterations } = _patternSearch(refined, normalized, cfg, refined);

  const residuals = _residuals(smallPatterned, normalized);
  const rmse = _rmse(residuals);
  const cost = _robustCost(smallPatterned, normalized, cfg);
  const uncertainty = _uncertainty95(smallPatterned, normalized, cfg, rmse);

  return new GlobalRadarEstimate({
    point: smallPatterned,
    residualRmse: rmse,
    robustCost: cost,
    uncertainty95Meters: uncertainty,
    observationCount: normalized.length,
    iterations: patternIterations + lmIterations + smallIterations,
  });
}

function shouldRequestSupplement(estimate, config = null) {
  const cfg = config || new GlobalRadarSolverConfig();
  if (!Number.isFinite(estimate.uncertainty95Meters)) return true;
  if (estimate.uncertainty95Meters > cfg.targetUncertainty95Meters) return true;
  return estimate.residualRmse > Math.max(cfg.robustFScaleMeters, cfg.targetUncertainty95Meters);
}

module.exports = {
  WGS84_B,
  MEAN_EARTH_RADIUS_M,
  GlobalRadarSolverConfig,
  GlobalDistanceObservation,
  GlobalRadarEstimate,
  wgs84DistanceMeters,
  wgs84DirectPoint,
  globalAnchorPoints,
  ringSamplePoints,
  standardSamplePoints,
  supplementSamplePoints,
  solveGlobalRadar,
  shouldRequestSupplement,
};
