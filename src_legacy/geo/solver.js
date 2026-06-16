'use strict';

/**
 * Radar rollcall geometry helpers.
 *
 * The functions in this module are deliberately dependency-free. They keep the
 * live HTTP flow out of the geometry code so projection, probe planning, and
 * least-squares behavior can be tested offline.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WGS84_A = 6378137.0;
const WGS84_F = 1.0 / 298.257223563;
const WGS84_E2 = WGS84_F * (2.0 - WGS84_F);

/** @type {ReadonlyArray<[number, number]>} */
const DEFAULT_BOUNDARY_POINTS = Object.freeze([
  [24.174503, 120.611990],
  [24.183279, 120.613658],
  [24.181276523213068, 120.5937236680773],
  [24.17735264149224, 120.59779550644511],
]);

// ---------------------------------------------------------------------------
// Data classes (frozen plain objects backed by lightweight constructors)
// ---------------------------------------------------------------------------

class GeoPoint {
  /**
   * @param {number} lat
   * @param {number} lon
   */
  constructor(lat, lon) {
    this.lat = lat;
    this.lon = lon;
    Object.freeze(this);
  }
}

class LocalPoint {
  /**
   * @param {number} x  – east offset in meters
   * @param {number} y  – north offset in meters
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
    Object.freeze(this);
  }
}

class DistanceObservation {
  /**
   * @param {LocalPoint} point
   * @param {number} distance
   */
  constructor(point, distance) {
    this.point = point;
    this.distance = distance;
    Object.freeze(this);
  }
}

class ProbePlan {
  /**
   * @param {LocalFrame} frame
   * @param {ReadonlyArray<GeoPoint>} boundary
   * @param {ReadonlyArray<LocalPoint>} hull
   * @param {ReadonlyArray<LocalPoint>} probes
   */
  constructor(frame, boundary, hull, probes) {
    this.frame = frame;
    this.boundary = Object.freeze([...boundary]);
    this.hull = Object.freeze([...hull]);
    this.probes = Object.freeze([...probes]);
    Object.freeze(this);
  }

  /** @returns {ReadonlyArray<GeoPoint>} */
  get geoProbes() {
    return Object.freeze(this.probes.map((p) => this.frame.toGeo(p)));
  }
}

class SolveResult {
  /**
   * @param {LocalPoint} point
   * @param {number} residualRmse
   * @param {number} iterations
   */
  constructor(point, residualRmse, iterations) {
    this.point = point;
    this.residualRmse = residualRmse;
    this.iterations = iterations;
    Object.freeze(this);
  }
}

class GridCandidate {
  /**
   * @param {GeoPoint} point
   * @param {number} ring
   * @param {number} eastOffset
   * @param {number} northOffset
   */
  constructor(point, ring, eastOffset, northOffset) {
    this.point = point;
    this.ring = ring;
    this.eastOffset = eastOffset;
    this.northOffset = northOffset;
    Object.freeze(this);
  }
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

class RadarGeometryError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'RadarGeometryError';
  }
}

// ---------------------------------------------------------------------------
// Internal vector helpers
// ---------------------------------------------------------------------------

/**
 * @param {number[]} left
 * @param {number[]} right
 * @returns {number}
 */
function _dot(left, right) {
  let sum = 0;
  for (let i = 0; i < left.length && i < right.length; i++) {
    sum += left[i] * right[i];
  }
  return sum;
}

/**
 * @param {number[]} left
 * @param {number[]} right
 * @returns {[number, number, number]}
 */
function _sub(left, right) {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

// ---------------------------------------------------------------------------
// ECEF / LLH conversions
// ---------------------------------------------------------------------------

/**
 * @param {GeoPoint} point
 * @param {number} [height=0]
 * @returns {[number, number, number]}
 */
function _llhToEcef(point, height = 0.0) {
  const lat = point.lat * Math.PI / 180;
  const lon = point.lon * Math.PI / 180;
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const normal = WGS84_A / Math.sqrt(1.0 - WGS84_E2 * sinLat * sinLat);
  return [
    (normal + height) * cosLat * Math.cos(lon),
    (normal + height) * cosLat * Math.sin(lon),
    (normal * (1.0 - WGS84_E2) + height) * sinLat,
  ];
}

/**
 * @param {number[]} ecef
 * @returns {GeoPoint}
 */
function _ecefToLlh(ecef) {
  const [x, y, z] = ecef;
  const lon = Math.atan2(y, x);
  const horizontal = Math.hypot(x, y);
  let lat = Math.atan2(z, horizontal * (1.0 - WGS84_E2));
  let height = 0.0;

  for (let i = 0; i < 12; i++) {
    const sinLat = Math.sin(lat);
    const normal = WGS84_A / Math.sqrt(1.0 - WGS84_E2 * sinLat * sinLat);
    const cosLat = Math.cos(lat);
    if (Math.abs(cosLat) < 1e-15) {
      height = z / Math.max(Math.abs(sinLat), 1e-15) - normal * (1.0 - WGS84_E2);
    } else {
      height = horizontal / cosLat - normal;
    }
    const nextLat = Math.atan2(
      z,
      horizontal * (1.0 - WGS84_E2 * normal / (normal + height)),
    );
    if (Math.abs(nextLat - lat) < 1e-14) {
      lat = nextLat;
      break;
    }
    lat = nextLat;
  }

  return new GeoPoint(lat * 180 / Math.PI, lon * 180 / Math.PI);
}

/**
 * @param {GeoPoint} origin
 * @returns {[[number,number,number],[number,number,number],[number,number,number]]}
 */
function _enuBasis(origin) {
  const lat = origin.lat * Math.PI / 180;
  const lon = origin.lon * Math.PI / 180;
  return [
    [-Math.sin(lon), Math.cos(lon), 0.0],
    [
      -Math.sin(lat) * Math.cos(lon),
      -Math.sin(lat) * Math.sin(lon),
      Math.cos(lat),
    ],
    [
      Math.cos(lat) * Math.cos(lon),
      Math.cos(lat) * Math.sin(lon),
      Math.sin(lat),
    ],
  ];
}

// ---------------------------------------------------------------------------
// LocalFrame
// ---------------------------------------------------------------------------

class LocalFrame {
  /**
   * @param {GeoPoint} origin
   * @param {[number,number,number]} originEcef
   * @param {[[number,number,number],[number,number,number],[number,number,number]]} basis
   */
  constructor(origin, originEcef, basis) {
    this.origin = origin;
    this._originEcef = originEcef;
    this._basis = basis;
    Object.freeze(this);
  }

  /**
   * Build a local ENU frame centred on the mean of the supplied points.
   * @param {GeoPoint[]} points
   * @returns {LocalFrame}
   */
  static fromPoints(points) {
    if (!points || points.length === 0) {
      throw new RadarGeometryError('at least one point is required to build a local frame');
    }
    let latSum = 0;
    let lonSum = 0;
    for (const p of points) {
      latSum += p.lat;
      lonSum += p.lon;
    }
    const origin = new GeoPoint(latSum / points.length, lonSum / points.length);
    return new LocalFrame(origin, _llhToEcef(origin), _enuBasis(origin));
  }

  /**
   * Project a geographic point into this local ENU frame.
   * @param {GeoPoint} point
   * @returns {LocalPoint}
   */
  toLocal(point) {
    const delta = _sub(_llhToEcef(point), this._originEcef);
    return new LocalPoint(_dot(this._basis[0], delta), _dot(this._basis[1], delta));
  }

  /**
   * Convert a local ENU point back to geographic coordinates.
   * @param {LocalPoint} point
   * @returns {GeoPoint}
   */
  toGeo(point) {
    const [east, north, _up] = this._basis;
    const delta = [
      east[0] * point.x + north[0] * point.y,
      east[1] * point.x + north[1] * point.y,
      east[2] * point.x + north[2] * point.y,
    ];
    const ecef = [
      this._originEcef[0] + delta[0],
      this._originEcef[1] + delta[1],
      this._originEcef[2] + delta[2],
    ];
    return _ecefToLlh(ecef);
  }
}

// ---------------------------------------------------------------------------
// Public geometry functions
// ---------------------------------------------------------------------------

/**
 * Normalize heterogeneous point representations to GeoPoint[].
 * Accepts GeoPoint, {lat, lon/lng}, or [lat, lon] tuples.
 *
 * @param {Array<GeoPoint|{lat:number,lon?:number,lng?:number}|[number,number]>} points
 * @returns {GeoPoint[]}
 */
function normalizeGeoPoints(points) {
  /** @type {GeoPoint[]} */
  const normalized = [];
  for (const item of points) {
    /** @type {GeoPoint} */
    let point;
    if (item instanceof GeoPoint) {
      point = item;
    } else if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
      const lon = item.lon !== undefined ? item.lon : item.lng;
      point = new GeoPoint(Number(item.lat), Number(lon));
    } else {
      // Array-like [lat, lon]
      const [lat, lon] = item;
      point = new GeoPoint(Number(lat), Number(lon));
    }
    normalized.push(point);
  }
  if (normalized.length < 3) {
    throw new RadarGeometryError('at least three boundary points are required');
  }
  return normalized;
}

/**
 * Euclidean distance between two local points.
 * @param {LocalPoint} left
 * @param {LocalPoint} right
 * @returns {number}
 */
function distance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

/**
 * Signed area of a simple polygon (shoelace formula).
 * @param {LocalPoint[]} points
 * @returns {number}
 */
function polygonArea(points) {
  if (points.length < 3) return 0.0;
  let total = 0.0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const next = points[(i + 1) % points.length];
    total += p.x * next.y - next.x * p.y;
  }
  return 0.5 * total;
}

/**
 * Centroid of a simple polygon.
 * @param {LocalPoint[]} points
 * @returns {LocalPoint}
 */
function polygonCentroid(points) {
  const area = polygonArea(points);
  if (Math.abs(area) < 1e-9) {
    let sx = 0, sy = 0;
    for (const p of points) { sx += p.x; sy += p.y; }
    return new LocalPoint(sx / points.length, sy / points.length);
  }

  let cx = 0.0;
  let cy = 0.0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const next = points[(i + 1) % points.length];
    const cross = p.x * next.y - next.x * p.y;
    cx += (p.x + next.x) * cross;
    cy += (p.y + next.y) * cross;
  }
  const scale = 1.0 / (6.0 * area);
  return new LocalPoint(cx * scale, cy * scale);
}

/**
 * 2-D cross product relative to an origin.
 * @param {LocalPoint} origin
 * @param {LocalPoint} left
 * @param {LocalPoint} right
 * @returns {number}
 */
function _cross(origin, left, right) {
  return (left.x - origin.x) * (right.y - origin.y) -
         (left.y - origin.y) * (right.x - origin.x);
}

/**
 * Convex hull via Andrew's monotone-chain algorithm.
 * @param {LocalPoint[]} points
 * @returns {LocalPoint[]}
 */
function convexHull(points) {
  // Deduplicate and sort lexicographically
  const seen = new Set();
  const unique = [];
  for (const p of points) {
    const key = `${p.x},${p.y}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push([p.x, p.y]);
    }
  }
  unique.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  if (unique.length <= 1) {
    return unique.map(([x, y]) => new LocalPoint(x, y));
  }

  const sortedPoints = unique.map(([x, y]) => new LocalPoint(x, y));

  /** @type {LocalPoint[]} */
  const lower = [];
  for (const p of sortedPoints) {
    while (lower.length >= 2 && _cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0.0) {
      lower.pop();
    }
    lower.push(p);
  }

  /** @type {LocalPoint[]} */
  const upper = [];
  for (let i = sortedPoints.length - 1; i >= 0; i--) {
    const p = sortedPoints[i];
    while (upper.length >= 2 && _cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0.0) {
      upper.pop();
    }
    upper.push(p);
  }

  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  if (hull.length < 3 || Math.abs(polygonArea(hull)) < 1e-6) {
    throw new RadarGeometryError('boundary points are degenerate');
  }
  return hull;
}

/**
 * Ray-casting point-in-polygon test with edge tolerance.
 * @param {LocalPoint} point
 * @param {LocalPoint[]} polygon
 * @param {number} [tolerance=1e-9]
 * @returns {boolean}
 */
function pointInPolygon(point, polygon, tolerance = 1e-9) {
  let inside = false;
  let previous = polygon[polygon.length - 1];
  for (const current of polygon) {
    const edgeCross = _cross(previous, current, point);
    if (
      Math.abs(edgeCross) <= tolerance &&
      Math.min(previous.x, current.x) - tolerance <= point.x &&
      point.x <= Math.max(previous.x, current.x) + tolerance &&
      Math.min(previous.y, current.y) - tolerance <= point.y &&
      point.y <= Math.max(previous.y, current.y) + tolerance
    ) {
      return true;
    }
    if ((current.y > point.y) !== (previous.y > point.y)) {
      const slopeX =
        (previous.x - current.x) * (point.y - current.y) / (previous.y - current.y) +
        current.x;
      if (point.x < slopeX) {
        inside = !inside;
      }
    }
    previous = current;
  }
  return inside;
}

// ---------------------------------------------------------------------------
// Probe-plan helpers
// ---------------------------------------------------------------------------

/**
 * @param {LocalPoint} center
 * @param {number} radius
 * @param {number} angle
 * @returns {[LocalPoint, LocalPoint, LocalPoint]}
 */
function _equilateral(center, radius, angle) {
  const result = [];
  for (let i = 0; i < 3; i++) {
    result.push(new LocalPoint(
      center.x + radius * Math.cos(angle + 2.0 * Math.PI * i / 3.0),
      center.y + radius * Math.sin(angle + 2.0 * Math.PI * i / 3.0),
    ));
  }
  return /** @type {[LocalPoint, LocalPoint, LocalPoint]} */ (result);
}

/**
 * @param {LocalPoint[]} hull
 * @param {LocalPoint} center
 * @param {number} outsideScale
 * @returns {[LocalPoint, LocalPoint, LocalPoint]}
 */
function _enclosingEquilateral(hull, center, outsideScale) {
  const maxRadius = Math.max(...hull.map((p) => distance(center, p)));
  const baseRadius = Math.max(maxRadius * Math.max(outsideScale, 1.05), 100.0);
  /** @type {null|{radius:number, triangle:[LocalPoint,LocalPoint,LocalPoint]}} */
  let best = null;

  for (let step = 0; step < 36; step++) {
    const angle = step * 5.0 * Math.PI / 180;
    let radius = baseRadius;
    for (let j = 0; j < 40; j++) {
      const triangle = _equilateral(center, radius, angle);
      if (hull.every((p) => pointInPolygon(p, triangle, 1e-7))) {
        if (best === null || radius < best.radius) {
          best = { radius, triangle };
        }
        break;
      }
      radius *= 1.08;
    }
  }

  if (best === null) {
    throw new RadarGeometryError('could not build an enclosing radar probe triangle');
  }
  return best.triangle;
}

/**
 * @param {LocalPoint[]} hull
 * @returns {[LocalPoint, LocalPoint, LocalPoint]}
 */
function _largestHullTriangle(hull) {
  let bestArea = -1.0;
  /** @type {[LocalPoint, LocalPoint, LocalPoint]|null} */
  let bestTriangle = null;
  for (let i = 0; i < hull.length; i++) {
    for (let j = i + 1; j < hull.length; j++) {
      for (let k = j + 1; k < hull.length; k++) {
        const tri = [hull[i], hull[j], hull[k]];
        const area = Math.abs(polygonArea(tri));
        if (area > bestArea) {
          bestArea = area;
          bestTriangle = /** @type {[LocalPoint, LocalPoint, LocalPoint]} */ (tri);
        }
      }
    }
  }
  if (bestTriangle === null) {
    throw new RadarGeometryError('could not choose boundary probes');
  }
  return bestTriangle;
}

/**
 * Build a probe plan for radar rollcall geometry.
 *
 * @param {Array} [boundaryPoints] – defaults to DEFAULT_BOUNDARY_POINTS
 * @param {object} [options]
 * @param {boolean} [options.allowOutside=true]
 * @param {number} [options.outsideScale=1.6]
 * @returns {ProbePlan}
 */
function buildProbePlan(boundaryPoints = DEFAULT_BOUNDARY_POINTS, { allowOutside = true, outsideScale = 1.6 } = {}) {
  const boundary = normalizeGeoPoints(boundaryPoints);
  const frame = LocalFrame.fromPoints(boundary);
  const localPoints = boundary.map((p) => frame.toLocal(p));
  const hull = convexHull(localPoints);
  const center = polygonCentroid(hull);
  const probes = allowOutside
    ? _enclosingEquilateral(hull, center, outsideScale)
    : _largestHullTriangle(hull);
  return new ProbePlan(frame, boundary, hull, probes);
}

// ---------------------------------------------------------------------------
// Radical-center & LM solver
// ---------------------------------------------------------------------------

/**
 * @param {DistanceObservation[]} observations
 * @returns {LocalPoint}
 */
function radicalCenter(observations) {
  if (observations.length < 3) {
    throw new RadarGeometryError('three observations are required for a radical center');
  }
  const [first, second, third] = observations;
  const p1 = first.point, p2 = second.point, p3 = third.point;
  const a11 = 2.0 * (p2.x - p1.x);
  const a12 = 2.0 * (p2.y - p1.y);
  const a21 = 2.0 * (p3.x - p1.x);
  const a22 = 2.0 * (p3.y - p1.y);
  const b1 =
    first.distance * first.distance -
    second.distance * second.distance +
    p2.x * p2.x - p1.x * p1.x +
    p2.y * p2.y - p1.y * p1.y;
  const b2 =
    first.distance * first.distance -
    third.distance * third.distance +
    p3.x * p3.x - p1.x * p1.x +
    p3.y * p3.y - p1.y * p1.y;
  const determinant = a11 * a22 - a12 * a21;
  if (Math.abs(determinant) < 1e-9) {
    throw new RadarGeometryError('radar observations are nearly collinear');
  }
  return new LocalPoint(
    (b1 * a22 - a12 * b2) / determinant,
    (a11 * b2 - b1 * a21) / determinant,
  );
}

/**
 * @param {DistanceObservation[]} observations
 * @returns {LocalPoint}
 */
function _fallbackInitial(observations) {
  let sx = 0, sy = 0;
  for (const obs of observations) { sx += obs.point.x; sy += obs.point.y; }
  return new LocalPoint(sx / observations.length, sy / observations.length);
}

/**
 * @param {LocalPoint} point
 * @param {DistanceObservation[]} observations
 * @returns {number}
 */
function _residualCost(point, observations) {
  let total = 0.0;
  for (const obs of observations) {
    const predicted = Math.max(distance(point, obs.point), 1e-9);
    const residual = predicted - obs.distance;
    const weight = 1.0 / Math.max(obs.distance * obs.distance, 1.0);
    total += weight * residual * residual;
  }
  return total;
}

/**
 * Levenberg–Marquardt position solver.
 *
 * @param {DistanceObservation[]} observations
 * @param {object} [options]
 * @param {LocalPoint|null} [options.initial=null]
 * @param {number} [options.maxIterations=80]
 * @returns {SolveResult}
 */
function solvePosition(observations, { initial = null, maxIterations = 80 } = {}) {
  if (observations.length < 3) {
    throw new RadarGeometryError('at least three distance observations are required');
  }
  if (observations.some((obs) => obs.distance < 0.0)) {
    throw new RadarGeometryError('distance observations must be non-negative');
  }

  let current;
  try {
    current = initial || radicalCenter(observations);
  } catch (e) {
    if (e instanceof RadarGeometryError) {
      current = initial || _fallbackInitial(observations);
    } else {
      throw e;
    }
  }

  let damping = 1e-3;
  let iterations = 0;
  for (iterations = 1; iterations <= maxIterations; iterations++) {
    let h11 = 0, h12 = 0, h22 = 0;
    let g1 = 0, g2 = 0;
    for (const obs of observations) {
      const dx = current.x - obs.point.x;
      const dy = current.y - obs.point.y;
      const predicted = Math.max(Math.hypot(dx, dy), 1e-9);
      const residual = predicted - obs.distance;
      const weight = 1.0 / Math.max(obs.distance * obs.distance, 1.0);
      const j1 = dx / predicted;
      const j2 = dy / predicted;
      h11 += weight * j1 * j1;
      h12 += weight * j1 * j2;
      h22 += weight * j2 * j2;
      g1 += weight * j1 * residual;
      g2 += weight * j2 * residual;
    }

    const a11 = h11 + damping * Math.max(h11, 1.0);
    const a12 = h12;
    const a22 = h22 + damping * Math.max(h22, 1.0);
    const determinant = a11 * a22 - a12 * a12;
    if (Math.abs(determinant) < 1e-18) break;

    const stepX = (-g1 * a22 + a12 * g2) / determinant;
    const stepY = (a12 * g1 - a11 * g2) / determinant;
    const candidate = new LocalPoint(current.x + stepX, current.y + stepY);

    if (_residualCost(candidate, observations) <= _residualCost(current, observations)) {
      current = candidate;
      damping = Math.max(damping * 0.35, 1e-12);
      if (Math.hypot(stepX, stepY) < 1e-6) break;
    } else {
      damping = Math.min(damping * 8.0, 1e12);
    }
  }

  let sumSq = 0;
  for (const obs of observations) {
    const r = distance(current, obs.point) - obs.distance;
    sumSq += r * r;
  }
  const rmse = Math.sqrt(sumSq / observations.length);
  return new SolveResult(current, rmse, iterations);
}

// ---------------------------------------------------------------------------
// GDOP & fourth-probe selection
// ---------------------------------------------------------------------------

/**
 * Geometric Dilution of Precision.
 * @param {LocalPoint} target
 * @param {LocalPoint[]} probes
 * @returns {number}
 */
function gdop(target, probes) {
  let h11 = 0, h12 = 0, h22 = 0;
  for (const probe of probes) {
    const dx = target.x - probe.x;
    const dy = target.y - probe.y;
    const dist = Math.max(Math.hypot(dx, dy), 1e-9);
    const ux = dx / dist;
    const uy = dy / dist;
    h11 += ux * ux;
    h12 += ux * uy;
    h22 += uy * uy;
  }
  const determinant = h11 * h22 - h12 * h12;
  if (determinant <= 1e-12) return Infinity;
  return Math.sqrt((h11 + h22) / determinant);
}

/**
 * Select an optimal fourth probe to minimize GDOP.
 *
 * @param {LocalPoint} estimate
 * @param {LocalPoint[]} existingProbes
 * @param {LocalPoint[]} hull
 * @param {object} [options]
 * @param {boolean} [options.allowOutside=true]
 * @returns {LocalPoint}
 */
function chooseFourthProbe(estimate, existingProbes, hull, { allowOutside = true } = {}) {
  const maxRadius = Math.max(...hull.map((p) => distance(estimate, p)));
  const radius = Math.max(300.0, Math.min(maxRadius * 1.25, maxRadius + 900.0));
  let bestScore = Infinity;
  /** @type {LocalPoint|null} */
  let bestPoint = null;

  const radii = [radius, radius * 0.7, radius * 1.35];
  for (const candidateRadius of radii) {
    for (let step = 0; step < 72; step++) {
      const angle = 2.0 * Math.PI * step / 72.0;
      const candidate = new LocalPoint(
        estimate.x + candidateRadius * Math.cos(angle),
        estimate.y + candidateRadius * Math.sin(angle),
      );
      if (!allowOutside && !pointInPolygon(candidate, hull)) continue;
      const score = gdop(estimate, [...existingProbes, candidate]);
      if (score < bestScore) {
        bestScore = score;
        bestPoint = candidate;
      }
    }
  }

  return bestPoint !== null ? bestPoint : estimate;
}

// ---------------------------------------------------------------------------
// Grid offset generators
// ---------------------------------------------------------------------------

/**
 * Bounded grid offsets in concentric rings.
 * @param {number} stepMeters
 * @param {number} radiusMeters
 * @yields {[number, number]}
 */
function* gridOffsets(stepMeters, radiusMeters) {
  let step, radius;
  try {
    step = Math.abs(Number(stepMeters));
    radius = Math.abs(Number(radiusMeters));
  } catch (_e) {
    return;
  }
  if (Number.isNaN(step) || Number.isNaN(radius) || step <= 0.0 || radius <= 0.0) return;

  const maxSteps = Math.floor(radius / step + 1e-9);
  for (let ring = 1; ring <= maxSteps; ring++) {
    /** @type {[number, number][]} */
    const ringOffsets = [];
    for (let eastStep = -ring; eastStep <= ring; eastStep++) {
      for (let northStep = -ring; northStep <= ring; northStep++) {
        if (Math.max(Math.abs(eastStep), Math.abs(northStep)) === ring) {
          ringOffsets.push([eastStep, northStep]);
        }
      }
    }
    ringOffsets.sort((a, b) => {
      const distA = a[0] * a[0] + a[1] * a[1];
      const distB = b[0] * b[0] + b[1] * b[1];
      if (distA !== distB) return distA - distB;
      const angleA = (Math.atan2(a[1], a[0]) + 2.0 * Math.PI) % (2.0 * Math.PI);
      const angleB = (Math.atan2(b[1], b[0]) + 2.0 * Math.PI) % (2.0 * Math.PI);
      return angleA - angleB;
    });
    for (const [eastStep, northStep] of ringOffsets) {
      yield [eastStep * step, northStep * step];
    }
  }
}

// ---------------------------------------------------------------------------
// Minimal binary-heap for unbounded grid (avoid external deps)
// ---------------------------------------------------------------------------

class _MinHeap {
  constructor() {
    /** @type {Array} */
    this._data = [];
  }

  get size() { return this._data.length; }

  /** @param {*} item */
  push(item) {
    this._data.push(item);
    this._siftUp(this._data.length - 1);
  }

  /** @returns {*} */
  pop() {
    const data = this._data;
    const top = data[0];
    const last = data.pop();
    if (data.length > 0) {
      data[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  /** @param {number} i */
  _siftUp(i) {
    const data = this._data;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this._cmp(data[i], data[parent]) < 0) {
        [data[i], data[parent]] = [data[parent], data[i]];
        i = parent;
      } else break;
    }
  }

  /** @param {number} i */
  _siftDown(i) {
    const data = this._data;
    const n = data.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this._cmp(data[left], data[smallest]) < 0) smallest = left;
      if (right < n && this._cmp(data[right], data[smallest]) < 0) smallest = right;
      if (smallest === i) break;
      [data[i], data[smallest]] = [data[smallest], data[i]];
      i = smallest;
    }
  }

  /**
   * Compare two heap entries [distance2, angle, eastStep, northStep].
   * @param {number[]} a
   * @param {number[]} b
   * @returns {number}
   */
  _cmp(a, b) {
    if (a[0] !== b[0]) return a[0] - b[0];
    return a[1] - b[1];
  }
}

/**
 * Infinite grid offsets expanding outward by distance, yielding [east, north, ring].
 * @param {number} [stepMeters=100]
 * @yields {[number, number, number]}
 */
function* unboundedGridOffsets(stepMeters = 100.0) {
  const step = Math.abs(Number(stepMeters));
  if (step <= 0.0) throw new RadarGeometryError('grid step must be positive');
  yield [0.0, 0.0, 0];

  const queued = new Set();
  queued.add('0,0');
  const heap = new _MinHeap();

  /**
   * @param {number} eastStep
   * @param {number} northStep
   */
  function queue(eastStep, northStep) {
    const key = `${eastStep},${northStep}`;
    if (queued.has(key)) return;
    queued.add(key);
    const distance2 = eastStep * eastStep + northStep * northStep;
    const angle = (Math.atan2(northStep, eastStep) + 2.0 * Math.PI) % (2.0 * Math.PI);
    heap.push([distance2, angle, eastStep, northStep]);
  }

  queue(1, 0);
  queue(0, 1);
  queue(-1, 0);
  queue(0, -1);

  while (heap.size > 0) {
    const [distance2, _angle, eastStep, northStep] = heap.pop();
    const ring = Math.ceil(Math.sqrt(distance2));
    yield [eastStep * step, northStep * step, ring];
    queue(eastStep + 1, northStep);
    queue(eastStep - 1, northStep);
    queue(eastStep, northStep + 1);
    queue(eastStep, northStep - 1);
  }
}

/**
 * Infinite grid candidates expanding outward from a center GeoPoint.
 * @param {GeoPoint} center
 * @param {object} [options]
 * @param {number} [options.stepMeters=100]
 * @yields {GridCandidate}
 */
function* unboundedGridCandidates(center, { stepMeters = 100.0 } = {}) {
  const frame = LocalFrame.fromPoints([center]);
  for (const [eastOffset, northOffset, ring] of unboundedGridOffsets(stepMeters)) {
    const local = new LocalPoint(eastOffset, northOffset);
    yield new GridCandidate(
      frame.toGeo(local),
      ring,
      eastOffset,
      northOffset,
    );
  }
}

/**
 * Generate a grid of final candidate GeoPoints around an estimate.
 *
 * @param {LocalFrame} frame
 * @param {LocalPoint} estimate
 * @param {object} [options]
 * @param {number} [options.maxCandidates=100]
 * @param {number} [options.gridStepMeters=5]
 * @param {number} [options.gridRadiusMeters=20]
 * @returns {GeoPoint[]}
 */
function finalCandidatePoints(frame, estimate, { maxCandidates = 100, gridStepMeters = 5.0, gridRadiusMeters = 20.0 } = {}) {
  /** @type {GeoPoint[]} */
  const candidates = [];
  const seen = new Set();

  /**
   * @param {GeoPoint} point
   */
  function add(point) {
    if (candidates.length >= maxCandidates) return;
    const key = `${point.lat},${point.lon}`;
    if (!seen.has(key)) {
      seen.add(key);
      candidates.push(point);
    }
  }

  add(frame.toGeo(estimate));

  for (const [eastOffset, northOffset] of gridOffsets(gridStepMeters, gridRadiusMeters)) {
    const local = new LocalPoint(estimate.x + eastOffset, estimate.y + northOffset);
    add(frame.toGeo(local));
    if (candidates.length >= maxCandidates) break;
  }

  return candidates;
}

/**
 * Distance between two GeoPoints projected into a local frame.
 * @param {LocalFrame} frame
 * @param {GeoPoint} left
 * @param {GeoPoint} right
 * @returns {number}
 */
function localDistanceToGeo(frame, left, right) {
  return distance(frame.toLocal(left), frame.toLocal(right));
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Constants
  WGS84_A,
  WGS84_F,
  WGS84_E2,
  DEFAULT_BOUNDARY_POINTS,

  // Classes
  GeoPoint,
  LocalPoint,
  DistanceObservation,
  ProbePlan,
  SolveResult,
  GridCandidate,
  LocalFrame,

  // Error
  RadarGeometryError,

  // Functions
  normalizeGeoPoints,
  distance,
  polygonArea,
  polygonCentroid,
  convexHull,
  pointInPolygon,
  buildProbePlan,
  radicalCenter,
  solvePosition,
  gdop,
  chooseFourthProbe,
  gridOffsets,
  unboundedGridOffsets,
  unboundedGridCandidates,
  finalCandidatePoints,
  localDistanceToGeo,
};
