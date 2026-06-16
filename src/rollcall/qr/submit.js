'use strict';

const { TransientCooldownTracker } = require('../../core/cooldown');

/**
 * @param {import('../../http/client').TronClient} client 
 * @param {import('./parse').QrCodeData} qrData 
 * @param {Object} options 
 */
async function answerQrRollcall(client, qrData, options = {}) {
  const requestRetries = options.requestRetries || 3;
  const cooldownTracker = options.cooldownTracker || new TransientCooldownTracker();
  const sessionId = options.sessionId || '';
  const deviceId = 'bot-device';

  const result = {
    status: 'stopped',
    message: '',
  };

  if (!qrData.rollcallId) {
    result.status = 'fatal';
    result.message = 'QR payload missing rollcallId field.';
    return result;
  }

  const payload = qrData.answerBody(deviceId);

  for (let attempt = 0; attempt < requestRetries; attempt++) {
    try {
      await cooldownTracker.waitCooldown();
      const resp = await client.submitQrAnswer(qrData.rollcallId, payload, sessionId);
      const { status, body } = resp;

      if (status === 200 || status === 201 || status === 204) {
        result.status = 'success';
        result.message = 'QR submitted successfully';
        return result;
      }

      if (status === 401 || status === 403) {
        result.status = 'fatal';
        result.message = 'QR submit unauthorized';
        return result;
      }

      if (status >= 500 || status === 429) {
        cooldownTracker.recordFailure();
        if (attempt === requestRetries - 1) break;
        await new Promise(r => setTimeout(r, 1000));
      } else {
        result.status = 'fatal';
        result.message = `Unexpected status ${status}`;
        return result;
      }
      
    } catch (err) {
      if (attempt === requestRetries - 1) {
        cooldownTracker.recordFailure();
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  result.status = 'transient';
  result.message = 'QR submit failed after retries.';
  return result;
}

module.exports = {
  answerQrRollcall,
};
