'use strict';

const cheerio = require('cheerio');
const { createSafeLogger } = require('../utils/logger');

/**
 * Extracts login form credentials and hidden tokens using DOM parsing.
 * This completely replaces the old Python Regex-based parser, making it more resilient.
 */
class AuthenticationParser {
  /**
   * @param {Object} options 
   * @param {Object} options.logger - Injected logger
   */
  constructor(options = {}) {
    this.logger = createSafeLogger(options.logger);
  }

  /**
   * Parses the HTML string of the login page to extract form action and hidden fields.
   * @param {string} htmlContent - The raw HTML of the login page
   * @returns {Object} Extracted form data
   */
  parseLoginForm(htmlContent) {
    if (!htmlContent) {
      throw new Error('Received empty HTML content for login page.');
    }

    const $ = cheerio.load(htmlContent);
    const form = $('form#login-form');
    
    if (form.length === 0) {
      this.logger.warn('Could not find form#login-form in the page. The provider might be using a different SSO flow.');
      return null;
    }

    const actionUrl = form.attr('action') || '/api/login';
    const method = (form.attr('method') || 'POST').toUpperCase();

    // Extract all hidden inputs (like CSRF tokens, utf8 checks)
    const hiddenInputs = {};
    form.find('input[type="hidden"]').each((_, el) => {
      const name = $(el).attr('name');
      const value = $(el).attr('value');
      if (name) {
        hiddenInputs[name] = value || '';
      }
    });

    // Detect username and password field names dynamically
    const usernameField = form.find('input[type="text"], input[name*="user"], input[name*="account"]').attr('name') || 'username';
    const passwordField = form.find('input[type="password"]').attr('name') || 'password';

    this.logger.debug(`Extracted login form: action=${actionUrl}, fields=[${usernameField}, ${passwordField}]`);

    return {
      actionUrl,
      method,
      hiddenInputs,
      fields: {
        username: usernameField,
        password: passwordField
      }
    };
  }
}

module.exports = {
  AuthenticationParser
};
