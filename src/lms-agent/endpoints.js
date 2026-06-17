'use strict';

/**
 * Endpoint definitions for the CampusNetworkAgent.
 * We use functional generators to construct URLs dynamically.
 */

function buildEndpoints(baseUrl) {
  const base = baseUrl.replace(/\/$/, ''); // Remove trailing slash if present
  
  return {
    loginPage: () => `${base}/user/login`,
    dashboard: () => `${base}/user/index`,
    
    // Attendance tasks polling (checks for active rollcalls)
    activeTasks: () => `${base}/api/radar/rollcalls?api_version=1.1.0`,
    
    // Submission endpoints
    submitPin: (id) => `${base}/api/rollcall/${id}/student_rollcalls`,
    submitGeo: (id) => `${base}/api/rollcall/${id}/answer`,
    submitScan: (id) => `${base}/api/rollcall/${id}/answer_qr_rollcall`
  };
}

module.exports = {
  buildEndpoints
};
