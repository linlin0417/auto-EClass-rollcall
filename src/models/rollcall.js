'use strict';

// ---------------------------------------------------------------------------
// Enums – translated from Python str-Enums as frozen constant objects
// ---------------------------------------------------------------------------

/**
 * @typedef {'none'|'number'|'radar'|'qrcode'|'unknown'} AttendanceTypeValue
 */
const AttendanceType = Object.freeze({
  NONE: 'none',
  NUMBER: 'number',
  RADAR: 'radar',
  QRCODE: 'qrcode',
  UNKNOWN: 'unknown',
});

/**
 * @typedef {'none'|'answer_number'|'answer_radar'|'request_qr_payload'|'skip_completed'|'report_unsupported'} RollcallActionValue
 */
const RollcallAction = Object.freeze({
  NONE: 'none',
  ANSWER_NUMBER: 'answer_number',
  ANSWER_RADAR: 'answer_radar',
  REQUEST_QR_PAYLOAD: 'request_qr_payload',
  SKIP_COMPLETED: 'skip_completed',
  REPORT_UNSUPPORTED: 'report_unsupported',
});

/**
 * @typedef {'rollcall_detected'|'rollcall_answered'|'rollcall_failed'|'qr_payload_requested'|'session_expired'|'status'} NotificationEventTypeValue
 */
const NotificationEventType = Object.freeze({
  ROLLCALL_DETECTED: 'rollcall_detected',
  ROLLCALL_ANSWERED: 'rollcall_answered',
  ROLLCALL_FAILED: 'rollcall_failed',
  QR_PAYLOAD_REQUESTED: 'qr_payload_requested',
  SESSION_EXPIRED: 'session_expired',
  STATUS: 'status',
});

/**
 * @typedef {'status'|'start'|'stop'|'force'|'reauth'|'qr-submit'} AdapterCommandActionValue
 */
const AdapterCommandAction = Object.freeze({
  STATUS: 'status',
  START: 'start',
  STOP: 'stop',
  FORCE: 'force',
  REAUTH: 'reauth',
  QR_SUBMIT: 'qr-submit',
});

// ---------------------------------------------------------------------------
// Data classes – translated from Python frozen dataclasses as JS classes
// ---------------------------------------------------------------------------

/**
 * Immutable decision produced by the rollcall engine.
 */
class RollcallDecision {
  /**
   * @param {object} params
   * @param {string} params.status
   * @param {RollcallActionValue} params.action
   * @param {AttendanceTypeValue} [params.attendanceType]
   * @param {Object<string,*>|null} [params.rollcall]
   * @param {string} [params.message]
   */
  constructor({ status, action, attendanceType = AttendanceType.NONE, rollcall = null, message = '' }) {
    /** @type {string} */
    this.status = status;
    /** @type {RollcallActionValue} */
    this.action = action;
    /** @type {AttendanceTypeValue} */
    this.attendanceType = attendanceType;
    /** @type {Object<string,*>|null} */
    this.rollcall = rollcall;
    /** @type {string} */
    this.message = message;
    Object.freeze(this);
  }

  /** @returns {*} */
  get rollcallId() {
    if (!this.rollcall) return null;
    return this.rollcall.rollcall_id ?? null;
  }
}

/**
 * Outcome of a single rollcall answer attempt.
 */
class RollcallOutcome {
  /**
   * @param {object} params
   * @param {string} params.status
   * @param {AttendanceTypeValue} [params.attendanceType]
   * @param {*} [params.rollcallId]
   * @param {boolean} [params.success]
   * @param {string} [params.message]
   * @param {Object<string,*>} [params.data]
   */
  constructor({
    status,
    attendanceType = AttendanceType.UNKNOWN,
    rollcallId = null,
    success = false,
    message = '',
    data = {},
  }) {
    /** @type {string} */
    this.status = status;
    /** @type {AttendanceTypeValue} */
    this.attendanceType = attendanceType;
    /** @type {*} */
    this.rollcallId = rollcallId;
    /** @type {boolean} */
    this.success = success;
    /** @type {string} */
    this.message = message;
    /** @type {Object<string,*>} */
    this.data = data;
    Object.freeze(this);
  }
}

/**
 * A notification event to be dispatched to adapters.
 */
class NotificationEvent {
  /**
   * @param {object} params
   * @param {string} params.event
   * @param {string} params.title
   * @param {string} params.body
   * @param {AttendanceTypeValue} [params.attendanceType]
   * @param {*} [params.rollcallId]
   * @param {Object<string,*>} [params.data]
   */
  constructor({
    event,
    title,
    body,
    attendanceType = AttendanceType.UNKNOWN,
    rollcallId = null,
    data = {},
  }) {
    /** @type {string} */
    this.event = event;
    /** @type {string} */
    this.title = title;
    /** @type {string} */
    this.body = body;
    /** @type {AttendanceTypeValue} */
    this.attendanceType = attendanceType;
    /** @type {*} */
    this.rollcallId = rollcallId;
    /** @type {Object<string,*>} */
    this.data = data;
    Object.freeze(this);
  }

  /**
   * Render the notification into a human-readable multi-line string.
   * @returns {string}
   */
  render() {
    const parts = [this.title.trim()];
    if (this.rollcallId !== null && this.rollcallId !== '') {
      parts.push(`rollcall_id: ${this.rollcallId}`);
    }
    const bodyTrimmed = this.body.trim();
    if (bodyTrimmed) {
      parts.push(bodyTrimmed);
    }
    return parts.join('\n');
  }
}

/**
 * Target descriptor for an adapter (e.g. Discord channel, Telegram chat).
 */
class AdapterTarget {
  /**
   * @param {object} params
   * @param {string} params.adapter
   * @param {string} params.targetId
   * @param {string} [params.profile]
   * @param {string} [params.channelId]
   */
  constructor({ adapter, targetId, profile = '', channelId = '' }) {
    /** @type {string} */
    this.adapter = adapter;
    /** @type {string} */
    this.targetId = targetId;
    /** @type {string} */
    this.profile = profile;
    /** @type {string} */
    this.channelId = channelId;
    Object.freeze(this);
  }

  /**
   * Build a unique key string for this target.
   * @returns {string}
   */
  key() {
    const parts = [this.adapter, this.targetId, this.profile, this.channelId];
    return parts.map((part) => String(part || '').trim()).join(':');
  }
}

/**
 * A command received from an adapter (e.g. a user typing "start").
 */
class AdapterCommand {
  /**
   * @param {object} params
   * @param {AdapterCommandActionValue} params.action
   * @param {AdapterTarget} params.target
   * @param {Object<string,*>} [params.payload]
   * @param {string} [params.rawText]
   */
  constructor({ action, target, payload = {}, rawText = '' }) {
    /** @type {AdapterCommandActionValue} */
    this.action = action;
    /** @type {AdapterTarget} */
    this.target = target;
    /** @type {Object<string,*>} */
    this.payload = payload;
    /** @type {string} */
    this.rawText = rawText;
    Object.freeze(this);
  }
}

/**
 * An outbound event ready to be dispatched to a specific adapter target.
 */
class OutboundEvent {
  /**
   * @param {object} params
   * @param {NotificationEventTypeValue} params.eventType
   * @param {AdapterTarget|null} params.target
   * @param {string} params.title
   * @param {string} [params.body]
   * @param {*} [params.rollcallId]
   * @param {AttendanceTypeValue} [params.attendanceType]
   * @param {Object<string,*>} [params.data]
   */
  constructor({
    eventType,
    target,
    title,
    body = '',
    rollcallId = null,
    attendanceType = AttendanceType.UNKNOWN,
    data = {},
  }) {
    /** @type {NotificationEventTypeValue} */
    this.eventType = eventType;
    /** @type {AdapterTarget|null} */
    this.target = target;
    /** @type {string} */
    this.title = title;
    /** @type {string} */
    this.body = body;
    /** @type {*} */
    this.rollcallId = rollcallId;
    /** @type {AttendanceTypeValue} */
    this.attendanceType = attendanceType;
    /** @type {Object<string,*>} */
    this.data = data;
    Object.freeze(this);
  }

  /**
   * Convert to a NotificationEvent (drops target info).
   * @returns {NotificationEvent}
   */
  toNotification() {
    return new NotificationEvent({
      event: this.eventType,
      title: this.title,
      body: this.body,
      attendanceType: this.attendanceType,
      rollcallId: this.rollcallId,
      data: this.data,
    });
  }
}

/**
 * Summary of a batch of rollcall outcomes.
 */
class RollcallBatchSummary {
  /**
   * @param {RollcallOutcome[]} [outcomes]
   */
  constructor(outcomes = []) {
    /** @type {RollcallOutcome[]} */
    this.outcomes = Object.freeze([...outcomes]);
    Object.freeze(this);
  }

  /**
   * Build a summary from any iterable of RollcallOutcome.
   * @param {Iterable<RollcallOutcome>} outcomes
   * @returns {RollcallBatchSummary}
   */
  static fromIterable(outcomes) {
    return new RollcallBatchSummary([...outcomes]);
  }

  /** @returns {number} */
  get total() {
    return this.outcomes.length;
  }

  /** @returns {number} */
  get successes() {
    return this.outcomes.filter((o) => o.success).length;
  }

  /** @returns {number} */
  get failures() {
    return this.outcomes.filter((o) => !o.success).length;
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  // Enums
  AttendanceType,
  RollcallAction,
  NotificationEventType,
  AdapterCommandAction,
  // Classes
  RollcallDecision,
  RollcallOutcome,
  NotificationEvent,
  AdapterTarget,
  AdapterCommand,
  OutboundEvent,
  RollcallBatchSummary,
};
