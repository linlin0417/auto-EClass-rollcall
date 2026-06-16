'use strict';

// ---------------------------------------------------------------------------
// LoginForm — parsed from HTML login page
// ---------------------------------------------------------------------------

class LoginForm {
  /**
   * @param {Object} opts
   * @param {string} opts.actionUrl
   * @param {Object<string, string>} opts.fields
   * @param {string} [opts.usernameField='username']
   * @param {string} [opts.passwordField='password']
   */
  constructor({ actionUrl, fields, usernameField = 'username', passwordField = 'password' }) {
    this.actionUrl = actionUrl;
    this.fields = Object.freeze({ ...fields });
    this.usernameField = usernameField;
    this.passwordField = passwordField;
    Object.freeze(this);
  }
}

// ---------------------------------------------------------------------------
// LoginOutcome — result of submitting credentials
// ---------------------------------------------------------------------------

class LoginOutcome {
  /**
   * @param {Object} opts
   * @param {string} opts.finalUrl
   * @param {boolean} opts.hasSession
   */
  constructor({ finalUrl, hasSession }) {
    this.finalUrl = finalUrl;
    this.hasSession = hasSession;
    Object.freeze(this);
  }
}

// ---------------------------------------------------------------------------
// LoginResult — final result of the login flow
// ---------------------------------------------------------------------------

class LoginResult {
  /**
   * @param {Object} opts
   * @param {string} opts.status - 'success' | 'missing_credentials' | 'rejected' | 'missing_session' | 'transient_error' | ...
   * @param {string} opts.credentialSource - 'config' | 'env' | 'runtime' | 'keyring' | ''
   * @param {string} [opts.user='']
   * @param {string} [opts.finalUrl='']
   * @param {string} [opts.error='']
   */
  constructor({ status, credentialSource, user = '', finalUrl = '', error = '' }) {
    this.status = status;
    this.credentialSource = credentialSource;
    this.user = user;
    this.finalUrl = finalUrl;
    this.error = error;
    Object.freeze(this);
  }

  /** @returns {boolean} */
  get ok() {
    return this.status === 'success';
  }

  /** @returns {boolean} */
  get shouldAutoRetry() {
    return this.status === 'missing_session' || this.status === 'transient_error';
  }

  // --- Factory methods ---

  static success(opts) {
    return new LoginResult({ status: 'success', ...opts });
  }

  static missingCredentials(credentialSource = '') {
    return new LoginResult({ status: 'missing_credentials', credentialSource });
  }

  static rejected(opts) {
    return new LoginResult({ status: 'rejected', ...opts });
  }

  static transientError(opts) {
    return new LoginResult({ status: 'transient_error', ...opts });
  }
}

module.exports = { LoginForm, LoginOutcome, LoginResult };
