'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SENSITIVE_KEY_PARTS = [
  'authorization', 'cookie', 'passwd', 'password',
  'session', 'token', 'secret', 'key', 'chat',
];

/**
 * @param {*} value
 * @returns {*}
 */
function sanitizeDebugPayload(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const sanitized = {};
    for (const [key, item] of Object.entries(value)) {
      const keyLower = String(key).toLowerCase();
      if (SENSITIVE_KEY_PARTS.some(part => keyLower.includes(part))) {
        sanitized[key] = '[redacted]';
      } else {
        sanitized[key] = sanitizeDebugPayload(item);
      }
    }
    return sanitized;
  }
  if (Array.isArray(value)) {
    return value.map(item => sanitizeDebugPayload(item));
  }
  return value;
}

/**
 * Append a debug capture record (JSONL) to the given file path.
 * @param {string} filePath
 * @param {string} event
 * @param {*} payload
 * @returns {string} The file path written to.
 */
function appendDebugCapture(filePath, event, payload) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const record = {
    timestamp: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    event,
    payload: sanitizeDebugPayload(payload),
  };
  fs.appendFileSync(filePath, JSON.stringify(record) + '\n', 'utf8');
  return filePath;
}

module.exports = { sanitizeDebugPayload, appendDebugCapture, SENSITIVE_KEY_PARTS };
