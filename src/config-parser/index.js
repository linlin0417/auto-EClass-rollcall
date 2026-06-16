'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { createSafeLogger } = require('../utils/logger');

/**
 * Parses and validates the configuration from a given file path.
 */
class ConfigurationParser {
  /**
   * @param {Object} options 
   * @param {string} options.baseDir - The base directory to look for config.yaml
   * @param {Object} options.logger - Injected logger
   */
  constructor(options = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.logger = createSafeLogger(options.logger);
    this.configPath = path.join(this.baseDir, 'config.yaml');
  }

  /**
   * Reads and parses config.yaml, ensuring default structures are present.
   * @returns {Object} The normalized configuration object.
   */
  parse() {
    let rawConfig = {};
    
    try {
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf8');
        rawConfig = yaml.load(fileContent) || {};
        this.logger.debug(`Configuration loaded from ${this.configPath}`);
      } else {
        this.logger.warn(`No config.yaml found at ${this.configPath}. Using default empty configuration.`);
      }
    } catch (error) {
      this.logger.error(`Failed to parse configuration file: ${error.message}`);
    }

    return this._normalize(rawConfig);
  }

  /**
   * Applies defaults and normalizes the parsed YAML object.
   * @param {Object} raw 
   * @private
   */
  _normalize(raw) {
    const config = { ...raw };
    
    config.accounts = config.accounts || {};
    config.provider = config.provider || { base_url: 'https://ilearn.thu.edu.tw' };
    config.monitor = config.monitor || { interval: 15 };
    
    // Ensure active profile exists
    if (!config.accounts.current) {
      config.accounts.current = 'default';
    }
    if (!config.accounts.profiles) {
      config.accounts.profiles = {};
    }

    return config;
  }
}

module.exports = {
  ConfigurationParser
};
