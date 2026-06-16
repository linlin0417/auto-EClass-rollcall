'use strict';

const {
  TronHttpError,
  UnauthorizedError,
  LoginPageChangedError,
  LoginRejectedError,
  UnexpectedResponseError,
} = require('./errors');
const { CookieJar } = require('./cookie-jar');
const { DEFAULT_ENDPOINTS } = require('./endpoints');
const {
  extractLoginForm,
  extractPublicCloudEmailLoginForm,
  extractHtmlRedirect,
} = require('./login-parser');
const { LoginOutcome } = require('../models/login');

const TKU_SSO_HOST = 'sso.tku.edu.tw';
const TKU_ICLASS_HOST = 'iclass.tku.edu.tw';
const PUBLIC_CLOUD_HOSTS = new Set(['www.tronclass.com.tw', 'tronclass.com.tw']);
const PUBLIC_CLOUD_AUTH_FLOW = 'public_cloud_email';

const HTML_ACCEPT = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
const LANGUAGE_ACCEPT = 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7';

const TKU_SSO_LOGIN_FORM_URL_TEMPLATE = 'https://sso.tku.edu.tw/NEAI/logineb.jsp?myurl={}';

const TKU_SSO_FORM_HEADERS = {
  'Accept': HTML_ACCEPT,
  'Accept-Language': LANGUAGE_ACCEPT,
  'Referer': 'https://iclass.tku.edu.tw/login?next=/iportal&locale=zh_TW',
  'Upgrade-Insecure-Requests': '1',
};

const TKU_SSO_IMAGE_HEADERS = {
  'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Accept-Language': LANGUAGE_ACCEPT,
  'Referer': TKU_SSO_LOGIN_FORM_URL_TEMPLATE.replace('{}', encodeURIComponent('https://iclass.tku.edu.tw/login?next=/iportal&locale=zh_TW')),
};

const TKU_SSO_AJAX_HEADERS = {
  'Accept': 'text/plain, */*; q=0.01',
  'Accept-Language': LANGUAGE_ACCEPT,
  'Origin': 'https://sso.tku.edu.tw',
  'Referer': TKU_SSO_LOGIN_FORM_URL_TEMPLATE.replace('{}', encodeURIComponent('https://iclass.tku.edu.tw/login?next=/iportal&locale=zh_TW')),
  'X-Requested-With': 'XMLHttpRequest',
};

const TKU_SSO_SUBMIT_HEADERS = {
  'Accept': HTML_ACCEPT,
  'Accept-Language': LANGUAGE_ACCEPT,
  'Cache-Control': 'max-age=0',
  'Origin': 'https://sso.tku.edu.tw',
  'Referer': TKU_SSO_LOGIN_FORM_URL_TEMPLATE.replace('{}', encodeURIComponent('https://iclass.tku.edu.tw/login?next=/iportal&locale=zh_TW')),
  'Upgrade-Insecure-Requests': '1',
};

const NAVIGATION_HEADERS = {
  'Accept': HTML_ACCEPT,
  'Accept-Language': LANGUAGE_ACCEPT,
  'Upgrade-Insecure-Requests': '1',
};

class TronClient {
  constructor({ endpoints = DEFAULT_ENDPOINTS, userAgent = null, timeout = 20000 } = {}) {
    this.endpoints = endpoints;
    this.cookieJar = new CookieJar();
    this.userAgent = userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';
    this.timeout = timeout;
  }

  // --- Internal Request Helpers ---

  async _fetch(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (!headers.has('User-Agent')) headers.set('User-Agent', this.userAgent);

    const cookieStr = this.cookieJar.getCookieString(url);
    if (cookieStr) headers.set('Cookie', cookieStr);

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const fetchOpts = {
        method: options.method || 'GET',
        headers,
        redirect: options.redirect || 'follow',
        signal: controller.signal,
      };
      
      if (options.body) fetchOpts.body = options.body;

      const response = await fetch(url, fetchOpts);
      
      // Store returned cookies
      const setCookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
      let defaultDomain = 'ilearn.thu.edu.tw';
      try { defaultDomain = new URL(url).hostname; } catch { /* ignore */ }
      
      for (const sc of setCookies) {
        this.cookieJar.setCookie(sc, defaultDomain);
      }

      return response;
    } finally {
      clearTimeout(id);
    }
  }

  apiUrl(path) {
    return `${this.endpoints.baseUrl}${path}`;
  }

  async requestJson(method, path, { jsonPayload = null, expectedStatus = [200] } = {}) {
    const url = path.startsWith('http') ? path : this.apiUrl(path);
    const options = { method };
    if (jsonPayload != null) {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(jsonPayload);
    }

    const resp = await this._fetch(url, options);
    const status = resp.status;
    const responseUrl = resp.url;

    if (status === 401 || responseUrl.toLowerCase().includes('login')) {
      throw new UnauthorizedError('Cookie 已過期或導向登入頁。');
    }

    if (!expectedStatus.includes(status)) {
      const bodyText = (await resp.text()).slice(0, 200);
      throw new UnexpectedResponseError(`HTTP ${status}: ${bodyText}`);
    }

    if (status === 204) return {};

    const text = await resp.text();
    if (!text.trim()) return {};

    try {
      return JSON.parse(text);
    } catch {
      throw new UnexpectedResponseError(`Unexpected response body: ${text.slice(0, 200)}`);
    }
  }

  // --- Login & SSO Logic ---

  isTkuFastSso() {
    let host = '', loginHost = '';
    try { host = new URL(this.endpoints.baseUrl).hostname; } catch {}
    try { loginHost = new URL(this.endpoints.loginUrl).hostname; } catch {}
    return host.toLowerCase() === TKU_ICLASS_HOST || loginHost.toLowerCase() === TKU_ICLASS_HOST;
  }

  isPublicCloudEmailLogin() {
    const authFlow = String(this.endpoints.authFlow || '').trim().toLowerCase();
    let host = '', loginHost = '';
    try { host = new URL(this.endpoints.baseUrl).hostname.toLowerCase(); } catch {}
    try { loginHost = new URL(this.endpoints.loginUrl).hostname.toLowerCase(); } catch {}
    return authFlow === PUBLIC_CLOUD_AUTH_FLOW || PUBLIC_CLOUD_HOSTS.has(host) || PUBLIC_CLOUD_HOSTS.has(loginHost);
  }

  _setTkuBrowserCookie(name, value, path = '/') {
    this.cookieJar.setCookie(`${name}=${value}; Path=${path}; Domain=sso.tku.edu.tw`, 'sso.tku.edu.tw');
  }

  async _getLoginFormResponse(url, headers = null) {
    const resp = await this._fetch(url, { method: 'GET', headers: headers || {} });
    return { text: await resp.text(), url: resp.url };
  }

  async _fetchTkuImageValidateCode(formUrl) {
    const validateUrl = new URL('ImageValidate', formUrl).toString();
    await this._fetch(validateUrl, { method: 'GET', headers: TKU_SSO_IMAGE_HEADERS });
    
    // outType=1
    await this._fetch(validateUrl, {
      method: 'POST',
      headers: { ...TKU_SSO_AJAX_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'outType=1',
    });

    // outType=2
    const resp = await this._fetch(validateUrl, {
      method: 'POST',
      headers: { ...TKU_SSO_AJAX_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'outType=2',
    });

    if (resp.status !== 200) {
      throw new LoginPageChangedError(`TKU SSO ImageValidate returned HTTP ${resp.status}.`);
    }

    const code = (await resp.text()).trim();
    if (!code) throw new LoginPageChangedError('TKU SSO ImageValidate did not return a validation code.');
    return code;
  }

  async _completeTkuLoginForm(form) {
    const fields = { ...form.fields };
    if ('vidcode' in fields && !fields.vidcode) {
      fields.vidcode = await this._fetchTkuImageValidateCode(form.actionUrl);
    }
    return new LoginForm({ actionUrl: form.actionUrl, fields });
  }

  async _followTkuLoginRedirects(htmlText, baseUrl, maxRedirects = 10) {
    let finalUrl = baseUrl;
    for (let i = 0; i < maxRedirects; i++) {
      let redirectUrl = extractHtmlRedirect(htmlText, finalUrl);
      if (!redirectUrl) break;

      while (true) {
        const headers = { ...NAVIGATION_HEADERS, Referer: finalUrl };
        const resp = await this._fetch(redirectUrl, { method: 'GET', headers, redirect: 'manual' });
        htmlText = await resp.text();
        const responseUrl = resp.url;
        const location = resp.headers.get('Location');
        
        if ([301, 302, 303, 307, 308].includes(resp.status) && location) {
          finalUrl = responseUrl;
          redirectUrl = new URL(location, responseUrl).toString();
          continue;
        }

        finalUrl = responseUrl;
        break;
      }
    }
    return finalUrl;
  }

  async fetchLoginForm() {
    const { text: htmlText, url: currentUrl } = await this._getLoginFormResponse(this.endpoints.loginUrl);
    
    if (this.isPublicCloudEmailLogin()) {
      try {
        return extractPublicCloudEmailLoginForm(htmlText, currentUrl);
      } catch (e) {
        if (e instanceof LoginPageChangedError) return extractLoginForm(htmlText, currentUrl);
        throw e;
      }
    }

    if (!this.isTkuFastSso()) {
      return extractLoginForm(htmlText, this.endpoints.loginUrl);
    }

    try {
      return await this._completeTkuLoginForm(extractLoginForm(htmlText, currentUrl));
    } catch (e) {
      if (e instanceof LoginPageChangedError) {
        if (!htmlText.includes('redirectLoginPage') && !htmlText.includes('logineb.jsp')) throw e;
      } else {
        throw e;
      }
    }

    this._setTkuBrowserCookie('IV_JCT', '%2FNEAI');
    const ssoLoginFormUrl = TKU_SSO_LOGIN_FORM_URL_TEMPLATE.replace('{}', encodeURIComponent(currentUrl));
    const { text: ssoHtml1 } = await this._getLoginFormResponse(ssoLoginFormUrl, TKU_SSO_FORM_HEADERS);
    let form = extractLoginForm(ssoHtml1, ssoLoginFormUrl);
    
    if (form.actionUrl.includes(';jsessionid=')) {
      const { text: ssoHtml2 } = await this._getLoginFormResponse(ssoLoginFormUrl, TKU_SSO_FORM_HEADERS);
      form = extractLoginForm(ssoHtml2, ssoLoginFormUrl);
    }

    return await this._completeTkuLoginForm(form);
  }

  async submitLogin(form, username, password) {
    const formData = new URLSearchParams();
    for (const [k, v] of Object.entries(form.fields)) {
      formData.append(k, v);
    }
    formData.set(form.usernameField, username);
    formData.set(form.passwordField, password);

    let headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    let redirect = 'follow';

    let actionHostname = '';
    try { actionHostname = new URL(form.actionUrl).hostname; } catch {}

    if (this.isTkuFastSso() && actionHostname === TKU_SSO_HOST) {
      headers = { ...TKU_SSO_SUBMIT_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' };
      redirect = 'manual';
    }

    const resp = await this._fetch(form.actionUrl, {
      method: 'POST',
      headers,
      body: formData.toString(),
      redirect,
    });

    let htmlText = await resp.text();
    let finalUrl = resp.url;

    if (redirect === 'manual') {
      finalUrl = await this._followTkuLoginRedirects(htmlText, finalUrl);
    }

    const hasSession = this.cookieJar.hasSessionCookie(this.endpoints.sessionCookieDomain);

    if (redirect === 'manual' && !hasSession) {
      throw new LoginPageChangedError('TKU fast SSO login did not yield an iClass session cookie.');
    }

    if (finalUrl.toLowerCase().includes('login') && !hasSession) {
      throw new LoginRejectedError('登入失敗，請檢查帳號或密碼是否正確。');
    }

    return new LoginOutcome({ finalUrl, hasSession });
  }

  // --- API Methods ---

  async fetchUserId() {
    const resp = await this._fetch(this.endpoints.baseUrl, { method: 'GET' });
    const htmlText = await resp.text();
    const match = htmlText.match(/window\.APPRuntime\s*=\s*(\{.*?\});/is);
    if (!match) return null;
    try {
      const runtime = JSON.parse(match[1]);
      const id = runtime?.USER?.id;
      return typeof id === 'number' ? id : null;
    } catch {
      return null;
    }
  }

  async createTeacherRollcall(courseId, payload) {
    return await this.requestJson('POST', `/api/course/${String(courseId).trim()}/rollcall`, {
      jsonPayload: payload,
      expectedStatus: [200, 201]
    });
  }

  async startTeacherRollcall(rollcallId, payload = null) {
    return await this.requestJson('POST', `/api/rollcall/${String(rollcallId).trim()}/start-rollcall`, {
      jsonPayload: payload,
      expectedStatus: [200, 204]
    });
  }

  async stopTeacherRollcall(rollcallId, rollcall = null, rollcallType = 'manual') {
    let typeParam = String(rollcallType || 'manual');
    let path = `/api/rollcall/${String(rollcallId).trim()}/stop-rollcall?rollcall_type=${typeParam}`;
    if (rollcall && rollcall.course_id) {
      path = `/api/course/${rollcall.course_id}/rollcall/${String(rollcallId).trim()}/stop-rollcall?rollcall_type=${typeParam}`;
    }
    return await this.requestJson('PUT', path, { expectedStatus: [200, 204] });
  }

  async fetchTeacherQrCode(courseId, rollcallId) {
    return await this.requestJson('GET', `/api/course/${String(courseId).trim()}/rollcall/${String(rollcallId).trim()}/qr_code`);
  }

  async fetchRollcalls() {
    const resp = await this._fetch(this.endpoints.rollcallsUrl, { method: 'GET' });
    const url = resp.url;
    const statusCode = resp.status;
    
    if (statusCode === 401 || url.toLowerCase().includes('login')) {
      throw new UnauthorizedError('Cookie 已過期或導向登入頁。');
    }

    if (statusCode !== 200) {
      const body = (await resp.text()).slice(0, 200);
      throw new UnexpectedResponseError(`HTTP ${statusCode}: ${body}`);
    }

    let payload;
    try {
      payload = JSON.parse(await resp.text());
    } catch {
      throw new UnexpectedResponseError('Unexpected response body');
    }

    return { url, statusCode, payload };
  }

  async fetchStudentRollcalls(rollcallId, action = '') {
    let url = `/api/rollcall/${String(rollcallId).trim()}/student_rollcalls`;
    if (action) url += `?action=${String(action).trim()}`;
    return await this.requestJson('GET', url);
  }

  async submitRollcallAnswer(rollcallId, payload) {
    const url = `/api/rollcall/${String(rollcallId).trim()}/student_rollcalls`;
    const resp = await this._fetch(this.apiUrl(url), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const status = resp.status;
    const bodyText = await resp.text();
    let body = null;
    if (bodyText) {
      try { body = JSON.parse(bodyText); } catch { body = { raw: bodyText }; }
    }

    return { status, body, bodyText };
  }

  async submitQrAnswer(rollcallId, payload, sessionId = '') {
    const url = `/api/rollcall/${String(rollcallId).trim()}/answer_qr_rollcall`;
    const headers = { 'Content-Type': 'application/json' };
    if (sessionId) headers['x-session-id'] = sessionId;

    const resp = await this._fetch(this.apiUrl(url), {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });

    const status = resp.status;
    const bodyText = await resp.text();
    let body = null;
    if (bodyText) {
      try { body = JSON.parse(bodyText); } catch { body = { raw: bodyText }; }
    }

    return { status, body, bodyText };
  }

  async fetchCurrentSemester() {
    return await this.requestJson('GET', this.endpoints.currentSemesterUrl);
  }

  async fetchMyCourses() {
    return await this.requestJson('GET', this.endpoints.coursesUrl);
  }
}

module.exports = { TronClient };
