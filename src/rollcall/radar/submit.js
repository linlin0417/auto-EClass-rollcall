'use strict';

const { TransientCooldownTracker } = require('../../core/cooldown');
const { buildProbePlan } = require('../../geo/solver');
const { parseRadarLitePayload, buildRadarAttemptDiagnostic } = require('./classify');

/**
 * @param {import('../../http/client').TronClient} client 
 * @param {string|number} rollcallId 
 * @param {Object} options 
 */
async function answerRadarRollcall(client, rollcallId, options = {}) {
  const requestRetries = options.requestRetries || 3;
  const cooldownTracker = options.cooldownTracker || new TransientCooldownTracker();
  let stopFlag = false;

  const result = {
    status: 'stopped',
    message: '',
  };

  // Build grid generator (simplified logic mapping to Python's runner)
  // Usually the fallback grid or probe plan is used. For this simple Node runner, 
  // we will execute a local probe plan first.
  const plan = buildProbePlan();
  const gridCandidates = plan.gridCandidates;
  const deviceId = 'bot-device';

  for (const candidate of gridCandidates) {
    if (stopFlag) break;

    const payload = {
      deviceId,
      latitude: candidate.point.lat,
      longitude: candidate.point.lon,
      accuracy: 60,
      speed: null,
      heading: null,
      altitude: 0,
      altitudeAccuracy: null,
    };

    for (let attempt = 0; attempt < requestRetries; attempt++) {
      if (stopFlag) break;

      try {
        await cooldownTracker.waitCooldown();
        const resp = await client.submitRollcallAnswer(rollcallId, payload);
        const { status, body } = resp;

        // Determine if it was successful based on body and status
        const isSuccess = body && (body.success || body.is_success || body.ok);
        const hasDistance = body && typeof body.distance === 'number';

        if (isSuccess || status === 200 || status === 201) {
          stopFlag = true;
          result.status = 'success';
          result.message = 'Radar submitted successfully';
          return result;
        }

        if (status === 401 || status === 403) {
          if (!stopFlag) {
            stopFlag = true;
            result.status = 'fatal';
            result.message = 'Radar submit unauthorized';
          }
          break;
        }

        if (hasDistance && typeof body.distance === 'number') {
           // We got a distance hint back, meaning wrong coordinates but server replied nicely.
           // The real python runner would use these observations to run global solver.
           // For this simplified runner we just continue brute forcing the grid.
           break; // Break the retry loop and go to next candidate
        }

        if (status >= 500 || status === 429) {
          cooldownTracker.recordFailure();
          if (attempt === requestRetries - 1) break;
          await new Promise(r => setTimeout(r, 1000));
        } else {
           break; // Other error, maybe bad request. Move to next candidate.
        }
        
      } catch (err) {
        if (attempt === requestRetries - 1) {
          cooldownTracker.recordFailure();
        } else {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  }

  if (result.status === 'stopped' && !stopFlag) {
    result.status = 'transient';
    result.message = 'Radar grid exhausted.';
  }

  return result;
}

module.exports = {
  answerRadarRollcall,
};
