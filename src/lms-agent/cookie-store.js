'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createSafeLogger } = require('../utils/logger');

/**
 * Manages HTTP Cookies for the CampusNetworkAgent.
 */
class SessionCookieStore {
  /**
   * @param {Object} options 
   * @param {string} options.sessionFile - Path to save/load cookies (e.g. session.json)
   * @param {Object} options.logger - Injected logger
   */
  constructor(options = {}) {
    this.sessionFile = options.sessionFile || path.join(process.cwd(), 'session.json');
    this.logger = createSafeLogger(options.logger);
    this.cookies = new Map();
  }

  /**
   * Extract and store cookies from a Set-Cookie header array.
   * @param {string[]} setCookieHeaders 
   */
  ingest(setCookieHeaders) {
    if (!setCookieHeaders || setCookieHeaders.length === 0) return;

    for (const header of setCookieHeaders) {
      // Parse the primary Key=Value before the first semicolon
      const primaryPair = header.split(';')[0];
      const equalIndex = primaryPair.indexOf('=');
      
      if (equalIndex > 0) {
        const key = primaryPair.substring(0, equalIndex).trim();
        const val = primaryPair.substring(equalIndex + 1).trim();
        this.cookies.set(key, val);
      }
    }
  }

  /**
   * Generates the Cookie header string for outgoing requests.
   * @returns {string}
   */
  toHeaderString() {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  /**
   * Serializes cookies to disk.
   */
  saveToDisk() {
    try {
      const obj = Object.fromEntries(this.cookies);
      fs.mkdirSync(path.dirname(this.sessionFile), { recursive: true });
      fs.writeFileSync(this.sessionFile, JSON.stringify(obj, null, 2), 'utf8');
      this.logger.debug(`Session saved to ${this.sessionFile}`);
    } catch (err) {
      this.logger.warn(`Failed to save session cookies: ${err.message}`);
    }
  }

  /**
   * Deserializes cookies from disk.
   */
  loadFromDisk() {
    try {
      if (fs.existsSync(this.sessionFile)) {
        const data = fs.readFileSync(this.sessionFile, 'utf8');
        const obj = JSON.parse(data);
        for (const [k, v] of Object.entries(obj)) {
          this.cookies.set(k, v);
        }
        this.logger.debug(`Session restored from ${this.sessionFile}`);
        return true;
      }
    } catch (err) {
      this.logger.warn(`Failed to load session cookies: ${err.message}`);
    }
    return false;
  }
}

module.exports = {
  SessionCookieStore
};
