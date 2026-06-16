'use strict';

const {
  TransientCooldownPolicy,
  TransientCooldownTracker,
} = require('./cooldown');

/**
 * Unified completed-rollcall tracker. Replaces the three separate dicts
 * (COMPLETED_NUMBER_ROLLCALLS, COMPLETED_RADAR_ROLLCALLS, COMPLETED_QR_ROLLCALLS)
 * from the Python version.
 */
const { CompletedRollcallTracker } = require('../rollcall/tracker');

/**
 * Centralized application state — replaces the God Module pattern.
 * Instead of 30+ module-level mutable variables in runtime_context.py,
 * all mutable state lives in a single AppState instance passed explicitly.
 */
class AppState {
  /**
   * @param {Object} [options]
   * @param {Object} [options.config] - Normalized config object
   * @param {string} [options.configPath] - Path to config.yaml
   * @param {string} [options.configAdvancedPath] - Path to config.advanced.yaml
   * @param {string} [options.baseDir] - Application base directory
   * @param {string} [options.logPath] - Log directory path
   */
  constructor(options = {}) {
    const path = require('node:path');

    // --- Paths ---
    this.baseDir = options.baseDir || process.cwd();
    this.logPath = options.logPath || path.join(this.baseDir, 'log');
    this.configPath = options.configPath || path.join(this.baseDir, 'config.yaml');
    this.configAdvancedPath = options.configAdvancedPath || path.join(this.baseDir, 'config.advanced.yaml');

    // --- Configuration ---
    this.config = options.config || {};
    this.configBootstrapped = false;
    this.configWarnings = [];
    this.bootstrapWarnings = [];

    // --- Monitor State ---
    this.pollCounter = 0;
    this.monitorStatus = {
      phase: 'logging_in',
      checkCount: 0,
      detail: '',
      rollcallStatus: '',
      nextSwitchAt: null,
      teacherState: 'off',
    };
    this.lastRollcallProgress = {};

    // --- Authentication State ---
    this.isLoggingIn = false;
    this.lastLoginResult = null;
    this.cookieCacheRestored = false;
    this.runtimeCredentials = { user: '', passwd: '' };

    // --- Teacher State ---
    this.teacherSession = null;
    this.teacherEndpoints = null;
    this.teacherReady = false;
    this.teacherCourseId = '';

    // --- Rollcall Tracking ---
    this.rollcallTracker = new CompletedRollcallTracker();
    this.unsupportedRollcallState = { rollcallId: null, status: '' };
    this.activeTeacherQrAssists = {};
    this.qrAssistAttempts = {};

    // --- Console / UI State ---
    this.consoleInteractive = null;
    this.statusLineWidth = 0;
    this.statusLinePauseDepth = 0;
    this.consoleDeferredLines = [];
    this.lastStatus = '初始化中';
    this.currentPrompt = '切換學號 (輸入 exit 離開) > ';
    this.promptInputActive = false;

    // --- Error Tracking ---
    this.lastFatalNotificationAt = 0;

    // --- Shutdown ---
    this.shutdownRequested = false;
  }

  /**
   * Reset rollcall-related state (e.g., on account switch).
   */
  resetRollcallState() {
    this.rollcallTracker.clear();
    this.unsupportedRollcallState = { rollcallId: null, status: '' };
    this.activeTeacherQrAssists = {};
    this.qrAssistAttempts = {};
    this.lastRollcallProgress = {};
  }

  /**
   * Reset teacher state.
   */
  resetTeacherState() {
    this.teacherSession = null;
    this.teacherEndpoints = null;
    this.teacherReady = false;
    this.teacherCourseId = '';
    this.monitorStatus.teacherState = 'off';
  }

  /**
   * Reset authentication state.
   */
  resetAuthState() {
    this.isLoggingIn = false;
    this.lastLoginResult = null;
    this.cookieCacheRestored = false;
  }
}

module.exports = { AppState };
