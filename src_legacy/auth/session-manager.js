'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * @param {string} baseDir 
 * @param {string} profileName 
 * @returns {string}
 */
function getSessionFilePath(baseDir, profileName = 'default') {
  return path.join(baseDir, 'profiles', profileName, 'session.json');
}

/**
 * Loads session cookies from disk into a TronClient's CookieJar.
 * @param {import('../http/client').TronClient} client
 * @param {string} baseDir
 * @param {string} profileName
 * @returns {boolean} True if successfully loaded
 */
function loadSessionCookies(client, baseDir, profileName = 'default') {
  const filePath = getSessionFilePath(baseDir, profileName);
  try {
    if (!fs.existsSync(filePath)) return false;
    const data = fs.readFileSync(filePath, 'utf8');
    const store = JSON.parse(data);
    
    // Reconstruct the nested maps
    client.cookieJar.store.clear();
    for (const [domain, pathMap] of Object.entries(store)) {
      const dMap = new Map();
      for (const [p, cookieMap] of Object.entries(pathMap)) {
        const cMap = new Map();
        for (const [key, cookie] of Object.entries(cookieMap)) {
          if (cookie.expires) cookie.expires = new Date(cookie.expires);
          cMap.set(key, cookie);
        }
        dMap.set(p, cMap);
      }
      client.cookieJar.store.set(domain, dMap);
    }
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Saves session cookies from a TronClient's CookieJar to disk.
 * @param {import('../http/client').TronClient} client
 * @param {string} baseDir
 * @param {string} profileName
 */
function saveSessionCookies(client, baseDir, profileName = 'default') {
  const filePath = getSessionFilePath(baseDir, profileName);
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    
    // Serialize nested maps
    const storeObj = {};
    for (const [domain, pathMap] of client.cookieJar.store.entries()) {
      storeObj[domain] = {};
      for (const [p, cookieMap] of pathMap.entries()) {
        storeObj[domain][p] = {};
        for (const [key, cookie] of cookieMap.entries()) {
          storeObj[domain][p][key] = {
            ...cookie,
            expires: cookie.expires ? cookie.expires.toISOString() : undefined,
          };
        }
      }
    }
    
    fs.writeFileSync(filePath, JSON.stringify(storeObj, null, 2), 'utf8');
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Clears session cookies from disk and client.
 * @param {import('../http/client').TronClient} client
 * @param {string} baseDir
 * @param {string} profileName
 */
function clearSessionCookies(client, baseDir, profileName = 'default') {
  if (client) client.cookieJar.store.clear();
  const filePath = getSessionFilePath(baseDir, profileName);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (err) {
    // ignore
  }
  return false;
}

module.exports = {
  getSessionFilePath,
  loadSessionCookies,
  saveSessionCookies,
  clearSessionCookies,
};
