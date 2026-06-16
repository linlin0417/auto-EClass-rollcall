'use strict';

// ---------------------------------------------------------------------------
// Rollcall classification and decision engine.
// Translated from PythonVersion/troTHU/rollcall_engine.py
// ---------------------------------------------------------------------------

const {
  AttendanceType,
  RollcallAction,
  RollcallDecision,
} = require('../models/rollcall');

/**
 * @param {*} value
 * @returns {string}
 */
function normalizeText(value) {
  return String(value || '').trim();
}

/**
 * Classify a single rollcall object by its type/flags.
 *
 * @param {Object} rollcall
 * @returns {[string, string, string]} - [status, rollcallType, message]
 */
function classifyRollcall(rollcall) {
  const rollcallTypeValue = normalizeText(
    rollcall.type || rollcall.rollcall_type || rollcall.name,
  ).toLowerCase();

  const qrcodeKeys = [
    'is_qrcode',
    'is_qr_code',
    'is_qr',
    'qrcode',
    'qr_code',
    'qrcode_url',
  ];
  if (
    qrcodeKeys.some((key) => rollcall[key]) ||
    rollcallTypeValue.includes('qr')
  ) {
    return [
      'unsupported_qrcode',
      'qrcode',
      '偵測到 QR Code 點名，請貼上 QR 內容後手動送出。',
    ];
  }

  return ['unsupported_rollcall', 'unknown', '偵測到未支援的點名類型'];
}

/**
 * Decide which rollcall action to take given a list of active rollcalls.
 *
 * @param {*} rollcalls
 * @returns {RollcallDecision}
 */
function decideRollcall(rollcalls) {
  if (!Array.isArray(rollcalls) || rollcalls.length === 0) {
    return new RollcallDecision({
      status: 'not_call',
      action: RollcallAction.NONE,
    });
  }

  let firstSupportedNumber = null;
  let firstSupportedRadar = null;
  /** @type {[string, Object, string, string]|null} */
  let firstQrcode = null;
  /** @type {[string, Object, string, string]|null} */
  let firstUnsupported = null;
  let firstOnCallFine = null;

  for (const rollcall of rollcalls) {
    if (rollcall === null || typeof rollcall !== 'object' || Array.isArray(rollcall)) {
      continue;
    }

    if (rollcall.is_number) {
      firstSupportedNumber = rollcall;
      break;
    }

    if (
      rollcall.is_radar ||
      normalizeText(rollcall.type || rollcall.rollcall_type || rollcall.name)
        .toLowerCase()
        .includes('radar')
    ) {
      firstSupportedRadar = rollcall;
      break;
    }

    if (rollcall.status === 'on_call_fine') {
      if (firstOnCallFine === null) {
        firstOnCallFine = rollcall;
      }
      continue;
    }

    const [status, rollcallType, message] = classifyRollcall(rollcall);
    if (status === 'unsupported_qrcode' && firstQrcode === null) {
      firstQrcode = [status, rollcall, rollcallType, message];
    } else if (firstUnsupported === null) {
      firstUnsupported = [status, rollcall, rollcallType, message];
    }
  }

  if (firstSupportedNumber !== null) {
    return new RollcallDecision({
      status: 'is_number',
      action: RollcallAction.ANSWER_NUMBER,
      attendanceType: AttendanceType.NUMBER,
      rollcall: firstSupportedNumber,
    });
  }

  if (firstSupportedRadar !== null) {
    return new RollcallDecision({
      status: 'is_radar',
      action: RollcallAction.ANSWER_RADAR,
      attendanceType: AttendanceType.RADAR,
      rollcall: firstSupportedRadar,
    });
  }

  if (firstQrcode !== null) {
    const [status, rollcall, , message] = firstQrcode;
    return new RollcallDecision({
      status,
      action: RollcallAction.REQUEST_QR_PAYLOAD,
      attendanceType: AttendanceType.QRCODE,
      rollcall,
      message,
    });
  }

  if (firstUnsupported !== null) {
    const [status, rollcall, rollcallType, message] = firstUnsupported;
    // Check if rollcallType is a valid AttendanceType value
    const validValues = Object.values(AttendanceType);
    const attendanceType = validValues.includes(rollcallType)
      ? rollcallType
      : AttendanceType.UNKNOWN;
    return new RollcallDecision({
      status,
      action: RollcallAction.REPORT_UNSUPPORTED,
      attendanceType,
      rollcall,
      message,
    });
  }

  if (firstOnCallFine !== null) {
    return new RollcallDecision({
      status: 'on_call_fine',
      action: RollcallAction.NONE,
      rollcall: firstOnCallFine,
    });
  }

  return new RollcallDecision({
    status: 'not_call',
    action: RollcallAction.NONE,
  });
}

/**
 * Convenience wrapper around decideRollcall that returns a flat tuple.
 *
 * @param {*} rollcalls
 * @returns {[string, Object|null, string, string]} - [status, rollcall, rollcallType, message]
 */
function selectRollcall(rollcalls) {
  const decision = decideRollcall(rollcalls);
  const rollcallType =
    decision.attendanceType === AttendanceType.NONE
      ? ''
      : decision.attendanceType;
  return [decision.status, decision.rollcall, rollcallType, decision.message];
}

module.exports = {
  classifyRollcall,
  decideRollcall,
  selectRollcall,
};
