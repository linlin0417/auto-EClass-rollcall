'use strict';

const PROFILE_NAME_PATTERN = /[^A-Za-z0-9_.-]+/g;

class AccountProfile {
  constructor(name, user = '', passwd = '', label = '') {
    this.name = name;
    this.user = user;
    this.passwd = passwd;
    this.label = label;
  }
}

function normalizeProfileName(value) {
  let name = String(value || '').trim().replace(PROFILE_NAME_PATTERN, '-');
  // Strip leading/trailing dashes, dots, underscores
  name = name.replace(/^[-._]+|[-._]+$/g, '');
  return name || 'default';
}

function normalizeAccountsConfig(config) {
  if (typeof config !== 'object' || config === null) return {};

  if (!config.account || typeof config.account !== 'object') {
    config.account = {};
  }
  if (!config.accounts || typeof config.accounts !== 'object') {
    config.accounts = {};
  }
  if (!config.accounts.profiles || typeof config.accounts.profiles !== 'object') {
    config.accounts.profiles = {};
  }

  const legacy = config.account;
  const accounts = config.accounts;
  const rawProfiles = accounts.profiles;

  const profiles = {};
  for (const [rawName, rawProfile] of Object.entries(rawProfiles)) {
    const profileName = normalizeProfileName(rawName);
    const profile = typeof rawProfile === 'object' && rawProfile ? rawProfile : {};
    profiles[profileName] = {
      user: String(profile.user || ''),
      passwd: String(profile.passwd || ''),
      label: String(profile.label || ''),
    };
  }

  const legacyUser = String(legacy.user || '');
  const legacyPasswd = String(legacy.passwd || '');

  if (Object.keys(profiles).length === 0) {
    profiles.default = {
      user: legacyUser,
      passwd: legacyPasswd,
      label: 'legacy config',
    };
  }

  const firstProfileName = Object.keys(profiles)[0];
  let current = normalizeProfileName(accounts.current || firstProfileName);
  
  if (!(current in profiles)) {
    current = firstProfileName;
  }

  accounts.current = current;
  accounts.profiles = profiles;

  return accounts;
}

function getActiveProfile(config) {
  const accounts = normalizeAccountsConfig(config);
  const current = accounts.current;
  const profile = accounts.profiles[current];
  return new AccountProfile(
    current,
    profile.user,
    profile.passwd,
    profile.label
  );
}

function listProfiles(config) {
  const accounts = normalizeAccountsConfig(config);
  const list = [];
  for (const [name, profile] of Object.entries(accounts.profiles)) {
    list.push(new AccountProfile(name, profile.user, profile.passwd, profile.label));
  }
  return list;
}

function setProfile(config, name, user, passwd = '', label = '', makeCurrent = true) {
  const accounts = normalizeAccountsConfig(config);
  const profileName = normalizeProfileName(name);
  
  accounts.profiles[profileName] = {
    user: String(user || ''),
    passwd: String(passwd || ''),
    label: String(label || ''),
  };

  if (makeCurrent) {
    accounts.current = profileName;
    if (!config.account) config.account = {};
    config.account.user = String(user || '');
    config.account.passwd = String(passwd || '');
  }

  return makeCurrent ? getActiveProfile(config) : new AccountProfile(profileName, user, passwd, label);
}

function removeProfile(config, name) {
  const accounts = normalizeAccountsConfig(config);
  const profileName = normalizeProfileName(name);

  if (!(profileName in accounts.profiles)) return false;
  if (Object.keys(accounts.profiles).length === 1) return false;

  delete accounts.profiles[profileName];

  if (accounts.current === profileName) {
    accounts.current = Object.keys(accounts.profiles)[0];
  }

  const active = getActiveProfile(config);
  if (!config.account) config.account = {};
  config.account.user = active.user;
  config.account.passwd = active.passwd;

  return true;
}

function switchProfile(config, name) {
  const accounts = normalizeAccountsConfig(config);
  const profileName = normalizeProfileName(name);

  if (!(profileName in accounts.profiles)) {
    throw new Error(`Profile not found: ${profileName}`);
  }

  accounts.current = profileName;
  const active = getActiveProfile(config);
  if (!config.account) config.account = {};
  config.account.user = active.user;
  config.account.passwd = active.passwd;

  return active;
}

module.exports = {
  AccountProfile,
  normalizeProfileName,
  normalizeAccountsConfig,
  getActiveProfile,
  listProfiles,
  setProfile,
  removeProfile,
  switchProfile,
};
