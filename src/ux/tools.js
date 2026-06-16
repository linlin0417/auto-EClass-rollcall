'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { sanitizeDebugPayload } = require('../security/debug-capture');

// ---------------------------------------------------------------------------
// Public-facing redaction (more aggressive than debug capture)
// ---------------------------------------------------------------------------

const PUBLIC_SECRET_EXACT_KEYS = new Set([
  'authorization', 'passwd', 'password', 'secret', 'token', 'value',
]);

const PUBLIC_SECRET_KEY_PARTS = [
  'access_token', 'auth_header', 'bot_token',
  'cookie_value', 'refresh_token', 'session_id',
];

/**
 * @param {*} value
 * @returns {*}
 */
function sanitizePublicPayload(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const sanitized = {};
    for (const [key, item] of Object.entries(value)) {
      const lowered = String(key).toLowerCase();
      if (PUBLIC_SECRET_EXACT_KEYS.has(lowered) || PUBLIC_SECRET_KEY_PARTS.some(p => lowered.includes(p))) {
        sanitized[key] = '[redacted]';
      } else {
        sanitized[key] = sanitizePublicPayload(item);
      }
    }
    return sanitized;
  }
  if (Array.isArray(value)) return value.map(item => sanitizePublicPayload(item));
  return value;
}

function jsonText(value) {
  return JSON.stringify(sanitizePublicPayload(value), null, 2);
}

function writeJson(filePath, value) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, jsonText(value) + '\n', 'utf8');
  return filePath;
}

// ---------------------------------------------------------------------------
// File utilities
// ---------------------------------------------------------------------------

/**
 * @param {string} filePath
 * @param {Date} [now]
 * @returns {number|null}
 */
function fileAgeSeconds(filePath, now) {
  try {
    const stat = fs.statSync(filePath);
    const nowTs = (now || new Date()).getTime() / 1000;
    return Math.max(0.0, nowTs - stat.mtimeMs / 1000);
  } catch {
    return null;
  }
}

/**
 * @param {number|null} seconds
 * @returns {string}
 */
function humanAge(seconds) {
  if (seconds == null) return 'missing';
  if (seconds < 60) return '<1m';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/**
 * @param {string} filePath
 * @returns {number|null}
 */
function safeMtime(filePath) {
  try {
    return fs.statSync(filePath).mtimeMs / 1000;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Check items (for doctor / diagnostics)
// ---------------------------------------------------------------------------

function checkItem(name, ok, message, { severity = 'warn' } = {}) {
  return { name, status: ok ? 'ok' : severity, message };
}

function renderCheckItems(items) {
  const labels = { ok: 'OK', warn: 'WARN', fail: 'FAIL' };
  return items.map(item => {
    const status = String(item.status || 'warn').toLowerCase();
    const label = labels[status] || status.toUpperCase();
    return `[${label}] ${item.name || '-'} - ${item.message || ''}`;
  }).join('\n');
}

// ---------------------------------------------------------------------------
// JSONL log helpers
// ---------------------------------------------------------------------------

function iterJsonlFiles(logDir) {
  try {
    if (!fs.existsSync(logDir)) return [];
    const files = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.jsonl')) files.push(full);
      }
    };
    walk(logDir);
    files.sort((a, b) => {
      try { return fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs; } catch { return 0; }
    });
    return files;
  } catch {
    return [];
  }
}

function readJsonlRecords(filePath, limit) {
  const records = [];
  try {
    if (!fs.existsSync(filePath)) return records;
    let lines = fs.readFileSync(filePath, 'utf8').split('\n');
    if (limit != null) lines = lines.slice(-limit);
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        records.push(sanitizeDebugPayload(JSON.parse(line)));
      } catch {
        records.push({ raw: line });
      }
    }
  } catch { /* ignore read errors */ }
  return records;
}

function tailLogRecords(logDir, limit = 20) {
  limit = Math.max(1, Math.floor(limit || 20));
  let records = [];
  const files = iterJsonlFiles(logDir);
  for (let i = files.length - 1; i >= 0; i--) {
    const remaining = limit - records.length;
    if (remaining <= 0) break;
    records = [...readJsonlRecords(files[i], remaining), ...records];
  }
  return records.slice(-limit);
}

function summarizeLogs(logDir, maxFiles = 100) {
  const files = iterJsonlFiles(logDir).slice(-maxFiles);
  const eventCounts = {};
  const statusCounts = {};
  let total = 0;
  let firstTimestamp = '';
  let lastTimestamp = '';
  for (const filePath of files) {
    for (const record of readJsonlRecords(filePath)) {
      total++;
      const timestamp = String(record.timestamp || '');
      if (timestamp && !firstTimestamp) firstTimestamp = timestamp;
      if (timestamp) lastTimestamp = timestamp;
      const event = String(record.event || 'unknown');
      const status = String(record.status || 'unknown');
      eventCounts[event] = (eventCounts[event] || 0) + 1;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }
  }
  return {
    log_dir: logDir,
    file_count: files.length,
    record_count: total,
    first_timestamp: firstTimestamp,
    last_timestamp: lastTimestamp,
    events: eventCounts,
    statuses: statusCounts,
  };
}

// ---------------------------------------------------------------------------
// Debug bundle export
// ---------------------------------------------------------------------------

function exportDebugBundle(outputPath, { configSummary, doctorReport, logSummary, recentLogs, debugCapturePath }) {
  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });
  if (!outputPath.endsWith('.zip')) outputPath += '.zip';

  // Note: For simplicity, we write a JSON manifest file instead of a ZIP.
  // A proper ZIP implementation could use a third-party library or the
  // built-in zlib to create a ZIP file. For now, we create a directory bundle.
  const bundleDir = outputPath.replace(/\.zip$/, '');
  fs.mkdirSync(bundleDir, { recursive: true });

  const debugCaptureRecords = debugCapturePath ? readJsonlRecords(debugCapturePath, 200) : [];

  const bundleItems = {
    'config-summary.json': configSummary,
    'doctor.json': doctorReport,
    'logs-summary.json': logSummary,
    'recent-logs.json': recentLogs,
    'debug-capture.json': debugCaptureRecords,
    'manifest.json': {
      created_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
      sensitive_fields: 'redacted',
    },
  };

  for (const [name, value] of Object.entries(bundleItems)) {
    fs.writeFileSync(path.join(bundleDir, name), jsonText(value) + '\n', 'utf8');
  }

  return bundleDir;
}

module.exports = {
  sanitizePublicPayload,
  jsonText,
  writeJson,
  fileAgeSeconds,
  humanAge,
  safeMtime,
  checkItem,
  renderCheckItems,
  iterJsonlFiles,
  readJsonlRecords,
  tailLogRecords,
  summarizeLogs,
  exportDebugBundle,
};
