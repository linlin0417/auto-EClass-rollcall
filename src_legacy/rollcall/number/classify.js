'use strict';

// ---------------------------------------------------------------------------
// Number rollcall response classification and code extraction.
// Translated from PythonVersion/troTHU/number_rollcall.py
// ---------------------------------------------------------------------------

/**
 * @enum {string}
 */
const NumberAttemptStatus = Object.freeze({
  SUCCESS: 'success',
  WRONG_CODE: 'wrong_code',
  TRANSIENT_FAILURE: 'transient_failure',
  UNAUTHORIZED: 'unauthorized',
  UNKNOWN_FAILURE: 'unknown_failure',
});

/**
 * Immutable result of a single number-rollcall HTTP attempt.
 */
class NumberAttemptResult {
  /**
   * @param {string} status - One of NumberAttemptStatus values.
   * @param {number} httpStatus - HTTP response status code.
   * @param {string} [message='']
   * @param {Object|null} [payload=null]
   */
  constructor(status, httpStatus, message = '', payload = null) {
    this.status = status;
    this.httpStatus = httpStatus;
    this.message = message;
    this.payload = payload;
    Object.freeze(this);
  }

  /** @returns {boolean} */
  get success() {
    return this.status === NumberAttemptStatus.SUCCESS;
  }

  /** @returns {boolean} */
  get retriable() {
    return this.status === NumberAttemptStatus.TRANSIENT_FAILURE;
  }

  /** @returns {boolean} */
  get terminal() {
    return (
      this.status === NumberAttemptStatus.SUCCESS ||
      this.status === NumberAttemptStatus.UNAUTHORIZED ||
      this.status === NumberAttemptStatus.UNKNOWN_FAILURE
    );
  }
}

// ---- Marker constants ----------------------------------------------------

/** @type {string[]} */
const SUCCESS_MARKERS = Object.freeze([
  'success',
  'ok',
  'on_call',
  'on_call_fine',
  'accepted',
  'completed',
  '已完成',
  '成功',
  '點名成功',
  '簽到成功',
]);

/** @type {string[]} */
const WRONG_CODE_MARKERS = Object.freeze([
  'wrong',
  'incorrect',
  'invalid number',
  'invalid code',
  'not match',
  'mismatch',
  '錯誤',
  '錯碼',
  '不正確',
  '失敗',
  '不存在',
  '過期',
]);

/** @type {string[]} */
const UNAUTHORIZED_MARKERS = Object.freeze([
  'unauthorized',
  'forbidden',
  'login',
  'sign in',
  'session expired',
  '未登入',
  '請登入',
  '登入逾時',
  '權限',
]);

// ---- Internal helpers ----------------------------------------------------

/**
 * @param {string} text
 * @param {string[]} markers
 * @returns {boolean}
 */
function _textHasAny(text, markers) {
  const lowered = text.toLowerCase();
  return markers.some((marker) => lowered.includes(marker));
}

/**
 * Extract a human-readable message from a parsed JSON payload.
 * @param {Object} payload
 * @returns {string}
 */
function _payloadMessage(payload) {
  for (const key of ['message', 'msg', 'error', 'error_description', 'detail', 'status']) {
    const value = payload[key];
    if (value != null && value !== '') {
      return String(value);
    }
  }
  return '';
}

/**
 * @param {Object} payload
 * @param {...string} keys
 * @returns {boolean|null}
 */
function _payloadBool(payload, ...keys) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return null;
}

/**
 * Try to parse text as a JSON object (dict). Returns null on failure
 * or if the result is not a plain object.
 * @param {string} text
 * @returns {Object|null}
 */
function _loadsJson(text) {
  try {
    const parsed = JSON.parse(text);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch (_) {
    // not valid JSON
  }
  return null;
}

// ---- Public functions ----------------------------------------------------

/**
 * @param {number} statusCode
 * @returns {boolean}
 */
function isTransientNumberStatus(statusCode) {
  return [408, 425, 429].includes(statusCode) || (statusCode >= 500 && statusCode <= 599);
}

/**
 * Classify an HTTP response from a number-rollcall answer attempt.
 *
 * @param {number} statusCode - HTTP response status code.
 * @param {string} [bodyText=''] - Raw response body text.
 * @returns {NumberAttemptResult}
 */
function classifyNumberResponse(statusCode, bodyText = '') {
  const text = String(bodyText || '').trim();
  const payload = text ? _loadsJson(text) : null;
  const message = payload ? _payloadMessage(payload) : text.slice(0, 200);
  const combinedText = [text, message].filter(Boolean).join(' ').trim();

  // 401 / 403 → unauthorized
  if (statusCode === 401 || statusCode === 403) {
    return new NumberAttemptResult(
      NumberAttemptStatus.UNAUTHORIZED,
      statusCode,
      message || 'authentication expired',
      payload,
    );
  }

  // Transient server-side / rate-limit errors
  if (isTransientNumberStatus(statusCode)) {
    return new NumberAttemptResult(
      NumberAttemptStatus.TRANSIENT_FAILURE,
      statusCode,
      message || 'temporary HTTP failure',
      payload,
    );
  }

  // 400 / 409 / 422 → wrong code
  if ([400, 409, 422].includes(statusCode)) {
    return new NumberAttemptResult(
      NumberAttemptStatus.WRONG_CODE,
      statusCode,
      message || 'wrong number code',
      payload,
    );
  }

  // 2xx range – success with nuanced sub-classification
  if (statusCode >= 200 && statusCode <= 299) {
    if (!text) {
      return new NumberAttemptResult(NumberAttemptStatus.SUCCESS, statusCode, 'empty 2xx', payload);
    }

    if (_textHasAny(combinedText, UNAUTHORIZED_MARKERS)) {
      return new NumberAttemptResult(
        NumberAttemptStatus.UNAUTHORIZED,
        statusCode,
        message || 'authentication required',
        payload,
      );
    }

    const successFlag = _payloadBool(payload || {}, 'success', 'ok', 'is_success');
    if (successFlag === true) {
      return new NumberAttemptResult(NumberAttemptStatus.SUCCESS, statusCode, message, payload);
    }

    if (_textHasAny(combinedText, WRONG_CODE_MARKERS)) {
      return new NumberAttemptResult(
        NumberAttemptStatus.WRONG_CODE,
        statusCode,
        message || 'wrong number code',
        payload,
      );
    }

    if (successFlag === false) {
      return new NumberAttemptResult(
        NumberAttemptStatus.WRONG_CODE,
        statusCode,
        message || 'server rejected number code',
        payload,
      );
    }

    const markerText = payload ? message : combinedText;
    if (_textHasAny(markerText, SUCCESS_MARKERS)) {
      return new NumberAttemptResult(NumberAttemptStatus.SUCCESS, statusCode, message, payload);
    }

    return new NumberAttemptResult(NumberAttemptStatus.SUCCESS, statusCode, message || '2xx', payload);
  }

  // 3xx → treat as unauthorized (redirect during rollcall)
  if (statusCode >= 300 && statusCode <= 399) {
    return new NumberAttemptResult(
      NumberAttemptStatus.UNAUTHORIZED,
      statusCode,
      message || 'redirected during number rollcall',
      payload,
    );
  }

  // Everything else → unknown failure
  return new NumberAttemptResult(
    NumberAttemptStatus.UNKNOWN_FAILURE,
    statusCode,
    message || 'unexpected HTTP response',
    payload,
  );
}

// ---- Number code extraction ----------------------------------------------

const FOUR_DIGIT_CODE_RE = /^\d{4}$/;

/**
 * Result of reading a number_code directly from a student_rollcalls payload.
 */
class NumberCodeLookup {
  /**
   * @param {Object} [opts]
   * @param {string|null} [opts.code=null]
   * @param {string} [opts.status='']
   * @param {string} [opts.endTime='']
   * @param {string} [opts.source='']
   */
  constructor({ code = null, status = '', endTime = '', source = '' } = {}) {
    this.code = code;
    this.status = status;
    this.endTime = endTime;
    this.source = source;
    Object.freeze(this);
  }

  /** @returns {boolean} */
  get hasCode() {
    return Boolean(this.code);
  }
}

/**
 * Return a normalized 4-digit code string, or null when not a valid code.
 * @param {*} value
 * @returns {string|null}
 */
function coerceNumberCode(value) {
  if (value == null || typeof value === 'boolean') {
    return null;
  }
  let text;
  if (typeof value === 'number' && Number.isInteger(value)) {
    text = value >= 0 && value <= 9999 ? String(value).padStart(4, '0') : String(value);
  } else {
    text = String(value).trim();
  }
  return FOUR_DIGIT_CODE_RE.test(text) ? text : null;
}

/**
 * Extract a usable 4-digit number_code from a student_rollcalls-style payload.
 *
 * Robust to the real/observed TronClass shapes:
 *   - rollcall object with top-level code: {"number_code": "0001", "status": ..., "end_time": ...}
 *   - wrapped:                              {"data": {"number_code": ...}}
 *   - rollcall object carrying a per-student array:
 *                                           {"number_code": ..., "student_rollcalls": [...]}
 *   - container of student items:           {"student_rollcalls": [{"number_code": ...}]}
 *   - bare list of student items:           [{"number_code": ...}, ...]
 *
 * Returns NumberCodeLookup(code=null, ...) when no valid 4-digit code is present, so
 * callers can fall back to the brute-force path without raising.
 *
 * @param {*} payload
 * @returns {NumberCodeLookup}
 */
function parseNumberCodePayload(payload) {
  const meta = { status: '', endTime: '' };

  function absorbMeta(obj) {
    if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
      if (!meta.status && obj.status != null && obj.status !== '') {
        meta.status = String(obj.status);
      }
      if (!meta.endTime && obj.end_time != null && obj.end_time !== '') {
        meta.endTime = String(obj.end_time);
      }
    }
  }

  function result(code, source) {
    return new NumberCodeLookup({
      code,
      status: meta.status,
      endTime: meta.endTime,
      source,
    });
  }

  if (payload !== null && typeof payload === 'object' && !Array.isArray(payload)) {
    absorbMeta(payload);
    let code = coerceNumberCode(payload.number_code);
    if (code) {
      return result(code, 'number_code');
    }

    const data = payload.data;
    if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
      absorbMeta(data);
      code = coerceNumberCode(data.number_code);
      if (code) {
        return result(code, 'data.number_code');
      }
    }

    for (const containerKey of ['student_rollcalls', 'data']) {
      const items = payload[containerKey];
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            absorbMeta(item);
            code = coerceNumberCode(item.number_code);
            if (code) {
              return result(code, `${containerKey}[].number_code`);
            }
          }
        }
      }
    }
  } else if (Array.isArray(payload)) {
    for (const item of payload) {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        absorbMeta(item);
        const code = coerceNumberCode(item.number_code);
        if (code) {
          return result(code, 'list[].number_code');
        }
      }
    }
  }

  return result(null, '');
}

module.exports = {
  NumberAttemptStatus,
  NumberAttemptResult,
  NumberCodeLookup,
  SUCCESS_MARKERS,
  WRONG_CODE_MARKERS,
  UNAUTHORIZED_MARKERS,
  isTransientNumberStatus,
  classifyNumberResponse,
  coerceNumberCode,
  parseNumberCodePayload,
};
