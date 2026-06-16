'use strict';

// ---------------------------------------------------------------------------
// QR-code rollcall payload parsing.
// Translated from PythonVersion/troTHU/qr_rollcall.py
// ---------------------------------------------------------------------------

const { createHash } = require('crypto');

// ---- TronClass base URL --------------------------------------------------

const TRON_BASE_URL = 'https://ilearn.thu.edu.tw';

// ---- Constants -----------------------------------------------------------

const TEXT_ESCAPE = String.fromCharCode(30);   // RS (record separator)
const TILDE_ESCAPE = String.fromCharCode(31);  // US (unit separator)
const TYPE_PREFIX = String.fromCharCode(26);   // SUB
const NUMBER_PREFIX = String.fromCharCode(16); // DLE
const TRUE_TOKEN = TYPE_PREFIX + '1';
const FALSE_TOKEN = TYPE_PREFIX + '0';
const BASE36_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/** @type {string[]} */
const QR_KEYS = [
  'courseId',
  'activityId',
  'activityType',
  'data',
  'rollcallId',
  'groupSetId',
  'accessCode',
  'action',
  'enableGroupRollcall',
  'createUser',
  'joinCourse',
];

/** @type {string[]} */
const QR_TYPE_KEYS = [
  'classroom-exam',
  'feedback',
  'vote',
];

/**
 * Convert a non-negative integer to its base-36 representation.
 * @param {number} number
 * @returns {string}
 */
function _base36(number) {
  if (number < 0) return '-' + _base36(-number);
  if (number < 36) return BASE36_ALPHABET[number];
  let result = '';
  let n = number;
  while (n) {
    const remainder = n % 36;
    n = Math.floor(n / 36);
    result = BASE36_ALPHABET[remainder] + result;
  }
  return result;
}

/** @type {Object<string, string>} - Maps compact base-36 code → QR_KEYS key */
const KEY_BY_CODE = Object.freeze(
  QR_KEYS.reduce((acc, key, index) => {
    acc[_base36(index)] = key;
    return acc;
  }, {}),
);

/** @type {Object<string, string>} - Maps TYPE_PREFIX+base-36 code → QR_TYPE_KEYS key */
const TYPE_BY_CODE = Object.freeze(
  QR_TYPE_KEYS.reduce((acc, key, index) => {
    acc[TYPE_PREFIX + _base36(index + 2)] = key;
    return acc;
  }, {}),
);

// ---- Classes -------------------------------------------------------------

/**
 * Parsed QR code payload.
 */
class QrCodeData {
  /**
   * @param {Object<string, *>} fields
   * @param {string} [raw='']
   * @param {Object<string, *>} [extras={}]
   */
  constructor(fields, raw = '', extras = {}) {
    this.fields = fields;
    this.raw = raw;
    this.extras = extras;
    Object.freeze(this);
  }

  /** @returns {string|null} */
  get rollcallId() {
    const value = this.fields.rollcallId || this.fields.rollcall_id || this.fields.rollcallID;
    if (value == null || value === '') return null;
    return String(value);
  }

  /** @returns {string|null} */
  get data() {
    const value = this.fields.data;
    if (value == null || value === '') return null;
    return String(value);
  }

  /**
   * Build the answer body for a QR rollcall submission.
   * @param {string} deviceId
   * @returns {Object}
   */
  answerBody(deviceId) {
    if (!this.data) {
      throw new Error('QR payload missing data field.');
    }
    return { data: this.data, deviceId };
  }
}

/**
 * Diagnostic metadata about a QR payload parse attempt.
 */
class QrPayloadDiagnostic {
  /**
   * @param {Object} opts
   */
  constructor({
    ok = false,
    sourceKind = 'unknown',
    path = '',
    encoding = '',
    rollcallId = '',
    fieldNames = [],
    extraFieldNames = [],
    missingRequired = [],
    payloadLength = 0,
    payloadHash = '',
    warnings = [],
    error = '',
  } = {}) {
    this.ok = ok;
    this.sourceKind = sourceKind;
    this.path = path;
    this.encoding = encoding;
    this.rollcallId = rollcallId;
    this.fieldNames = Object.freeze([...fieldNames]);
    this.extraFieldNames = Object.freeze([...extraFieldNames]);
    this.missingRequired = Object.freeze([...missingRequired]);
    this.payloadLength = payloadLength;
    this.payloadHash = payloadHash;
    this.warnings = Object.freeze([...warnings]);
    this.error = error;
    Object.freeze(this);
  }

  /** @returns {Object} */
  toDict() {
    const result = {
      ok: this.ok,
      source_kind: this.sourceKind,
      path: this.path,
      encoding: this.encoding,
      rollcall_id: this.rollcallId,
      field_names: [...this.fieldNames],
      extra_field_names: [...this.extraFieldNames],
      missing_required: [...this.missingRequired],
      payload_length: this.payloadLength,
      payload_hash: this.payloadHash,
      warnings: [...this.warnings],
    };
    if (this.error) {
      result.error = this.error;
    }
    return result;
  }
}

/**
 * Complete result of a QR parse attempt (data + diagnostic).
 */
class QrParseResult {
  /**
   * @param {boolean} ok
   * @param {QrCodeData|null} [data=null]
   * @param {QrPayloadDiagnostic} [diagnostic]
   */
  constructor(ok, data = null, diagnostic = new QrPayloadDiagnostic()) {
    this.ok = ok;
    this.data = data;
    this.diagnostic = diagnostic;
    Object.freeze(this);
  }

  /** @returns {Object} */
  toDict() {
    return {
      ok: this.ok,
      diagnostic: this.diagnostic.toDict(),
    };
  }
}

// ---- Internal helpers ----------------------------------------------------

/**
 * Decode a single compact-encoded value.
 * @param {string} value
 * @returns {*}
 */
function _decodeCompactValue(value) {
  if (value.startsWith(TYPE_PREFIX)) {
    if (value === TRUE_TOKEN) return true;
    if (value === FALSE_TOKEN) return false;
    return TYPE_BY_CODE[value] !== undefined ? TYPE_BY_CODE[value] : value;
  }

  if (value.startsWith(NUMBER_PREFIX)) {
    const parts = value.slice(1).split('.');
    try {
      const numbers = parts.filter((p) => p !== '').map((p) => parseInt(p, 36));
      if (numbers.some(isNaN)) return value;
      if (numbers.length > 1) {
        const floatStr = `${numbers[0]}.${numbers[1]}`;
        const parsed = parseFloat(floatStr);
        return isNaN(parsed) ? floatStr : parsed;
      }
      if (numbers.length === 1) return numbers[0];
    } catch (_) {
      return value;
    }
    return value;
  }

  return value.replaceAll(TILDE_ESCAPE, '~').replaceAll(TEXT_ESCAPE, '!');
}

/**
 * Parse a TronClass compact-encoded QR payload string.
 * @param {string} payload
 * @returns {Object<string, *>}
 */
function parseCompactPayload(payload) {
  const result = {};
  if (typeof payload !== 'string') return result;

  for (const part of payload.split('!').filter(Boolean)) {
    const tildeIndex = part.indexOf('~');
    if (tildeIndex === -1) continue;
    const keyCode = part.slice(0, tildeIndex);
    const value = part.slice(tildeIndex + 1);
    const key = KEY_BY_CODE[keyCode] !== undefined ? KEY_BY_CODE[keyCode] : keyCode;
    result[key] = _decodeCompactValue(value);
  }
  return result;
}

/**
 * @param {*} value
 * @returns {Object<string, *>}
 */
function _coerceMapping(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  const result = {};
  for (const [k, v] of Object.entries(value)) {
    result[String(k)] = v;
  }
  return result;
}

/**
 * @param {string} raw
 * @returns {string}
 */
function _payloadHash(raw) {
  return createHash('sha256')
    .update(String(raw || ''), 'utf8')
    .digest('hex')
    .slice(0, 12);
}

/**
 * @param {*} error
 * @returns {string}
 */
function _safeErrorCode(error) {
  if (error instanceof SyntaxError) return 'invalid_json';
  const text = String(error || '').trim().toLowerCase();
  if (!text) return '';
  if (text.includes('empty')) return 'empty_payload';
  if (text.includes('not a tronclass')) return 'not_tronclass_qr_url';
  if (text.includes('json')) return 'invalid_json';
  if (text.includes('rollcall') && text.includes('missing')) return 'missing_rollcall_id';
  if (text.includes('unable to parse')) return 'unable_to_parse';
  return 'parse_failed';
}

/**
 * @param {Object<string, *>} fields
 * @param {string} raw
 * @returns {QrCodeData}
 */
function _fieldsToQrData(fields, raw) {
  if (!fields || Object.keys(fields).length === 0) {
    throw new Error('Unable to parse TronClass QR payload.');
  }
  const knownKeys = new Set([...QR_KEYS, 'rollcall_id', 'rollcallID']);
  const extras = {};
  for (const [key, value] of Object.entries(fields)) {
    if (!knownKeys.has(key)) {
      extras[key] = value;
    }
  }
  return new QrCodeData(fields, raw, extras);
}

/**
 * @param {string} value
 * @returns {Object<string, *>}
 */
function _parseJsonMapping(value) {
  return _coerceMapping(JSON.parse(value));
}

// ---- URL query-string parsing (Node.js built-in) -------------------------

/**
 * Parse a query string into an object of arrays (like Python's parse_qs).
 * @param {string} queryString
 * @returns {Object<string, string[]>}
 */
function _parseQs(queryString) {
  const result = {};
  const params = new URLSearchParams(queryString);
  for (const [key, value] of params) {
    if (!result[key]) result[key] = [];
    result[key].push(value);
  }
  return result;
}

// ---- Core parse logic (all 6 format branches) ----------------------------

/**
 * Parse QR payload details from raw text.
 * Returns [QrCodeData, sourceKind, path, encoding].
 *
 * @param {string} raw
 * @param {string} [baseUrl]
 * @returns {[QrCodeData, string, string, string]}
 */
function _parseQrPayloadDetails(raw, baseUrl = TRON_BASE_URL) {
  const text = String(raw || '').trim();
  if (!text) {
    throw new Error('QR payload is empty.');
  }

  let fields = {};
  let sourceKind = 'compact';
  let path = '';
  let encoding = 'compact';

  // Try full URL
  let parsedUrl;
  let isFullUrl = false;
  try {
    parsedUrl = new URL(text);
    if (parsedUrl.protocol && parsedUrl.hostname) {
      isFullUrl = true;
    }
  } catch (_) {
    // not a full URL
  }

  if (isFullUrl) {
    sourceKind = 'url';
    path = parsedUrl.pathname;
    if (parsedUrl.pathname !== '/j' && parsedUrl.pathname !== '/scanner-jumper') {
      throw new Error('Not a TronClass QR URL.');
    }
    const query = _parseQs(parsedUrl.search.slice(1));
    if (query._p && query._p.length) {
      encoding = '_p_json';
      fields = _coerceMapping(JSON.parse(query._p[0]));
    } else if (query.p && query.p.length) {
      encoding = 'p_compact';
      fields = parseCompactPayload(query.p[0]);
    }
  } else if (text.startsWith('/j?') || text.startsWith('/scanner-jumper?')) {
    // Relative URL
    sourceKind = 'relative_url';
    const qIndex = text.indexOf('?');
    path = text.slice(0, qIndex);
    const queryStr = text.slice(qIndex + 1);
    const query = _parseQs(queryStr);
    if (query._p && query._p.length) {
      encoding = '_p_json';
      fields = _coerceMapping(JSON.parse(query._p[0]));
    } else if (query.p && query.p.length) {
      encoding = 'p_compact';
      fields = parseCompactPayload(query.p[0]);
    } else {
      // Recurse with full URL
      const fullUrl = new URL(text, baseUrl).href;
      return _parseQrPayloadDetails(fullUrl, baseUrl);
    }
  } else if (text.startsWith('?') || text.startsWith('_p=') || text.startsWith('p=')) {
    // Bare query string
    sourceKind = 'query';
    const queryText = text.startsWith('?') ? text.slice(1) : text;
    const query = _parseQs(queryText);
    if (query._p && query._p.length) {
      encoding = '_p_json';
      fields = _coerceMapping(JSON.parse(query._p[0]));
    } else if (query.p && query.p.length) {
      encoding = 'p_compact';
      fields = parseCompactPayload(query.p[0]);
    }
  } else if (text.startsWith('{') && text.endsWith('}')) {
    // Direct JSON
    sourceKind = 'json';
    encoding = 'json';
    fields = _parseJsonMapping(text);
  } else {
    // Try percent-decoded JSON
    let decoded;
    try {
      decoded = decodeURIComponent(text);
    } catch (_) {
      decoded = text;
    }
    if (decoded.startsWith('{') && decoded.endsWith('}')) {
      sourceKind = 'json';
      encoding = 'percent_json';
      fields = _parseJsonMapping(decoded);
    } else {
      // Compact payload (possibly percent-encoded)
      sourceKind = 'compact';
      encoding = 'compact';
      fields = parseCompactPayload(decoded);
    }
  }

  return [_fieldsToQrData(fields, text), sourceKind, path, encoding];
}

// ---- Public API ----------------------------------------------------------

/**
 * Parse a QR payload into a QrCodeData. Throws on failure.
 *
 * @param {string} raw
 * @param {string} [baseUrl]
 * @returns {QrCodeData}
 */
function parseQrPayload(raw, baseUrl = TRON_BASE_URL) {
  const [qrData] = _parseQrPayloadDetails(raw, baseUrl);
  return qrData;
}

/**
 * Build a diagnostic for a QR parse result.
 *
 * @param {QrCodeData|null} [qrData=null]
 * @param {Object} [opts={}]
 * @param {string} [opts.raw='']
 * @param {*} [opts.error=null]
 * @param {string} [opts.sourceKind='']
 * @param {string} [opts.path='']
 * @param {string} [opts.encoding='']
 * @returns {QrPayloadDiagnostic}
 */
function buildQrPayloadDiagnostic(
  qrData = null,
  { raw = '', error = null, sourceKind = '', path = '', encoding = '' } = {},
) {
  const text = String(raw || '');
  let fieldNames = [];
  let extraFieldNames = [];
  let rollcallId = '';
  const missingRequired = [];
  const warnings = [];
  const ok = qrData !== null && error == null;

  if (qrData !== null) {
    fieldNames = Object.keys(qrData.fields).map(String).sort();
    extraFieldNames = Object.keys(qrData.extras).map(String).sort();
    rollcallId = qrData.rollcallId || '';
    if (!rollcallId) missingRequired.push('rollcallId');
    if (!qrData.data) missingRequired.push('data');
    if (extraFieldNames.length) warnings.push('unknown_fields');
    if (missingRequired.length) warnings.push('missing_required');
  } else if (!text.trim()) {
    missingRequired.push('rollcallId', 'data');
    warnings.push('empty_payload');
  }

  const errorCode = _safeErrorCode(error);
  if (errorCode) warnings.push(errorCode);

  // De-duplicate warnings while preserving order (like dict.fromkeys in Python)
  const uniqueWarnings = [...new Map(warnings.map((w) => [w, w])).keys()];

  return new QrPayloadDiagnostic({
    ok,
    sourceKind: sourceKind || 'unknown',
    path,
    encoding,
    rollcallId,
    fieldNames,
    extraFieldNames,
    missingRequired,
    payloadLength: text.length,
    payloadHash: text ? _payloadHash(text) : '',
    warnings: uniqueWarnings,
    error: errorCode,
  });
}

/**
 * Parse a QR payload and return both the parsed data and diagnostics.
 *
 * @param {string} raw
 * @param {string} [baseUrl]
 * @returns {QrParseResult}
 */
function parseQrPayloadWithDiagnostics(raw, baseUrl = TRON_BASE_URL) {
  const text = String(raw || '').trim();
  try {
    const [qrData, sourceKind, path, encoding] = _parseQrPayloadDetails(text, baseUrl);
    return new QrParseResult(
      true,
      qrData,
      buildQrPayloadDiagnostic(qrData, { raw: text, sourceKind, path, encoding }),
    );
  } catch (exc) {
    return new QrParseResult(
      false,
      null,
      buildQrPayloadDiagnostic(null, {
        raw: text,
        error: exc,
        sourceKind: 'unknown',
        encoding: '',
      }),
    );
  }
}

/**
 * Build the full URL and body for a QR rollcall answer request.
 *
 * @param {QrCodeData} qrData
 * @param {string} deviceId
 * @param {string} [baseUrl]
 * @returns {[string, Object]}
 */
function buildQrAnswerRequest(qrData, deviceId, baseUrl = TRON_BASE_URL) {
  if (!qrData.rollcallId) {
    throw new Error('QR payload missing rollcallId field.');
  }
  const url = `${baseUrl}/api/rollcall/${qrData.rollcallId}/answer_qr_rollcall`;
  return [url, qrData.answerBody(deviceId)];
}

module.exports = {
  // Constants
  TEXT_ESCAPE,
  TILDE_ESCAPE,
  TYPE_PREFIX,
  NUMBER_PREFIX,
  TRUE_TOKEN,
  FALSE_TOKEN,
  BASE36_ALPHABET,
  QR_KEYS,
  QR_TYPE_KEYS,
  KEY_BY_CODE,
  TYPE_BY_CODE,
  TRON_BASE_URL,
  // Classes
  QrCodeData,
  QrPayloadDiagnostic,
  QrParseResult,
  // Functions
  parseCompactPayload,
  parseQrPayload,
  parseQrPayloadWithDiagnostics,
  buildQrAnswerRequest,
  buildQrPayloadDiagnostic,
};
