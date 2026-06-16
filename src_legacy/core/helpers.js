'use strict';

const crypto = require('node:crypto');

// ---------------------------------------------------------------------------
// Text / Type Coercion
// ---------------------------------------------------------------------------

/** @param {*} value @returns {string} */
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
    const n = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on', 'enable', 'enabled'].includes(n)) return true;
    if (['0', 'false', 'no', 'off', 'disable', 'disabled'].includes(n)) return false;
  }
  return defaultValue;
}

/**
 * @param {*} value
 * @param {number} defaultValue
 * @param {number} [minimum=0.1]
 * @returns {number}
 */
function coercePositiveFloat(value, defaultValue, minimum = 0.1) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return defaultValue;
  return Math.max(numeric, minimum);
}

/**
 * @param {*} value
 * @param {number} defaultValue
 * @param {number} [minimum=1]
 * @returns {number}
 */
function coercePositiveInt(value, defaultValue, minimum = 1) {
  const numeric = parseInt(value, 10);
  if (Number.isNaN(numeric)) return defaultValue;
  return Math.max(numeric, minimum);
}

// ---------------------------------------------------------------------------
// Time Parsing
// ---------------------------------------------------------------------------

const TIME_RANGE_PATTERN = /\b\d{1,2}[:：]\d{2}\b/g;

/**
 * Parse a time value into { hours, minutes } or null.
 * Accepts "HH:MM", "HH：MM", or integer minutes (0-1439).
 * @param {*} value
 * @returns {{ hours: number, minutes: number }|null}
 */
function parseTimeValue(value) {
  if (typeof value === 'number' && Number.isInteger(value)) {
    if (value >= 0 && value < 24 * 60) {
      return { hours: Math.floor(value / 60), minutes: value % 60 };
    }
  }
  const text = normalizeText(value).replace(/：/g, ':');
  if (!text) return null;
  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

/**
 * @param {*} value
 * @returns {string|null} "HH:MM" or null
 */
function formatTimeValue(value) {
  const parsed = parseTimeValue(value);
  if (!parsed) return null;
  return String(parsed.hours).padStart(2, '0') + ':' + String(parsed.minutes).padStart(2, '0');
}

// ---------------------------------------------------------------------------
// Payload Helpers
// ---------------------------------------------------------------------------

/**
 * @param {*} payload
 * @param {number} [limit=500]
 * @returns {string|null}
 */
function makePayloadExcerpt(payload, limit = 500) {
  if (payload == null) return null;
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  if (text.length > limit) return text.slice(0, limit) + '...(truncated)';
  return text;
}

// ---------------------------------------------------------------------------
// Radar Answer Parsing
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} RadarCoordinateResult
 * @property {boolean} success
 * @property {number} distance
 * @property {string} errorCode
 * @property {string} message
 * @property {boolean} presentHint
 * @property {string} presentStatus
 */

/**
 * @param {boolean} success
 * @param {Object} [opts]
 * @returns {RadarCoordinateResult}
 */
function radarCoordinateResult(success, opts = {}) {
  return Object.freeze({
    success,
    distance: opts.distance ?? -1.0,
    errorCode: opts.errorCode ?? '',
    message: opts.message ?? '',
    presentHint: opts.presentHint ?? false,
    presentStatus: opts.presentStatus ?? '',
    get hasDistance() { return this.distance >= 0.0; },
    get isScopeDistance() { return this.errorCode === 'radar_out_of_rollcall_scope' && this.hasDistance; },
  });
}

function _iterNestedValues(payload) {
  const values = [payload];
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    for (const key of ['data', 'result', 'error', 'errors', 'scope', 'rollcall']) {
      if (key in payload) {
        values.push(..._iterNestedValues(payload[key]));
      }
    }
  } else if (Array.isArray(payload)) {
    for (const item of payload.slice(0, 3)) {
      values.push(..._iterNestedValues(item));
    }
  }
  return values;
}

function _extractRadarDistance(payload) {
  for (const item of _iterNestedValues(payload)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    for (const key of ['distance', 'scope_distance', 'distance_meters', 'distanceMeters']) {
      if (!(key in item)) continue;
      const val = Number(item[key]);
      if (!Number.isNaN(val)) return val;
    }
  }
  return -1.0;
}

function _extractRadarText(payload, keys) {
  for (const item of _iterNestedValues(payload)) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      for (const key of keys) {
        const value = item[key];
        if (value && typeof value === 'object') continue;
        const text = normalizeText(value);
        if (text) return text;
      }
    } else if (typeof item === 'string') {
      const text = normalizeText(item);
      if (text) return text;
    }
  }
  return '';
}

function _iterRadarStatusValues(payload) {
  const values = [];
  const pending = [payload];
  const seen = new Set();
  const statusKeys = new Set([
    'status_name', 'statusName', 'status', 'rollcall_status',
    'rollcallStatus', 'student_rollcall_status', 'studentRollcallStatus',
  ]);
  while (pending.length) {
    const current = pending.pop();
    if (seen.has(current)) continue;
    seen.add(current);
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      for (const [key, value] of Object.entries(current)) {
        if (statusKeys.has(key) && (typeof value !== 'object' || value === null)) {
          values.push(value);
        } else if (value && typeof value === 'object') {
          pending.push(value);
        }
      }
    } else if (Array.isArray(current)) {
      pending.push(...current);
    }
  }
  return values;
}

function _extractRadarPresentStatus(payload) {
  for (const value of _iterRadarStatusValues(payload)) {
    const status = normalizeText(value).toLowerCase();
    if (status === 'on_call_fine') return status;
  }
  return '';
}

/**
 * @param {number} statusCode
 * @param {string} [bodyText='']
 * @returns {RadarCoordinateResult}
 */
function parseRadarAnswerResult(statusCode, bodyText = '') {
  const body = normalizeText(bodyText);
  let payload = null;
  if (body) {
    try { payload = JSON.parse(body); } catch { payload = body; }
  }

  const distance = _extractRadarDistance(payload);
  const presentStatus = _extractRadarPresentStatus(payload);
  const presentHint = Boolean(presentStatus);

  if (statusCode === 200) {
    return radarCoordinateResult(true, { distance: 0.0, presentHint, presentStatus });
  }

  let errorCode = _extractRadarText(payload, ['error_code', 'errorCode', 'code', 'status', 'message']);
  let message = _extractRadarText(payload, ['message', 'detail', 'description', 'error_description', 'error']);

  const combinedText = [errorCode, message, body.slice(0, 120)].filter(Boolean).join(' ');
  if (combinedText.includes('radar_out_of_rollcall_scope')) {
    errorCode = 'radar_out_of_rollcall_scope';
  } else if (statusCode === 401 || statusCode === 403) {
    message = message || errorCode || 'radar session expired';
    errorCode = 'radar_session_expired';
  } else if (statusCode === 429) {
    message = message || errorCode || 'radar rate limited';
    errorCode = 'radar_rate_limited';
  } else if (statusCode >= 500 && statusCode <= 599) {
    message = message || errorCode || 'radar server error';
    errorCode = 'radar_server_error';
  } else if (!errorCode) {
    errorCode = message || 'radar_answer_failed';
  }

  return radarCoordinateResult(false, { distance, errorCode, message: message || errorCode, presentHint, presentStatus });
}

// ---------------------------------------------------------------------------
// Radar Signal (beacon nonce MD5)
// ---------------------------------------------------------------------------

/**
 * @param {*} beaconNonce
 * @param {*} deviceId
 * @param {number|null} userId
 * @param {number|null} [timestamp]
 * @returns {string}
 */
function buildRadarSignal(beaconNonce, deviceId, userId, timestamp) {
  const ts = timestamp != null ? Math.floor(timestamp) : Date.now();
  const userIdPart = userId != null ? String(userId) : 'undefined';
  const rawSignal = `${normalizeText(beaconNonce)}${normalizeText(deviceId)}${userIdPart}${ts}`;
  const digest = crypto.createHash('md5').update(rawSignal, 'utf8').digest('hex');
  return `${digest},${ts}`;
}

// ---------------------------------------------------------------------------
// Big Digit ASCII Art
// ---------------------------------------------------------------------------

const BIG_DIGITS = {
  '0': [' ### ', '#   #', '#   #', '#   #', ' ### '],
  '1': ['  #  ', ' ##  ', '  #  ', '  #  ', ' ### '],
  '2': [' ### ', '#   #', '   # ', '  #  ', '#####'],
  '3': ['#### ', '    #', ' ### ', '    #', '#### '],
  '4': ['#   #', '#   #', '#####', '    #', '    #'],
  '5': ['#####', '#    ', '#### ', '    #', '#### '],
  '6': [' ### ', '#    ', '#### ', '#   #', ' ### '],
  '7': ['#####', '    #', '   # ', '  #  ', '  #  '],
  '8': [' ### ', '#   #', ' ### ', '#   #', ' ### '],
  '9': [' ### ', '#   #', ' ####', '    #', ' ### '],
  '?': ['#####', '    #', '  ## ', '     ', '  #  '],
};

/**
 * @param {string} text
 * @returns {string}
 */
function renderBigDigits(text) {
  const chars = normalizeText(text) || '?';
  const rows = Array.from({ length: 5 }, () => '');
  for (const ch of chars) {
    const glyph = BIG_DIGITS[ch] || BIG_DIGITS['?'];
    for (let i = 0; i < glyph.length; i++) {
      rows[i] += glyph[i] + '  ';
    }
  }
  return rows.map(r => r.trimEnd()).join('\n');
}

// ---------------------------------------------------------------------------
// Banner Formatters
// ---------------------------------------------------------------------------

function _attendanceTypeText(attendanceType) {
  const value = (attendanceType && attendanceType.value) || attendanceType;
  const text = normalizeText(value).toLowerCase();
  if (['qr', 'qrcode', 'qr_code'].includes(text)) return 'qrcode';
  if (['num', 'number'].includes(text)) return 'number';
  if (text === 'radar') return 'radar';
  return text || 'rollcall';
}

function _formatBannerBox(rows) {
  const safeRows = rows.map(r => normalizeText(r)).filter(Boolean);
  if (!safeRows.length) safeRows.push('點名成功！');
  const width = Math.max(...safeRows.map(r => r.length));
  const border = '+' + '='.repeat(width + 2) + '+';
  const lines = [border];
  safeRows.forEach((row, i) => {
    const content = i === 0 ? row.padStart(Math.floor((width + row.length) / 2)).padEnd(width) : row.padEnd(width);
    lines.push(`| ${content} |`);
  });
  lines.push(border);
  return lines.join('\n');
}

/**
 * @param {*} attendanceType
 * @param {*} [rollcallId='']
 * @param {*} [method='']
 * @param {*} [detail='']
 * @param {*} [code='']
 * @returns {string}
 */
function formatRollcallSuccessBanner(attendanceType, rollcallId = '', method = '', detail = '', code = '') {
  const typeText = _attendanceTypeText(attendanceType);
  const titleByType = { number: '數字點名成功！', radar: '雷達點名成功！', qrcode: 'QR Code 點名成功！' };
  const methodByType = { number: 'number', radar: 'radar', qrcode: 'qrcode' };
  const title = titleByType[typeText] || '點名成功！';
  const rollcallText = normalizeText(rollcallId) || 'unknown';
  const methodText = normalizeText(method) || methodByType[typeText] || typeText || 'rollcall';
  const detailText = normalizeText(detail) || 'success';
  const resultLabel = typeText === 'radar' ? 'Hit' : 'Result';
  const codeText = normalizeText(code);

  const rows = [title, `Rollcall: ${rollcallText}`, `Method: ${methodText}`];
  if (codeText) rows.push(`Code: ${codeText}`);
  rows.push(`${resultLabel}: ${detailText}`);
  return _formatBannerBox(rows);
}

function formatRollcallStartMessage(attendanceType, rollcallId = '', detail = '', method = '') {
  const typeText = _attendanceTypeText(attendanceType);
  const commandByType = { number: 'number', radar: 'radar', qrcode: 'qrcode' };
  const command = commandByType[typeText] || typeText || 'rollcall';
  const lines = [`start ${command}`, `  id:${normalizeText(rollcallId) || 'unknown'}`];
  const methodText = normalizeText(method);
  if (methodText) lines.push(`  method:${methodText}`);
  const detailText = normalizeText(detail);
  if (detailText) lines.push(`  ${detailText}`);
  return lines.join('\n');
}

function formatFoundCodeBanner(code) {
  const codeText = normalizeText(code) || 'NA';
  const bigCode = renderBigDigits(codeText);
  const bigLines = bigCode.split('\n').filter(Boolean);
  const headerLen = '找到點名數字！'.length;
  const codeLabel = `Code: ${codeText}`;
  const width = Math.max(headerLen, codeLabel.length, ...bigLines.map(l => l.length));
  const border = '+' + '='.repeat(width + 2) + '+';
  const lines = [border, `| ${'找到點名數字！'.padStart(Math.floor((width + headerLen) / 2)).padEnd(width)} |`];
  for (const line of bigLines) {
    lines.push(`| ${line.padEnd(width)} |`);
  }
  lines.push(`| ${codeLabel.padStart(Math.floor((width + codeLabel.length) / 2)).padEnd(width)} |`);
  lines.push(border);
  return lines.join('\n');
}

function formatRadarSuccessBanner(rollcallId, method = '', detail = '') {
  return formatRollcallSuccessBanner('radar', rollcallId, method, detail);
}

/**
 * @param {number} rollcallId
 * @param {number} requestCount
 * @param {string} latestTryCode
 * @param {number} startedAt - performance.now() value
 * @returns {string}
 */
function buildNumberProgressMessage(rollcallId, requestCount, latestTryCode, startedAt) {
  const elapsed = (performance.now() - startedAt) / 1000;
  return `數字點名 #${rollcallId}: 正在嘗試中... 已送出 ${requestCount}/10000，最近代碼 ${latestTryCode}，已用 ${elapsed.toFixed(1)}s`;
}

// ---------------------------------------------------------------------------
// Display Width (CJK-aware)
// ---------------------------------------------------------------------------

/**
 * Best-effort terminal column width, counting CJK/wide glyphs as 2.
 * @param {*} text
 * @returns {number}
 */
function displayWidth(text) {
  let total = 0;
  for (const ch of String(text || '')) {
    // Rough CJK detection: CJK Unified Ideographs and related ranges
    const code = ch.codePointAt(0);
    if (
      (code >= 0x1100 && code <= 0x115F) ||   // Hangul Jamo
      (code >= 0x2E80 && code <= 0x303E) ||   // CJK Radicals, Kangxi, etc.
      (code >= 0x3040 && code <= 0x33BF) ||   // Hiragana, Katakana, CJK Compatibility
      (code >= 0x3400 && code <= 0x4DBF) ||   // CJK Ext A
      (code >= 0x4E00 && code <= 0xA4CF) ||   // CJK Unified + Yi
      (code >= 0xAC00 && code <= 0xD7AF) ||   // Hangul Syllables
      (code >= 0xF900 && code <= 0xFAFF) ||   // CJK Compatibility Ideographs
      (code >= 0xFE30 && code <= 0xFE4F) ||   // CJK Compatibility Forms
      (code >= 0xFF01 && code <= 0xFF60) ||   // Fullwidth Forms
      (code >= 0xFFE0 && code <= 0xFFE6) ||   // Fullwidth Signs
      (code >= 0x20000 && code <= 0x2FA1F)    // CJK Ext B-F, Compat Supplement
    ) {
      total += 2;
    } else {
      total += 1;
    }
  }
  return total;
}

/**
 * Trim text so its display width never exceeds maxWidth columns.
 * @param {*} text
 * @param {number} maxWidth
 * @returns {string}
 */
function truncateToWidth(text, maxWidth) {
  text = String(text || '');
  if (maxWidth <= 0) return '';
  if (displayWidth(text) <= maxWidth) return text;
  const result = [];
  let used = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0);
    const charWidth = (
      (code >= 0x1100 && code <= 0x115F) ||
      (code >= 0x2E80 && code <= 0x303E) ||
      (code >= 0x3040 && code <= 0x33BF) ||
      (code >= 0x3400 && code <= 0x4DBF) ||
      (code >= 0x4E00 && code <= 0xA4CF) ||
      (code >= 0xAC00 && code <= 0xD7AF) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0xFE30 && code <= 0xFE4F) ||
      (code >= 0xFF01 && code <= 0xFF60) ||
      (code >= 0xFFE0 && code <= 0xFFE6) ||
      (code >= 0x20000 && code <= 0x2FA1F)
    ) ? 2 : 1;
    if (used + charWidth > maxWidth) break;
    result.push(ch);
    used += charWidth;
  }
  return result.join('');
}

// ---------------------------------------------------------------------------
// Clock Formatters
// ---------------------------------------------------------------------------

/**
 * @param {Date|null} moment
 * @returns {string} "HH:MM:SS"
 */
function formatClock(moment) {
  try {
    const h = String(moment.getHours()).padStart(2, '0');
    const m = String(moment.getMinutes()).padStart(2, '0');
    const s = String(moment.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  } catch {
    return '--:--:--';
  }
}

/**
 * @param {Date|null} moment
 * @returns {string} "HH:MM"
 */
function formatHhmm(moment) {
  try {
    const h = String(moment.getHours()).padStart(2, '0');
    const m = String(moment.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return '--:--';
  }
}

/**
 * @param {number} seconds
 * @returns {string} "HH:MM:SS"
 */
function formatCountdown(seconds) {
  let total;
  try {
    total = Math.max(0, Math.round(Number(seconds)));
  } catch {
    total = 0;
  }
  if (Number.isNaN(total)) total = 0;
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Monitor Status Line Builder
// ---------------------------------------------------------------------------

/**
 * @param {Object} status
 * @param {Date} now
 * @returns {string}
 */
function buildMonitorStatusLine(status, now) {
  status = (status && typeof status === 'object') ? status : {};
  const phase = String(status.phase || 'monitoring');
  const clock = formatClock(now);
  const teacherState = normalizeText(status.teacher_state || status.teacherState).toLowerCase();
  const parts = [];

  if (phase === 'standby') {
    parts.push('待機中');
    const nextAt = status.next_switch_at || status.nextSwitchAt;
    if (nextAt != null) {
      try {
        const remaining = (nextAt.getTime() - now.getTime()) / 1000;
        parts.push('倒數 ' + formatCountdown(remaining));
      } catch { /* ignore */ }
    }
    parts.push(clock);
    if (nextAt != null) parts.push(`${formatHhmm(nextAt)} 開始監控`);
  } else if (phase === 'logging_in') {
    parts.push('登入中');
    const detail = normalizeText(status.detail);
    if (detail) parts.push(detail);
    parts.push(clock);
  } else if (phase === 'paused') {
    parts.push('已暫停');
    const detail = normalizeText(status.detail);
    if (detail) parts.push(detail);
    parts.push(clock);
  } else {
    parts.push('監控中');
    let count = 0;
    try { count = parseInt(status.check_count || status.checkCount || 0, 10); } catch { /* ignore */ }
    if (count) parts.push(`第 ${count} 次`);
    const detail = normalizeText(status.detail);
    if (detail) parts.push(detail);
    const rollcallStatus = normalizeText(status.rollcall_status || status.rollcallStatus);
    if (rollcallStatus) parts.push(rollcallStatus);
  }

  if (teacherState === 'ready') parts.push('QR教師✓');
  else if (teacherState === 'failed') parts.push('QR教師✗');
  else if (teacherState === 'working') parts.push('QR教師發起中');

  return parts.join(' · ');
}

// ---------------------------------------------------------------------------
// Radar Boundary Points Normalization
// ---------------------------------------------------------------------------

/**
 * @param {*} value
 * @param {Array<Array<number>>|null} [defaultPoints]
 * @returns {Array<Array<number>>}
 */
function normalizeRadarBoundaryPoints(value, defaultPoints) {
  const { DEFAULT_BOUNDARY_POINTS } = require('../geo/solver');
  const fallbackPoints = (defaultPoints || DEFAULT_BOUNDARY_POINTS.map(p => [p.lat, p.lon]))
    .map(p => [Number(p[0]), Number(p[1])]);
  if (!Array.isArray(value)) return fallbackPoints;

  const normalized = [];
  for (const item of value) {
    try {
      let lat, lon;
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        lat = Number(item.lat);
        lon = Number(item.lon ?? item.lng);
      } else {
        lat = Number(item[0]);
        lon = Number(item[1]);
      }
      if (Number.isNaN(lat) || Number.isNaN(lon)) return fallbackPoints;
      normalized.push([lat, lon]);
    } catch {
      return fallbackPoints;
    }
  }
  if (normalized.length < 3) return fallbackPoints;
  return normalized;
}

module.exports = {
  normalizeText,
  coerceBool,
  coercePositiveFloat,
  coercePositiveInt,
  parseTimeValue,
  formatTimeValue,
  makePayloadExcerpt,
  radarCoordinateResult,
  parseRadarAnswerResult,
  buildRadarSignal,
  BIG_DIGITS,
  renderBigDigits,
  formatRollcallSuccessBanner,
  formatRollcallStartMessage,
  formatFoundCodeBanner,
  formatRadarSuccessBanner,
  buildNumberProgressMessage,
  displayWidth,
  truncateToWidth,
  formatClock,
  formatHhmm,
  formatCountdown,
  buildMonitorStatusLine,
  normalizeRadarBoundaryPoints,
  TIME_RANGE_PATTERN,
};
