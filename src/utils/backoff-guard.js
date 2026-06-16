'use strict';

/**
 * Ensures that rapid successive requests are throttled, preventing server bans.
 * Clean room implementation of what used to be TransientCooldownTracker.
 */
class BackoffGuard {
  constructor(maxRetries = 15, cooldownMs = 3000) {
    this.maxRetries = maxRetries;
    this.cooldownMs = cooldownMs;
    this.attempts = 0;
  }

  /**
   * Registers a failure and returns whether we should keep trying.
   */
  recordFailure() {
    this.attempts++;
    return this.attempts < this.maxRetries;
  }

  /**
   * Resets the failure counter on a successful or non-transient response.
   */
  reset() {
    this.attempts = 0;
  }

  /**
   * Awaits the defined cooldown period.
   */
  async wait() {
    return new Promise(resolve => setTimeout(resolve, this.cooldownMs));
  }
}

module.exports = {
  BackoffGuard
};
