'use strict';

const { selectRollcall } = require('./engine');
const { answerNumberRollcall } = require('./number/submit');
const { answerRadarRollcall } = require('./radar/submit');
const { answerQrRollcall } = require('./qr/submit');
const { TransientCooldownTracker } = require('../core/cooldown');

class RollcallMonitor {
  /**
   * @param {import('../http/client').TronClient} client 
   * @param {Object} options 
   */
  constructor(client, options = {}) {
    this.client = client;
    this.pollInterval = options.pollInterval || 15000;
    this.cooldownTracker = new TransientCooldownTracker();
    this.stopFlag = false;
    this.activeRollcallId = null;
    this.onProgress = options.onProgress || (() => {});
  }

  stop() {
    this.stopFlag = true;
  }

  async run() {
    this.stopFlag = false;

    while (!this.stopFlag) {
      try {
        await this.cooldownTracker.waitCooldown();
        
        const result = await this.client.fetchRollcalls();
        const rollcalls = result.payload?.rollcalls || [];
        
        const [status, rollcall, rollcallType, message] = selectRollcall(rollcalls);
        this.onProgress({ type: 'poll', status, rollcallId: rollcall?.id, rollcallType, message, raw: rollcalls });

        if (status === 'is_number') {
          this.activeRollcallId = rollcall.id;
          this.onProgress({ type: 'submit_start', rollcallType: 'number', rollcallId: rollcall.id });
          const answerResult = await answerNumberRollcall(this.client, rollcall.id, { cooldownTracker: this.cooldownTracker });
          this.onProgress({ type: 'submit_result', rollcallType: 'number', result: answerResult });
          
          if (answerResult.status === 'success') {
            this.cooldownTracker.reset(); // Reset cooldowns on success
          }
        } 
        else if (status === 'is_radar') {
          this.activeRollcallId = rollcall.id;
          this.onProgress({ type: 'submit_start', rollcallType: 'radar', rollcallId: rollcall.id });
          const answerResult = await answerRadarRollcall(this.client, rollcall.id, { cooldownTracker: this.cooldownTracker });
          this.onProgress({ type: 'submit_result', rollcallType: 'radar', result: answerResult });
          
          if (answerResult.status === 'success') {
            this.cooldownTracker.reset();
          }
        }
        else if (status === 'unsupported_qrcode') {
           // Wait for QR code payload to be provided externally (e.g., via CLI)
           this.onProgress({ type: 'waiting_qr', rollcallId: rollcall.id, message });
        }
        else if (status === 'on_call_fine') {
          this.onProgress({ type: 'idle', message: 'Currently on_call_fine. Idling.' });
        }
        
      } catch (err) {
        if (err.name === 'UnauthorizedError') {
          this.onProgress({ type: 'fatal', error: err });
          break; // Stop on unauthorized
        } else {
          this.onProgress({ type: 'error', error: err });
          this.cooldownTracker.recordFailure();
        }
      }

      if (!this.stopFlag) {
        await new Promise(r => setTimeout(r, this.pollInterval));
      }
    }
  }
}

module.exports = {
  RollcallMonitor,
};
