'use strict';

const { coercePositiveFloat, coercePositiveInt } = require('./helpers');

// ---------------------------------------------------------------------------
// TransientCooldownPolicy
// ---------------------------------------------------------------------------

class TransientCooldownPolicy {
  /**
   * @param {Object} opts
   * @param {number} opts.cooldownSeconds
   * @param {number} opts.maxCooldowns
   * @param {number} opts.transientFailureThreshold
   * @param {number} opts.transientFailureRatio
   */
  constructor({ cooldownSeconds, maxCooldowns, transientFailureThreshold, transientFailureRatio }) {
    this.cooldownSeconds = cooldownSeconds;
    this.maxCooldowns = maxCooldowns;
    this.transientFailureThreshold = transientFailureThreshold;
    this.transientFailureRatio = transientFailureRatio;
    Object.freeze(this);
  }

  /**
   * @param {Object} config
   * @param {Object} defaults
   * @returns {TransientCooldownPolicy}
   */
  static fromMapping(config, {
    defaultCooldownSeconds,
    defaultMaxCooldowns,
    defaultTransientFailureThreshold,
    defaultTransientFailureRatio,
  }) {
    const mapping = (config && typeof config === 'object') ? config : {};
    const threshold = coercePositiveInt(
      mapping.transient_failure_threshold ?? defaultTransientFailureThreshold,
      defaultTransientFailureThreshold,
      1
    );
    const maxCooldowns = coercePositiveInt(
      mapping.max_cooldowns ?? defaultMaxCooldowns,
      defaultMaxCooldowns,
      0
    );
    let ratio;
    try {
      ratio = Number(mapping.transient_failure_ratio ?? defaultTransientFailureRatio);
    } catch {
      ratio = defaultTransientFailureRatio;
    }
    if (Number.isNaN(ratio)) ratio = defaultTransientFailureRatio;

    return new TransientCooldownPolicy({
      cooldownSeconds: coercePositiveFloat(
        mapping.cooldown_seconds ?? defaultCooldownSeconds,
        defaultCooldownSeconds,
        0.1
      ),
      maxCooldowns,
      transientFailureThreshold: threshold,
      transientFailureRatio: Math.max(0.0, Math.min(1.0, ratio)),
    });
  }
}

// ---------------------------------------------------------------------------
// TransientCooldownDecision
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} TransientCooldownDecision
 * @property {boolean} shouldCooldown
 * @property {boolean} exhausted
 * @property {number} transientCount
 * @property {number} sampleSize
 * @property {number} transientRatio
 * @property {number} cooldownsUsed
 */

// ---------------------------------------------------------------------------
// TransientCooldownTracker
// ---------------------------------------------------------------------------

/**
 * Shared burst-cooldown state for rollcall answer submission loops.
 */
class TransientCooldownTracker {
  /** @param {TransientCooldownPolicy} policy */
  constructor(policy) {
    this.policy = policy;
    this.cooldownsUsed = 0;
    /** @type {boolean[]} */
    this._window = [];
  }

  reset() {
    this._window = [];
  }

  /**
   * @param {boolean} transient
   * @returns {TransientCooldownDecision}
   */
  recordAttempt(transient) {
    if (!transient) {
      this.reset();
      return this._decision(false, 0, 0, 0.0);
    }
    this._window.push(true);
    const threshold = this.policy.transientFailureThreshold;
    if (this._window.length > threshold) {
      this._window = this._window.slice(-threshold);
    }
    const transientCount = this._window.filter(Boolean).length;
    const sampleSize = this._window.length;
    const transientRatio = transientCount / Math.max(sampleSize, 1);
    const shouldCooldown = this._shouldCooldown(transientCount, sampleSize, transientRatio);
    return this._decision(shouldCooldown, transientCount, sampleSize, transientRatio);
  }

  /**
   * @param {number} transientCount
   * @param {number} sampleSize
   * @returns {TransientCooldownDecision}
   */
  recordBatch(transientCount, sampleSize) {
    transientCount = Math.max(0, Math.floor(transientCount));
    sampleSize = Math.max(0, Math.floor(sampleSize));
    if (sampleSize <= 0 || transientCount <= 0) {
      this.reset();
      return this._decision(false, 0, sampleSize, 0.0);
    }
    transientCount = Math.min(transientCount, sampleSize);
    const transientRatio = transientCount / Math.max(sampleSize, 1);
    const shouldCooldown = this._shouldCooldown(transientCount, sampleSize, transientRatio);
    return this._decision(shouldCooldown, transientCount, sampleSize, transientRatio);
  }

  /** @private */
  _shouldCooldown(transientCount, sampleSize, transientRatio) {
    const threshold = this.policy.transientFailureThreshold;
    return transientCount >= threshold || (
      sampleSize >= threshold && transientRatio >= this.policy.transientFailureRatio
    );
  }

  /** @private */
  _decision(shouldCooldown, transientCount, sampleSize, transientRatio) {
    let exhausted = false;
    if (shouldCooldown) {
      this.cooldownsUsed++;
      exhausted = this.cooldownsUsed > this.policy.maxCooldowns;
      this.reset();
    }
    return Object.freeze({
      shouldCooldown,
      exhausted,
      transientCount,
      sampleSize,
      transientRatio,
      cooldownsUsed: this.cooldownsUsed,
    });
  }
}

module.exports = {
  TransientCooldownPolicy,
  TransientCooldownTracker,
};
