'use strict';

const { createSafeLogger } = require('../utils/logger');
const { buildEndpoints } = require('./endpoints');
const { SessionCookieStore } = require('./cookie-store');
const { AuthenticationParser } = require('./auth-parser');

/**
 * Manages HTTP communication with the LMS (Learning Management System).
 * Handles authentication, session persistence, and API routing.
 */
class CampusNetworkAgent {
  /**
   * @param {Object} config - Provider configuration
   * @param {Object} options 
   */
  constructor(config, options = {}) {
    this.baseUrl = config.base_url || 'https://ilearn.thu.edu.tw';
    this.userAgent = config.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    this.logger = createSafeLogger(options.logger);
    
    this.endpoints = buildEndpoints(this.baseUrl);
    this.cookies = new SessionCookieStore({ logger: this.logger });
    this.authParser = new AuthenticationParser({ logger: this.logger });
  }

  /**
   * Wrapper for native fetch to auto-inject cookies and headers.
   */
  async request(url, fetchOptions = {}) {
    const headers = {
      'User-Agent': this.userAgent,
      'Accept': 'application/json, text/html, */*',
      'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      ...(fetchOptions.headers || {})
    };

    const cookieHeader = this.cookies.toHeaderString();
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        redirect: 'manual' // Handle redirects manually to capture cookies
      });

      // Capture incoming cookies
      const setCookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
      if (setCookies && setCookies.length > 0) {
        this.cookies.ingest(setCookies);
      }

      return response;
    } catch (error) {
      this.logger.error(`Network request failed for ${url}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Authenticates the user. Restores from disk if possible.
   * @param {string} username 
   * @param {string} password 
   */
  async authenticate(username, password) {
    if (this.cookies.loadFromDisk()) {
      // Validate session via a quick dashboard fetch
      const testRes = await this.request(this.endpoints.dashboard());
      if (testRes.status === 200 && !testRes.url.includes('/login')) {
        this.logger.info(`Session restored successfully for ${username}.`);
        return true;
      }
      this.logger.warn('Saved session is invalid or expired. Proceeding to fresh login.');
    }

    this.logger.info(`Initiating fresh login sequence for ${username}...`);
    
    // 1. Fetch Login Page
    const pageRes = await this.request(this.endpoints.loginPage());
    const html = await pageRes.text();
    
    // 2. Parse Form
    const formMeta = this.authParser.parseLoginForm(html);
    if (!formMeta) {
      throw new Error('Failed to parse login form. Verification mechanism might have changed.');
    }

    // 3. Prepare Submission Payload
    const formData = new URLSearchParams();
    for (const [key, val] of Object.entries(formMeta.hiddenInputs)) {
      formData.append(key, val);
    }
    formData.append(formMeta.fields.username, username);
    formData.append(formMeta.fields.password, password);

    // 4. Submit Login
    const submitUrl = formMeta.actionUrl.startsWith('http') 
      ? formMeta.actionUrl 
      : `${this.baseUrl}${formMeta.actionUrl}`;

    const loginRes = await this.request(submitUrl, {
      method: formMeta.method,
      body: formData.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Assume success if redirect (302) or OK (200) without error markers
    if (loginRes.status === 302 || loginRes.status === 200) {
      // Verify by fetching dashboard again
      const verifyRes = await this.request(this.endpoints.dashboard());
      if (verifyRes.url.includes('/login')) {
        throw new Error('Login failed: Invalid credentials or captcha required.');
      }
      
      this.logger.info('Authentication successful.');
      this.cookies.saveToDisk();
      return true;
    }

    throw new Error(`Login encountered unexpected status: ${loginRes.status}`);
  }

  /**
   * Fetches active rollcall tasks.
   */
  async getActiveTasks() {
    const res = await this.request(this.endpoints.activeTasks());
    if (!res.ok) throw new Error(`Tasks fetch failed: ${res.status}`);
    return await res.json();
  }
}

module.exports = {
  CampusNetworkAgent
};
