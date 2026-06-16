'use strict';

/**
 * A simple fallback logger implementation if no external logger is provided.
 */
class DefaultConsoleLogger {
  info(message, ...meta) {
    console.log(`[INFO] ${message}`, ...meta);
  }
  
  warn(message, ...meta) {
    console.warn(`[WARN] ${message}`, ...meta);
  }
  
  error(message, ...meta) {
    console.error(`[ERROR] ${message}`, ...meta);
  }
  
  debug(message, ...meta) {
    // Debug is hidden by default in simple console logger
    // console.debug(`[DEBUG] ${message}`, ...meta);
  }
}

/**
 * Normalizes an injected logger to ensure it has the required methods: info, warn, error, debug.
 * If a method is missing, it falls back to a no-op or console method.
 * 
 * @param {Object} injectedLogger - The custom logger instance (e.g. winston, irika-Logger-System).
 * @returns {Object} A safe logger object.
 */
function createSafeLogger(injectedLogger = null) {
  if (!injectedLogger) {
    return new DefaultConsoleLogger();
  }

  // Ensure interface compliance
  return {
    info: typeof injectedLogger.info === 'function' ? injectedLogger.info.bind(injectedLogger) : console.log.bind(console),
    warn: typeof injectedLogger.warn === 'function' ? injectedLogger.warn.bind(injectedLogger) : console.warn.bind(console),
    error: typeof injectedLogger.error === 'function' ? injectedLogger.error.bind(injectedLogger) : console.error.bind(console),
    debug: typeof injectedLogger.debug === 'function' ? injectedLogger.debug.bind(injectedLogger) : () => {}
  };
}

module.exports = {
  DefaultConsoleLogger,
  createSafeLogger
};
