'use strict';

const TRON = 'https://ilearn.thu.edu.tw';
const LOGIN_URL = 'https://tcidentity.thu.edu.tw/auth/realms/thu/protocol/cas/login?ui_locales=zh-TW&service=https%3A//ilearn.thu.edu.tw/login&locale=zh_TW';
const ROLLCALLS_URL = `${TRON}/api/radar/rollcalls?api_version=1.1.0`;
const CURRENT_SEMESTER_URL = `${TRON}/api/current-semester-info`;
const COURSES_URL = `${TRON}/api/my-courses?page=1&page_size=50`;

class TronHttpEndpoints {
  constructor(opts = {}) {
    this.baseUrl = opts.baseUrl || TRON;
    this.loginUrl = opts.loginUrl || LOGIN_URL;
    this.rollcallsUrl = opts.rollcallsUrl || ROLLCALLS_URL;
    this.currentSemesterUrl = opts.currentSemesterUrl || CURRENT_SEMESTER_URL;
    this.coursesUrl = opts.coursesUrl || COURSES_URL;
    this.sessionCookieDomain = opts.sessionCookieDomain || 'ilearn.thu.edu.tw';
    this.authFlow = opts.authFlow || 'thu_cas';
    Object.freeze(this);
  }
}

const DEFAULT_ENDPOINTS = new TronHttpEndpoints();

/**
 * @param {*} provider 
 * @returns {TronHttpEndpoints}
 */
function endpointsFromProvider(provider) {
  if (provider && typeof provider.toConfig === 'function') {
    provider = provider.toConfig();
  }
  if (!provider || typeof provider !== 'object') {
    return DEFAULT_ENDPOINTS;
  }

  let baseUrl = String(provider.base_url || TRON).replace(/\/$/, '');
  let cookieDomain = 'ilearn.thu.edu.tw';
  try {
    cookieDomain = new URL(baseUrl).hostname || cookieDomain;
  } catch { /* ignore */ }

  return new TronHttpEndpoints({
    baseUrl,
    loginUrl: String(provider.login_url || LOGIN_URL),
    rollcallsUrl: String(provider.rollcalls_url || ROLLCALLS_URL),
    currentSemesterUrl: String(provider.current_semester_url || `${baseUrl}/api/current-semester-info`),
    coursesUrl: String(provider.courses_url || `${baseUrl}/api/my-courses?page=1&page_size=50`),
    sessionCookieDomain: cookieDomain,
    authFlow: String(provider.auth_flow || ''),
  });
}

module.exports = {
  TRON,
  LOGIN_URL,
  ROLLCALLS_URL,
  CURRENT_SEMESTER_URL,
  COURSES_URL,
  TronHttpEndpoints,
  DEFAULT_ENDPOINTS,
  endpointsFromProvider,
};
