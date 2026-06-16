'use strict';

// ---------------------------------------------------------------------------
// AdapterBinding
// ---------------------------------------------------------------------------

class AdapterBinding {
  /**
   * @param {Object} opts
   * @param {string} opts.adapter
   * @param {string} opts.externalUserId
   * @param {string} opts.profile
   * @param {string} [opts.channelId='']
   */
  constructor({ adapter, externalUserId, profile, channelId = '' }) {
    this.adapter = adapter;
    this.externalUserId = externalUserId;
    this.profile = profile;
    this.channelId = channelId;
    Object.freeze(this);
  }

  toDict() {
    return {
      adapter: this.adapter,
      external_user_id: this.externalUserId,
      profile: this.profile,
      channel_id: this.channelId,
    };
  }
}

// ---------------------------------------------------------------------------
// ControlCommand
// ---------------------------------------------------------------------------

class ControlCommand {
  /**
   * @param {Object} opts
   * @param {string} opts.action
   * @param {string} [opts.adapter='local']
   * @param {string} [opts.profile='']
   * @param {Object} [opts.payload={}]
   * @param {string} [opts.sourceUserId='']
   */
  constructor({ action, adapter = 'local', profile = '', payload = {}, sourceUserId = '' }) {
    this.action = action;
    this.adapter = adapter;
    this.profile = profile;
    this.payload = payload;
    this.sourceUserId = sourceUserId;
    Object.freeze(this);
  }
}

// ---------------------------------------------------------------------------
// COMMAND_ALIASES
// ---------------------------------------------------------------------------

const COMMAND_ALIASES = Object.freeze({
  'status': 'status',
  '狀態': 'status',
  'start': 'start',
  '開始': 'start',
  'stop': 'stop',
  '停止': 'stop',
  'refresh': 'refresh-session',
  'refresh-session': 'refresh-session',
  'reauth': 'reauth',
  '重登': 'refresh-session',
  '重認證': 'reauth',
  'force': 'force-check',
  'force-check': 'force-check',
  'check': 'force-check',
  'qr': 'qr-submit',
  'qr-submit': 'qr-submit',
  'accounts': 'account-list',
  'account': 'account-list',
  'account-list': 'account-list',
  'profiles': 'account-list',
  'bind': 'bind',
  'unbind': 'unbind',
});

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Parse raw adapter text into a ControlCommand.
 * @param {string} rawText
 * @param {Object} opts
 * @param {string} opts.adapter
 * @param {string} [opts.sourceUserId='']
 * @param {string} [opts.profile='']
 * @returns {ControlCommand|null}
 */
function mapAdapterCommand(rawText, { adapter, sourceUserId = '', profile = '' }) {
  const parts = String(rawText || '').trim().split(/\s+/);
  if (!parts.length || !parts[0]) return null;
  const action = COMMAND_ALIASES[parts[0].toLowerCase()];
  if (!action) return null;

  const payload = { args: parts.slice(1) };

  if (action === 'qr-submit') {
    const qrArgs = [...parts.slice(1)];
    const fanout = qrArgs.length > 0 && ['all', '--all'].includes(qrArgs[0].toLowerCase());
    if (fanout) qrArgs.shift();
    payload.args = qrArgs;
    payload.fanout = fanout;
    if (qrArgs.length) payload.payload = qrArgs.join(' ');
  } else if (['status', 'start', 'stop', 'force-check', 'reauth', 'refresh-session'].includes(action) && parts.length > 1) {
    payload.profile = parts[1];
  }

  if (['bind', 'unbind'].includes(action) && parts.length > 1) {
    payload.profile = parts[1];
  }

  return new ControlCommand({
    action,
    adapter: String(adapter || 'local'),
    profile: String(profile || payload.profile || ''),
    payload,
    sourceUserId: String(sourceUserId || ''),
  });
}

/**
 * @param {string} adapter
 * @param {string} externalUserId
 * @returns {string}
 */
function bindingKey(adapter, externalUserId) {
  return `${String(adapter || '').trim().toLowerCase()}:${String(externalUserId || '').trim()}`;
}

module.exports = {
  AdapterBinding,
  ControlCommand,
  COMMAND_ALIASES,
  mapAdapterCommand,
  bindingKey,
};
