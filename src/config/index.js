'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { normalizeAccountsConfig } = require('../auth/account-store');

function getConfigPath(baseDir) {
  return path.join(baseDir, 'config.yaml');
}

/**
 * Normalizes configuration object to ensure required fields exist
 * @param {Object} config 
 * @returns {Object}
 */
function normalizeConfig(config) {
  const norm = { ...config };
  
  if (!norm.config || typeof norm.config !== 'object') norm.config = {};
  if (!norm.auth || typeof norm.auth !== 'object') norm.auth = {};
  if (!norm.rollcall || typeof norm.rollcall !== 'object') norm.rollcall = {};
  if (!norm.discord || typeof norm.discord !== 'object') norm.discord = {};
  
  // Normalize accounts
  const accounts = normalizeAccountsConfig(norm);
  norm.accounts = accounts.profiles ? accounts : undefined;
  
  return norm;
}

/**
 * Loads configuration from config.yaml in baseDir
 * @param {string} baseDir 
 * @returns {Object}
 */
function loadConfig(baseDir) {
  const file = getConfigPath(baseDir);
  let raw = {};
  
  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf8');
      raw = yaml.load(data) || {};
    }
  } catch (err) {
    console.error(`Warning: Failed to load config from ${file}: ${err.message}`);
  }
  
  return normalizeConfig(raw);
}

/**
 * Saves configuration to config.yaml in baseDir
 * @param {Object} config 
 * @param {string} baseDir 
 * @returns {boolean} True if successful
 */
function saveConfig(config, baseDir) {
  const file = getConfigPath(baseDir);
  const norm = normalizeConfig(config);
  
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const dump = yaml.dump(norm, { lineWidth: -1, noRefs: true });
    fs.writeFileSync(file, dump, 'utf8');
    return true;
  } catch (err) {
    console.error(`Warning: Failed to save config to ${file}: ${err.message}`);
    return false;
  }
}

module.exports = {
  getConfigPath,
  normalizeConfig,
  loadConfig,
  saveConfig,
};
