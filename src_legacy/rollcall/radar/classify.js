'use strict';

// ---------------------------------------------------------------------------
// Radar rollcall payload compatibility helpers.
// Translated from PythonVersion/troTHU/radar_rollcall.py
// ---------------------------------------------------------------------------

// These helpers are inlined so the file is self-contained even when
// upstream core/helpers or geo/solver haven't been created yet.
// When those modules exist, swap in `require('../../core/helpers')` etc.

/**
 * @param {*} value
 * @returns {string}
 */
function normalizeText(value) {
  return String(value || '').trim();
}

/**
 * @param {*} value
 * @param {boolean} defaultValue
 * @returns {boolean}
 */
function coerceBool(value, defaultValue) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Boolean(value);
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on', 'enable', 'enabled'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off', 'disable', 'disabled'].includes(normalized)) return false;
  }
  return defaultValue;
}

// ---------------------------------------------------------------------------
// GeoPoint – lightweight stand-in.  When geo/solver.js ships, consumers
// should import GeoPoint from there instead.
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} GeoPoint
 * @property {number} lat
 * @property {number} lon
 */

// ---------------------------------------------------------------------------
// RadarLiteInfo
// ---------------------------------------------------------------------------

class RadarLiteInfo {
  /**
   * @param {Object} [opts]
   * @param {string} [opts.rollcallId='']
   * @param {boolean} [opts.useBeacon=false]
   * @param {string} [opts.beaconNonce='']
   * @param {string} [opts.source='fallback']
   * @param {string} [opts.rawShape='empty']
   */
  constructor({
    rollcallId = '',
    useBeacon = false,
    beaconNonce = '',
    source = 'fallback',
    rawShape = 'empty',
  } = {}) {
    this.rollcallId = rollcallId;
    this.useBeacon = useBeacon;
    this.beaconNonce = beaconNonce;
    this.source = source;
    this.rawShape = rawShape;
    Object.freeze(this);
  }
}

// ---- Internal helpers ----------------------------------------------------

/**
 * @param {*} value
 * @returns {Object|null}
 */
function _asMapping(value) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  return null;
}

/**
 * Yield the top-level mapping and any nested mappings under well-known keys.
 * @param {*} payload
 * @returns {Object[]}
 */
function _iterMappings(payload) {
  const mapping = _asMapping(payload);
  if (!mapping) return [];
  const result = [mapping];
  for (const key of ['data', 'rollcall', 'lite', 'result', 'radar']) {
    const nested = _asMapping(mapping[key]);
    if (nested) {
      result.push(nested);
      const radarNested = _asMapping(nested.radar);
      if (radarNested) {
        result.push(radarNested);
      }
    }
  }
  return result;
}

/**
 * Return the first non-null/non-empty value found across mappings for any of the given keys.
 * @param {Object[]} mappings
 * @param {string[]} keys
 * @returns {*}
 */
function _firstValue(mappings, keys) {
  for (const mapping of mappings) {
    for (const key of keys) {
      if (key in mapping && mapping[key] != null && mapping[key] !== '') {
        return mapping[key];
      }
    }
  }
  return null;
}

/**
 * @param {Object[]} mappings
 * @returns {string}
 */
function _extractBeaconNonce(mappings) {
  const direct = _firstValue(mappings, [
    'beacon_nonce',
    'beaconNonce',
    'radar_beacon_nonce',
    'radarBeaconNonce',
    'nonce',
  ]);
  if (direct != null && direct !== '') {
    return normalizeText(direct);
  }

  for (const mapping of mappings) {
    const beacon = mapping.beacon;
    if (beacon !== undefined) {
      const beaconMapping = _asMapping(beacon);
      if (beaconMapping) {
        const nested = _firstValue(
          [beaconMapping],
          ['nonce', 'beacon_nonce', 'beaconNonce', 'radar_beacon_nonce'],
        );
        if (nested != null && nested !== '') {
          return normalizeText(nested);
        }
      } else if (
        typeof beacon === 'string' &&
        !['true', 'false', '0', '1'].includes(beacon.trim().toLowerCase())
      ) {
        return normalizeText(beacon);
      }
    }
  }
  return '';
}

// ---- Public functions ----------------------------------------------------

/**
 * Parse a radar-lite payload into a RadarLiteInfo.
 *
 * @param {*} payload
 * @param {*} [fallbackRollcall=null]
 * @returns {RadarLiteInfo}
 */
function parseRadarLitePayload(payload, fallbackRollcall = null) {
  const fallbackMappings = _iterMappings(fallbackRollcall);
  const payloadMappings = _iterMappings(payload);
  const mappings = [...payloadMappings, ...fallbackMappings];

  const rollcallId = _firstValue(mappings, [
    'rollcall_id',
    'rollcallId',
    'rollcallID',
    'id',
  ]);

  let beaconValue = _firstValue(mappings, [
    'use_beacon',
    'useBeacon',
    'beacon_required',
    'beaconRequired',
    'require_beacon',
    'need_beacon',
    'needBeacon',
    'beacon',
  ]);

  const boolTextTokens = new Set([
    '0', '1', 'true', 'false', 'yes', 'no',
    'on', 'off', 'enable', 'enabled', 'disable', 'disabled',
  ]);

  if (_asMapping(beaconValue)) {
    beaconValue = true;
  } else if (
    typeof beaconValue === 'string' &&
    !boolTextTokens.has(beaconValue.trim().toLowerCase())
  ) {
    beaconValue = true;
  }

  const source = payloadMappings.length ? 'payload' : 'fallback';
  let rawShape = _asMapping(payload) ? 'dict' : (payload == null ? 'NoneType' : typeof payload);
  if (_asMapping(payload)) {
    for (const key of ['data', 'rollcall', 'lite', 'result', 'radar']) {
      if (_asMapping(payload[key])) {
        rawShape = `dict:${key}`;
        break;
      }
    }
  }

  return new RadarLiteInfo({
    rollcallId: normalizeText(rollcallId),
    useBeacon: coerceBool(beaconValue, false),
    beaconNonce: _extractBeaconNonce(mappings),
    source,
    rawShape,
  });
}

/**
 * Extract (lat, lon) from a point-like object.
 * @param {*} point
 * @returns {[number, number]}
 */
function _pointLatLon(point) {
  if (point && typeof point === 'object') {
    const lat = parseFloat(point.lat);
    const lon = parseFloat(point.lon != null ? point.lon : point.lng);
    return [lat, lon];
  }
  throw new TypeError('Cannot extract lat/lon from point');
}

/**
 * @param {*} userId
 * @returns {*}
 */
function _normalizeUserId(userId) {
  if (userId == null || userId === '') return null;
  return userId;
}

/**
 * Build the GPS coordinate answer payload for a radar rollcall.
 *
 * @param {Object} point - GeoPoint-like {lat, lon|lng}
 * @param {Object} opts
 * @param {*} opts.deviceId
 * @param {*} [opts.userId='']
 * @param {boolean} [opts.useBeacon=false]
 * @param {*} [opts.beaconNonce='']
 * @param {*} [opts.accuracy=null]
 * @param {function} [opts.buildRadarSignal] - Signal builder function when beacon is required.
 * @returns {Object}
 */
function buildRadarAnswerPayload(
  point,
  { deviceId, userId = '', useBeacon = false, beaconNonce = '', accuracy = null, buildRadarSignal = null } = {},
) {
  const [lat, lon] = _pointLatLon(point);
  /** @type {Object<string, *>} */
  const payload = {
    deviceId: normalizeText(deviceId),
    latitude: lat,
    longitude: lon,
    accuracy: accuracy == null ? 60 : accuracy,
    speed: null,
    heading: null,
    altitude: 0,
    altitudeAccuracy: null,
  };
  if (useBeacon && typeof buildRadarSignal === 'function') {
    payload.radarSignal = buildRadarSignal(
      beaconNonce,
      deviceId,
      _normalizeUserId(userId),
    );
  }
  return payload;
}

/**
 * Build a diagnostic object for a radar answer attempt.
 *
 * @param {Object} opts
 * @param {string} opts.label
 * @param {Object} opts.point - GeoPoint-like
 * @param {Object} opts.result - RadarCoordinateResult-like
 * @param {Object} opts.payload - The request payload that was sent
 * @returns {Object}
 */
function buildRadarAttemptDiagnostic({ label, point, result, payload }) {
  const [lat, lon] = _pointLatLon(point);

  const sensitiveKeyParts = ['token', 'cookie', 'password', 'passwd', 'secret', 'session'];
  const payloadFields = Object.keys(payload)
    .filter((key) => !sensitiveKeyParts.some((part) => String(key).toLowerCase().includes(part)))
    .map(String)
    .sort();

  /** @type {Object<string, *>} */
  const diagnostic = {
    label: normalizeText(label),
    success: Boolean(result.success),
    latitude: Math.round(lat * 1e6) / 1e6,
    longitude: Math.round(lon * 1e6) / 1e6,
    payload_fields: payloadFields,
  };

  // has_distance → distance >= 0
  if (result.hasDistance !== undefined ? result.hasDistance : result.distance >= 0) {
    diagnostic.distance = Math.round(parseFloat(result.distance) * 1e3) / 1e3;
  }
  if (result.errorCode || result.error_code) {
    diagnostic.error_code = normalizeText(result.errorCode || result.error_code);
  }
  if (result.message) {
    diagnostic.result_message = normalizeText(result.message).slice(0, 120);
  }
  if (result.presentHint || result.present_hint) {
    diagnostic.present_hint = true;
  }
  if (result.presentStatus || result.present_status) {
    diagnostic.present_status = normalizeText(result.presentStatus || result.present_status);
  }

  return diagnostic;
}

module.exports = {
  RadarLiteInfo,
  parseRadarLitePayload,
  buildRadarAnswerPayload,
  buildRadarAttemptDiagnostic,
  // Expose inlined helpers for downstream use
  normalizeText,
  coerceBool,
};
