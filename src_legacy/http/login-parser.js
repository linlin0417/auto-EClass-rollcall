'use strict';

const { LoginForm } = require('../models/login');
const { LoginPageChangedError } = require('./errors');
const querystring = require('node:querystring');

const FORM_PATTERNS = [
  /<form\b[^>]*class=(['"]).*?form-horizontal.*?\1[^>]*>(.*?)<\/form>/is,
  /<form\b[^>]*>(.*?)<\/form>/is,
];
const INPUT_PATTERN = /<input\b[^>]*>/ig;
const ATTR_PATTERN = /([:\w-]+)\s*=\s*(['"])(.*?)\2/ig;

const SCRIPT_REDIRECT_PATTERNS = [
  /(?:window|document)\.location(?:\.href)?\s*=\s*(['"])(.*?)\1/is,
  /(?:window|document)\.location\.replace\(\s*(['"])(.*?)\1\s*\)/is,
];
const META_REFRESH_PATTERN = /<meta\b[^>]*http-equiv\s*=\s*(['"])refresh\1[^>]*content\s*=\s*(['"])[^'"]*url=([^'"]+)\2/is;

const PUBLIC_CLOUD_LOGIN_VIEW_PATTERN = /<login-view\b/i;
const PUBLIC_CLOUD_EMAIL_FORM_PATTERN = /:email-login-form\s*=\s*(['"])(.*?)\1/is;
const PUBLIC_CLOUD_EMAIL_HIDDEN_PATTERN = /email-login-hidden-tag\s*=\s*(['"])(.*?)\1/is;
const PUBLIC_CLOUD_ORG_ID_PATTERN = /:org-id\s*=\s*(['"])(.*?)\1/is;

// Very basic HTML unescape (since we just need standard quotes/amps for URLs)
function unescapeHtml(str) {
  return str.replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
}

function parseTagAttributes(tagHtml) {
  const attrs = {};
  let match;
  while ((match = ATTR_PATTERN.exec(tagHtml)) !== null) {
    attrs[match[1].toLowerCase()] = unescapeHtml(match[3]);
  }
  return attrs;
}

function extractLoginForm(htmlText, baseUrl) {
  for (const pattern of FORM_PATTERNS) {
    const match = htmlText.match(pattern);
    if (!match) continue;

    const openingTag = match[0].substring(0, match[0].indexOf('>') + 1);
    const body = match[2] || match[1];
    
    const formAttrs = parseTagAttributes(openingTag);
    const action = formAttrs.action;
    if (!action) continue;

    const fields = {};
    let inputMatch;
    while ((inputMatch = INPUT_PATTERN.exec(body)) !== null) {
      const inputAttrs = parseTagAttributes(inputMatch[0]);
      const name = inputAttrs.name;
      if (name) {
        fields[name] = inputAttrs.value || '';
      }
    }

    const actionUrl = new URL(action, baseUrl).toString();
    return new LoginForm({ actionUrl, fields });
  }

  throw new LoginPageChangedError('找不到登入表單的 action URL，可能網站結構已更改。');
}

function _extractPublicCloudAttr(pattern, htmlText) {
  const match = htmlText.match(pattern);
  return match ? unescapeHtml(match[2]) : '';
}

function _extractPublicCloudJsonAttr(pattern, htmlText) {
  const raw = _extractPublicCloudAttr(pattern, htmlText);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function makePublicCloudEmailLoginUrl(baseUrl, nextValue = '') {
  let urlObj;
  try {
    urlObj = new URL(baseUrl || 'https://localhost');
  } catch {
    urlObj = new URL('https://localhost');
  }
  const origin = `${urlObj.protocol}//${urlObj.host}`;
  const actionUrl = new URL('/login', origin);
  
  const query = { login: 'email' };
  const nextText = String(nextValue || '').trim();
  if (nextText) query.next = nextText;
  
  actionUrl.search = querystring.stringify(query);
  return actionUrl.toString();
}

function extractPublicCloudEmailLoginForm(htmlText, baseUrl) {
  if (!PUBLIC_CLOUD_LOGIN_VIEW_PATTERN.test(htmlText)) {
    throw new LoginPageChangedError('找不到 TronClass public cloud 登入元件。');
  }

  const fields = {};
  const hiddenHtml = _extractPublicCloudAttr(PUBLIC_CLOUD_EMAIL_HIDDEN_PATTERN, htmlText);
  let inputMatch;
  while ((inputMatch = INPUT_PATTERN.exec(hiddenHtml)) !== null) {
    const inputAttrs = parseTagAttributes(inputMatch[0]);
    const name = inputAttrs.name;
    if (name) fields[name] = inputAttrs.value || '';
  }

  const formData = _extractPublicCloudJsonAttr(PUBLIC_CLOUD_EMAIL_FORM_PATTERN, htmlText);
  let nextValue = String(fields.next || formData.next || '').trim();
  if (!nextValue) {
    try {
      const urlObj = new URL(baseUrl);
      nextValue = String(urlObj.searchParams.get('next') || '').trim();
    } catch { /* ignore */ }
  }

  let orgId = String(formData.org_id || '').trim();
  if (!orgId) {
    orgId = _extractPublicCloudAttr(PUBLIC_CLOUD_ORG_ID_PATTERN, htmlText).trim();
    if (orgId === '0') orgId = '';
  }

  fields.next = nextValue;
  fields.org_id = orgId;
  fields.submit = 'login';
  if (formData.remember || formData.remember_me) {
    fields.remember_me = 'true';
  }

  return new LoginForm({
    actionUrl: makePublicCloudEmailLoginUrl(baseUrl, nextValue),
    fields,
    usernameField: 'email',
  });
}

function extractHtmlRedirect(htmlText, baseUrl) {
  for (const pattern of SCRIPT_REDIRECT_PATTERNS) {
    const match = htmlText.match(pattern);
    if (match) {
      return new URL(unescapeHtml(match[2]), baseUrl).toString();
    }
  }

  const metaMatch = htmlText.match(META_REFRESH_PATTERN);
  if (metaMatch) {
    return new URL(decodeURIComponent(unescapeHtml(metaMatch[3].trim())), baseUrl).toString();
  }

  return null;
}

module.exports = {
  extractLoginForm,
  extractPublicCloudEmailLoginForm,
  extractHtmlRedirect,
  makePublicCloudEmailLoginUrl,
};
