'use strict';

const { getActiveProfile } = require('./account-store');
const { loadSessionCookies, saveSessionCookies, clearSessionCookies } = require('./session-manager');
const { TronHttpError } = require('../http/errors');

/**
 * Perform a full login or restore session.
 * 
 * @param {import('../http/client').TronClient} client 
 * @param {Object} config The global configuration object
 * @param {string} baseDir Project base directory
 * @returns {Promise<boolean>} True if login was successful or restored
 */
async function ensureLogin(client, config, baseDir) {
  const profile = getActiveProfile(config);
  
  if (loadSessionCookies(client, baseDir, profile.name)) {
    // Try to fetch user ID to validate session
    const userId = await client.fetchUserId();
    if (userId) {
      return true; // Session valid
    }
    // Session invalid, clear it
    clearSessionCookies(client, baseDir, profile.name);
  }

  if (!profile.user || !profile.passwd) {
    throw new Error('Missing credentials. Please configure an account.');
  }

  // Attempt login
  try {
    const form = await client.fetchLoginForm();
    const outcome = await client.submitLogin(form, profile.user, profile.passwd);
    
    if (outcome.hasSession) {
      saveSessionCookies(client, baseDir, profile.name);
      return true;
    }
  } catch (err) {
    if (err instanceof TronHttpError) {
      throw err;
    }
    throw new Error(`Login failed unexpectedly: ${err.message}`);
  }

  return false;
}

module.exports = {
  ensureLogin,
};
