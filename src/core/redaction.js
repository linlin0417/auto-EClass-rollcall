'use strict';

/**
 * Centralized sensitive field redaction.
 * All modules use this instead of ad-hoc masking.
 */

const SENSITIVE_KEYS = new Set([
  'passwd', 'password', 'pass', 'pwd',
  'token', 'access_token', 'refresh_token',
  'secret', 'key', 'api_key', 'apiKey',
  'cookie', 'session', 'session_id', 'sessionId',
  'authorization', 'auth',
  'x-session-id',
]);

const PARTIAL_SENSITIVE_KEYS = [
  'token', 'secret', 'password', 'passwd', 'cookie',
];

/**
 * @param {string} key
 * @returns {boolean}
 */
function isSensitiveKey(key) {
  const lower = String(key || '').toLowerCase().replace(/-/g, '_');
  if (SENSITIVE_KEYS.has(lower)) return true;
  return PARTIAL_SENSITIVE_KEYS.some(p => lower.includes(p));
}

/**
 * @param {*} value
 * @returns {string}
 */
function redactValue(value) {
  const text = String(value || '');
  if (text.length <= 4) return '***';
  return text.slice(0, 2) + '***' + text.slice(-2);
}

/**
 * Deep-redact an object, replacing values of sensitive keys.
 * @param {*} obj
 * @param {Set<string>} [extraKeys]
 * @returns {*}
 */
function redactObject(obj, extraKeys) {
  if (obj == null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => redactObject(item, extraKeys));

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key) || (extraKeys && extraKeys.has(key.toLowerCase()))) {
      result[key] = typeof value === 'string' ? redactValue(value) : '[redacted]';
    } else if (value && typeof value === 'object') {
      result[key] = redactObject(value, extraKeys);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Redact GPS coordinates to ~100m precision for diagnostics.
 * @param {number} value
 * @param {number} [precision=3]
 * @returns {number}
 */
function redactCoordinate(value, precision = 3) {
  return Number(Number(value).toFixed(precision));
}

/**
 * Redact a URL by masking query parameter values that look sensitive.
 * @param {string} url
 * @returns {string}
 */
function redactUrl(url) {
  try {
    const parsed = new URL(url);
    for (const [key] of parsed.searchParams) {
      if (isSensitiveKey(key)) {
        parsed.searchParams.set(key, '[redacted]');
      }
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

module.exports = {
  SENSITIVE_KEYS,
  isSensitiveKey,
  redactValue,
  redactObject,
  redactCoordinate,
  redactUrl,
};
