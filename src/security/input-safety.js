'use strict';

/**
 * Field-aware input cleanup for human-facing CLI and monitor console paths.
 */

const SENSITIVE_FIELD_TYPES = new Set(['password', 'token', 'secret']);
const QR_FIELD_TYPES = new Set(['qr_payload', 'qr']);
const COLLAPSE_SPACE_RE = /\s+/g;
const TIME_RANGE_RE = /\b\d{1,2}[:：]\d{2}\b/g;

// ---------------------------------------------------------------------------
// InputSanitizationResult
// ---------------------------------------------------------------------------

class InputSanitizationResult {
  /**
   * @param {string} value
   * @param {boolean} [changed=false]
   * @param {string[]} [warnings=[]]
   * @param {boolean} [valid=true]
   * @param {string} [reason='']
   */
  constructor(value, changed = false, warnings = [], valid = true, reason = '') {
    this.value = value;
    this.changed = changed;
    this.warnings = Object.freeze([...warnings]);
    this.valid = valid;
    this.reason = reason;
    Object.freeze(this);
  }

  toDict() {
    return {
      value: this.reason === 'sensitive' ? '[redacted]' : this.value,
      changed: this.changed,
      warnings: [...this.warnings],
      valid: this.valid,
      reason: this.reason,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _warning(field, message) {
  return `${field}: ${message}`;
}

function _collapseSpaces(value) {
  return value.replace(COLLAPSE_SPACE_RE, ' ').trim();
}

function _normalizeFieldType(fieldType) {
  return String(fieldType || 'text').trim().toLowerCase().replace(/-/g, '_');
}

// ---------------------------------------------------------------------------
// Core Sanitization
// ---------------------------------------------------------------------------

/**
 * @param {*} value
 * @param {Object} [opts]
 * @param {string} [opts.fieldType='text']
 * @param {string} [opts.fieldName='']
 * @returns {InputSanitizationResult}
 */
function sanitizeInputField(value, { fieldType = 'text', fieldName = '' } = {}) {
  const kind = _normalizeFieldType(fieldType);
  const label = fieldName || kind;
  const original = value == null ? '' : String(value);
  const warnings = [];

  if (QR_FIELD_TYPES.has(kind)) {
    const cleaned = original.trim();
    if (cleaned !== original) {
      warnings.push(_warning(label, '已移除前後空白；QR 內容內部未被修改。'));
    }
    return new InputSanitizationResult(cleaned, cleaned !== original, warnings, Boolean(cleaned), cleaned ? '' : 'empty');
  }

  if (SENSITIVE_FIELD_TYPES.has(kind)) {
    const cleaned = original.trim();
    if (cleaned !== original) {
      warnings.push(_warning(label, '已移除前後空白；內容已遮蔽，不會記錄原值。'));
    }
    return new InputSanitizationResult(cleaned, cleaned !== original, warnings, Boolean(cleaned), cleaned ? 'sensitive' : 'empty');
  }

  let cleaned;
  if (['student_id', 'profile', 'profile_name', 'provider', 'env', 'env_var', 'channel_id', 'host', 'port'].includes(kind)) {
    cleaned = _collapseSpaces(original);
  } else if (['time_range', 'schedule'].includes(kind)) {
    const text = original.replace(/：/g, ':');
    const matches = text.match(TIME_RANGE_RE);
    cleaned = (matches && matches.length >= 2)
      ? matches.slice(0, 2).map(m => m.replace(/：/g, ':')).join(' - ')
      : _collapseSpaces(text);
  } else {
    cleaned = _collapseSpaces(original);
  }

  if (cleaned !== original) {
    warnings.push(_warning(label, '已自動修正多餘空白。'));
  }

  let valid = true;
  let reason = '';

  if (['profile', 'profile_name'].includes(kind) && !cleaned) {
    valid = false;
    reason = 'empty_profile';
    warnings.push(_warning(label, 'profile 名稱不可為空。'));
  }

  if (kind === 'port') {
    try {
      const port = parseInt(cleaned, 10);
      valid = !Number.isNaN(port) && port >= 1 && port <= 65535;
    } catch {
      valid = false;
    }
    if (!valid) {
      reason = 'invalid_port';
      warnings.push(_warning(label, 'port 必須是 1 到 65535 的整數。'));
    }
  }

  if (kind === 'provider' && cleaned) {
    cleaned = cleaned.toLowerCase();
  }

  return new InputSanitizationResult(cleaned, cleaned !== original, warnings, valid, reason);
}

/**
 * @param {Object} value
 * @param {Object<string, string>} fieldTypes
 * @returns {{ sanitized: Object, warnings: string[] }}
 */
function sanitizeMappingFields(value, fieldTypes) {
  const sanitized = { ...value };
  const warnings = [];
  for (const [key, fieldType] of Object.entries(fieldTypes)) {
    if (!(key in sanitized)) continue;
    const result = sanitizeInputField(sanitized[key], { fieldType, fieldName: key });
    sanitized[key] = result.value;
    warnings.push(...result.warnings);
  }
  return { sanitized, warnings };
}

/**
 * Mutate common config string fields into safer human-entered values.
 * @param {Object} config
 * @returns {string[]}
 */
function sanitizeConfigValues(config) {
  const warnings = [];
  if (!config || typeof config !== 'object') return warnings;

  // account
  const account = config.account;
  if (account && typeof account === 'object') {
    const { sanitized, warnings: w } = sanitizeMappingFields(account, { user: 'student_id', passwd: 'password' });
    Object.assign(account, sanitized);
    warnings.push(...w);
  }

  // accounts.profiles
  const accounts = config.accounts;
  const profiles = (accounts && typeof accounts === 'object') ? accounts.profiles : null;
  if (profiles && typeof profiles === 'object') {
    for (const [name, profile] of Object.entries(profiles)) {
      const safeName = sanitizeInputField(name, { fieldType: 'profile', fieldName: 'accounts.profile' }).value;
      if (safeName && safeName !== name) {
        profiles[safeName] = profiles[name];
        delete profiles[name];
        warnings.push('accounts.profile: 已修正 profile 名稱空白。');
      }
      if (profile && typeof profile === 'object') {
        const { sanitized, warnings: w } = sanitizeMappingFields(profile, { user: 'student_id', passwd: 'password', label: 'text' });
        Object.assign(profile, sanitized);
        warnings.push(...w);
      }
    }
    if (typeof accounts.current === 'string') {
      const result = sanitizeInputField(accounts.current, { fieldType: 'profile', fieldName: 'accounts.current' });
      accounts.current = result.value || 'default';
      warnings.push(...result.warnings);
    }
  }

  // provider
  const provider = config.provider;
  if (provider && typeof provider === 'object') {
    for (const key of ['current', 'requested']) {
      if (key in provider) {
        const result = sanitizeInputField(provider[key], { fieldType: 'provider', fieldName: `provider.${key}` });
        provider[key] = result.value;
        warnings.push(...result.warnings);
      }
    }
  }

  // local_ui
  const localUi = config.local_ui;
  if (localUi && typeof localUi === 'object') {
    const { sanitized, warnings: w } = sanitizeMappingFields(localUi, { host: 'host', port: 'port' });
    Object.assign(localUi, sanitized);
    warnings.push(...w);
  }

  // integrations
  const integrations = config.integrations;
  if (integrations && typeof integrations === 'object') {
    const adapterFieldTypes = {
      discord: { token_env: 'env_var', channel_env: 'env_var', public_key_env: 'env_var', application_id_env: 'env_var', guild_id_env: 'env_var' },
      line: { token_env: 'env_var', secret_env: 'env_var' },
      telegram: { token_env: 'env_var', chat_env: 'env_var' },
    };
    for (const [adapter, keys] of Object.entries(adapterFieldTypes)) {
      const item = integrations[adapter];
      if (item && typeof item === 'object') {
        const { sanitized, warnings: w } = sanitizeMappingFields(item, keys);
        Object.assign(item, sanitized);
        warnings.push(...w);
      }
    }
  }

  return warnings;
}

/**
 * @param {*} value
 * @returns {boolean}
 */
function containsSensitiveText(value) {
  const text = String(value || '').toLowerCase();
  return ['password', 'passwd', 'token', 'secret', 'cookie', 'session', 'payload'].some(p => text.includes(p));
}

/**
 * Masked password input for CLI.
 * @param {string} [prompt='輸入密碼 > ']
 * @returns {Promise<string>}
 */
async function maskedPasswordInput(prompt = '輸入密碼 > ') {
  const readline = require('node:readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  return new Promise((resolve) => {
    // Mute output for password masking
    const origWrite = process.stdout.write.bind(process.stdout);
    let muted = false;
    process.stdout.write = function (chunk, encoding, callback) {
      if (muted) {
        // Write asterisk for each character (skip control chars)
        if (typeof chunk === 'string' && chunk.length === 1 && chunk.charCodeAt(0) >= 32) {
          return origWrite('*', encoding, callback);
        }
        return origWrite(chunk, encoding, callback);
      }
      return origWrite(chunk, encoding, callback);
    };

    rl.question(prompt, (answer) => {
      muted = false;
      process.stdout.write = origWrite;
      rl.close();
      resolve(String(answer || '').trim());
    });
    muted = true;
  });
}

module.exports = {
  InputSanitizationResult,
  sanitizeInputField,
  sanitizeMappingFields,
  sanitizeConfigValues,
  containsSensitiveText,
  maskedPasswordInput,
  SENSITIVE_FIELD_TYPES,
  QR_FIELD_TYPES,
};
