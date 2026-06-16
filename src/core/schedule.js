'use strict';

const { normalizeText, formatTimeValue, parseTimeValue, coerceBool } = require('./helpers');

const DEFAULT_OPERATING_RANGE = ['00:00', '00:00'];
const TIME_RANGE_RE = /\b\d{1,2}[:：]\d{2}\b/g;

// ---------------------------------------------------------------------------
// Schedule Range Normalization
// ---------------------------------------------------------------------------

/**
 * @param {*} startValue
 * @param {*} endValue
 * @returns {string[]|null}
 */
function _timePairFromValues(startValue, endValue) {
  const start = formatTimeValue(startValue);
  const end = formatTimeValue(endValue);
  if (start == null || end == null) return null;
  return [start, end];
}

/**
 * @param {*} value
 * @returns {string[]|null}
 */
function _normalizeOneScheduleRange(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return _timePairFromValues(
      value.start ?? value.from ?? value.begin,
      value.end ?? value.to ?? value.until
    );
  }
  if (Array.isArray(value) && value.length === 2) {
    return _timePairFromValues(value[0], value[1]);
  }
  const text = normalizeText(value);
  const matches = text.match(TIME_RANGE_RE);
  if (matches && matches.length >= 2) {
    return _timePairFromValues(matches[0], matches[1]);
  }
  return null;
}

/**
 * Normalize schedule range values into an array of [start, end] time pairs.
 * @param {*} value
 * @param {string[][]|null} [defaults]
 * @returns {string[][]}
 */
function normalizeScheduleRanges(value, defaults) {
  const fallback = (defaults || [DEFAULT_OPERATING_RANGE]).map(item => [...item]);
  const ranges = [];

  if (value && typeof value === 'object' && !Array.isArray(value) && Array.isArray(value.ranges)) {
    value = value.ranges;
  }

  if (Array.isArray(value)) {
    if (value.length === 2 && _normalizeOneScheduleRange(value) != null) {
      ranges.push(_normalizeOneScheduleRange(value) || [...DEFAULT_OPERATING_RANGE]);
    } else {
      const pendingPlainTimes = [];
      for (const item of value) {
        const parsed = _normalizeOneScheduleRange(item);
        if (parsed != null) { ranges.push(parsed); continue; }
        const plainTime = formatTimeValue(item);
        if (plainTime != null) {
          pendingPlainTimes.push(plainTime);
          if (pendingPlainTimes.length === 2) {
            ranges.push([pendingPlainTimes[0], pendingPlainTimes[1]]);
            pendingPlainTimes.length = 0;
          }
          continue;
        }
        const text = normalizeText(item);
        const matches = text.match(TIME_RANGE_RE);
        if (matches && matches.length >= 2) {
          for (let i = 0; i < matches.length - 1; i += 2) {
            ranges.push([formatTimeValue(matches[i]) || '00:00', formatTimeValue(matches[i + 1]) || '00:00']);
          }
        }
      }
    }
  } else {
    const text = normalizeText(value);
    const matches = text.match(TIME_RANGE_RE);
    if (matches && matches.length >= 2) {
      for (let i = 0; i < matches.length - 1; i += 2) {
        const parsed = _timePairFromValues(matches[i], matches[i + 1]);
        if (parsed) ranges.push(parsed);
      }
    } else {
      const parsed = _normalizeOneScheduleRange(value);
      if (parsed) ranges.push(parsed);
    }
  }

  return ranges.length ? ranges : fallback;
}

/**
 * @param {*} value
 * @param {string[]|null} [defaultRange]
 * @returns {string[]}
 */
function normalizeScheduleRange(value, defaultRange) {
  return normalizeScheduleRanges(value, [defaultRange || DEFAULT_OPERATING_RANGE])[0];
}

// ---------------------------------------------------------------------------
// Time Comparison
// ---------------------------------------------------------------------------

/**
 * Parse a time pair into { start: {h,m}, end: {h,m} }.
 * @param {*} rangeStr
 * @returns {{ start: { hours: number, minutes: number }, end: { hours: number, minutes: number } }}
 */
function parseScheduleRange(rangeStr) {
  const fallback = normalizeScheduleRange(rangeStr);
  return {
    start: parseTimeValue(fallback[0]) || { hours: 0, minutes: 0 },
    end: parseTimeValue(fallback[1]) || { hours: 0, minutes: 0 },
  };
}

/**
 * @param {*} rangeValue
 * @returns {Array<{ start: { hours: number, minutes: number }, end: { hours: number, minutes: number } }>}
 */
function parseScheduleRanges(rangeValue) {
  return normalizeScheduleRanges(rangeValue).map(item => ({
    start: parseTimeValue(item[0]) || { hours: 0, minutes: 0 },
    end: parseTimeValue(item[1]) || { hours: 0, minutes: 0 },
  }));
}

/**
 * Compare two time objects { hours, minutes }.
 * @returns {number} negative if a < b, 0 if equal, positive if a > b
 */
function _compareTime(a, b) {
  if (a.hours !== b.hours) return a.hours - b.hours;
  return a.minutes - b.minutes;
}

/**
 * @param {{ hours: number, minutes: number }} start
 * @param {{ hours: number, minutes: number }} end
 * @param {{ hours: number, minutes: number }} currentTime
 * @returns {boolean}
 */
function isWithinSchedule(start, end, currentTime) {
  // Matching start/end means "always on"; start > end supports overnight ranges.
  if (_compareTime(start, end) === 0) return true;
  if (_compareTime(start, end) < 0) {
    return _compareTime(currentTime, start) >= 0 && _compareTime(currentTime, end) <= 0;
  }
  return _compareTime(currentTime, start) >= 0 || _compareTime(currentTime, end) <= 0;
}

/**
 * @param {*} ranges
 * @param {{ hours: number, minutes: number }} currentTime
 * @returns {boolean}
 */
function isWithinAnySchedule(ranges, currentTime) {
  return parseScheduleRanges(ranges).some(({ start, end }) => isWithinSchedule(start, end, currentTime));
}

// ---------------------------------------------------------------------------
// Schedule Transition Prediction
// ---------------------------------------------------------------------------

/**
 * Find the next moment the monitoring/standby state flips.
 * @param {Date} now
 * @param {function(Date): boolean} activeAt
 * @param {Object} [opts]
 * @param {number} [opts.horizonDays=7]
 * @param {number} [opts.stepSeconds=60]
 * @returns {{ moment: Date, newState: boolean }|null}
 */
function predictScheduleChange(now, activeAt, { horizonDays = 7, stepSeconds = 60 } = {}) {
  try {
    const currentState = Boolean(activeAt(now));
    const stepMs = Math.max(1, Math.floor(stepSeconds)) * 1000;
    let moment = new Date(now);
    moment.setSeconds(0, 0);
    moment = new Date(moment.getTime() + stepMs);
    const horizonEnd = new Date(now.getTime() + Math.max(1, Math.floor(horizonDays)) * 86400000);

    while (moment <= horizonEnd) {
      if (Boolean(activeAt(moment)) !== currentState) {
        // Refine to second precision
        let probe = new Date(moment.getTime() - stepMs + 1000);
        while (probe <= moment) {
          if (Boolean(activeAt(probe)) !== currentState) {
            probe.setMilliseconds(0);
            return { moment: probe, newState: !currentState };
          }
          probe = new Date(probe.getTime() + 1000);
        }
        return { moment, newState: !currentState };
      }
      moment = new Date(moment.getTime() + stepMs);
    }
  } catch {
    return null;
  }
  return null;
}

module.exports = {
  DEFAULT_OPERATING_RANGE,
  normalizeScheduleRange,
  normalizeScheduleRanges,
  parseScheduleRange,
  parseScheduleRanges,
  isWithinSchedule,
  isWithinAnySchedule,
  predictScheduleChange,
};
