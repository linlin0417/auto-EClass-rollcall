'use strict';

// ---------------------------------------------------------------------------
// Completed-rollcall tracker.
//
// In the Python version these were three separate module-level dicts:
//   COMPLETED_NUMBER_ROLLCALLS, COMPLETED_RADAR_ROLLCALLS, COMPLETED_QR_ROLLCALLS
//
// This class unifies them behind a single API keyed by attendance type.
// ---------------------------------------------------------------------------

/**
 * Tracks which rollcalls have been completed, keyed by attendance type and
 * rollcall ID.
 *
 * Each entry stores arbitrary data (e.g. the answer result, timestamp, etc.)
 * so callers can inspect what happened without re-querying.
 */
class CompletedRollcallTracker {
  constructor() {
    /**
     * Internal store: type → Map(id → data).
     * @type {Map<string, Map<string, *>>}
     */
    this._store = new Map();
  }

  /**
   * Ensure the sub-map for a given type exists.
   * @param {string} type
   * @returns {Map<string, *>}
   */
  _bucket(type) {
    const key = String(type || '').toLowerCase();
    if (!this._store.has(key)) {
      this._store.set(key, new Map());
    }
    return this._store.get(key);
  }

  /**
   * Check whether a rollcall has already been completed.
   *
   * @param {string} type - Attendance type (e.g. 'number', 'radar', 'qrcode').
   * @param {string|number} id - Rollcall ID.
   * @returns {boolean}
   */
  isCompleted(type, id) {
    const bucket = this._store.get(String(type || '').toLowerCase());
    if (!bucket) return false;
    return bucket.has(String(id));
  }

  /**
   * Mark a rollcall as completed.
   *
   * @param {string} type - Attendance type.
   * @param {string|number} id - Rollcall ID.
   * @param {*} [data=true] - Arbitrary metadata to store alongside.
   */
  markCompleted(type, id, data = true) {
    this._bucket(type).set(String(id), data);
  }

  /**
   * Get all completed rollcalls for a given type.
   *
   * @param {string} type - Attendance type.
   * @returns {Map<string, *>} A *copy* of the internal map for safety.
   */
  getCompleted(type) {
    const bucket = this._store.get(String(type || '').toLowerCase());
    return bucket ? new Map(bucket) : new Map();
  }

  /**
   * Get the stored data for a single completed rollcall, or undefined.
   *
   * @param {string} type
   * @param {string|number} id
   * @returns {*}
   */
  getData(type, id) {
    const bucket = this._store.get(String(type || '').toLowerCase());
    if (!bucket) return undefined;
    return bucket.get(String(id));
  }

  /**
   * Clear tracked rollcalls.
   *
   * @param {string} [type] - If provided, clear only this type.
   *                          If omitted, clear everything.
   */
  clear(type) {
    if (type !== undefined) {
      const key = String(type || '').toLowerCase();
      const bucket = this._store.get(key);
      if (bucket) bucket.clear();
    } else {
      this._store.clear();
    }
  }

  /**
   * Total number of completed rollcalls across all types.
   * @returns {number}
   */
  get size() {
    let total = 0;
    for (const bucket of this._store.values()) {
      total += bucket.size;
    }
    return total;
  }

  /**
   * Return a plain-object snapshot for diagnostics / serialization.
   * @returns {Object<string, Object<string, *>>}
   */
  toJSON() {
    const result = {};
    for (const [type, bucket] of this._store) {
      if (bucket.size > 0) {
        result[type] = Object.fromEntries(bucket);
      }
    }
    return result;
  }
}

module.exports = { CompletedRollcallTracker };
