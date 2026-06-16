'use strict';

class CookieJar {
  constructor() {
    // Map<domain, Map<path, Map<key, { value, expires, secure, ... }>>>
    this.store = new Map();
  }

  /**
   * Parse a Set-Cookie string and store it.
   * @param {string} cookieStr 
   * @param {string} defaultDomain 
   */
  setCookie(cookieStr, defaultDomain) {
    if (!cookieStr) return;
    const parts = cookieStr.split(';').map(s => s.trim());
    if (parts.length === 0) return;

    const [nameValue, ...attrs] = parts;
    const splitIndex = nameValue.indexOf('=');
    if (splitIndex < 0) return;

    const key = nameValue.slice(0, splitIndex);
    const value = nameValue.slice(splitIndex + 1);

    const cookie = { value, domain: defaultDomain, path: '/' };

    for (const attr of attrs) {
      const lower = attr.toLowerCase();
      if (lower.startsWith('domain=')) {
        let d = attr.slice(7).trim();
        if (d.startsWith('.')) d = d.slice(1);
        cookie.domain = d;
      } else if (lower.startsWith('path=')) {
        cookie.path = attr.slice(5).trim();
      } else if (lower.startsWith('expires=')) {
        cookie.expires = new Date(attr.slice(8).trim());
      } else if (lower.startsWith('max-age=')) {
        const maxAge = parseInt(attr.slice(8).trim(), 10);
        if (!Number.isNaN(maxAge)) {
          cookie.expires = new Date(Date.now() + maxAge * 1000);
        }
      }
    }

    if (!this.store.has(cookie.domain)) {
      this.store.set(cookie.domain, new Map());
    }
    const domainStore = this.store.get(cookie.domain);
    if (!domainStore.has(cookie.path)) {
      domainStore.set(cookie.path, new Map());
    }
    domainStore.get(cookie.path).set(key, cookie);
  }

  /**
   * Get formatted Cookie header string for a given URL
   * @param {string} urlStr 
   * @returns {string}
   */
  getCookieString(urlStr) {
    let url;
    try {
      url = new URL(urlStr);
    } catch {
      return '';
    }
    
    const targetDomain = url.hostname;
    const targetPath = url.pathname;
    const now = new Date();
    const activeCookies = [];

    for (const [domain, pathMap] of this.store.entries()) {
      if (targetDomain === domain || targetDomain.endsWith('.' + domain)) {
        for (const [path, cookieMap] of pathMap.entries()) {
          if (targetPath.startsWith(path)) {
            for (const [key, cookie] of cookieMap.entries()) {
              if (!cookie.expires || cookie.expires > now) {
                activeCookies.push(`${key}=${cookie.value}`);
              }
            }
          }
        }
      }
    }
    return activeCookies.join('; ');
  }

  /**
   * @param {string} domain 
   * @returns {boolean}
   */
  hasSessionCookie(domain) {
    const now = new Date();
    for (const [d, pathMap] of this.store.entries()) {
      if (!domain || d === domain || d.endsWith('.' + domain)) {
        for (const cookieMap of pathMap.values()) {
          const session = cookieMap.get('session');
          if (session && (!session.expires || session.expires > now)) {
            return true;
          }
        }
      }
    }
    return false;
  }
}

module.exports = { CookieJar };
