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
    activeTasks: () => `${base}/api/student_rollcalls?_=${Date.now()}`,
    
    // Submission endpoints
    submitPin: (id) => `${base}/api/student_rollcalls/${id}?_=${Date.now()}`,
    submitGeo: (id) => `${base}/api/student_rollcalls/${id}/radar_answer`,
    submitScan: (id) => `${base}/api/student_rollcalls/${id}/qr_answer`
  };
}

module.exports = {
  buildEndpoints
};
