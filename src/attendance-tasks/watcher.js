'use strict';

const { createSafeLogger } = require('../utils/logger');
const { StrategyEvaluator } = require('./strategy-evaluator');
const { PinAuthStrategy } = require('./pin-auth');
const { GeoAuthStrategy } = require('./geo-auth');
const { ScanAuthStrategy } = require('./scan-auth');

/**
 * Main polling loop that watches for active attendance tasks and triggers the appropriate strategies.
 */
class AttendanceWatcher {
  /**
   * @param {Object} agent - CampusNetworkAgent instance
   * @param {Object} options 
   */
  constructor(agent, options = {}) {
    this.agent = agent;
    this.logger = createSafeLogger(options.logger);
    this.intervalMs = (options.interval || 15) * 1000;
    
    this.strategies = {
      'PIN': new PinAuthStrategy(this.agent, this.logger),
      'GEO': new GeoAuthStrategy(this.agent, this.logger),
      'SCAN': new ScanAuthStrategy(this.agent, this.logger)
    };

    this.completedTasks = new Set();
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
    this.logger.info(`Starting attendance watcher loop (Interval: ${this.intervalMs / 1000}s)`);

    while (this.isRunning) {
      try {
        await this._poll();
      } catch (err) {
        this.logger.error(`Watcher encounter error: ${err.message}`);
      }
      
      if (this.isRunning) {
        await new Promise(resolve => setTimeout(resolve, this.intervalMs));
      }
    }
  }

  stop() {
    this.isRunning = false;
    this.logger.info('Stopping attendance watcher loop.');
  }

  async _poll() {
    const data = await this.agent.getActiveTasks();
    const tasks = data.student_rollcalls || data.rollcalls || [];

    if (tasks.length === 0) {
      // Idle state
      process.stdout.write('.'); 
      return;
    }

    // Newline to break from idle dots
    console.log('');

    for (const task of tasks) {
      if (this.completedTasks.has(task.id)) {
        continue; // Already handled
      }

      const type = StrategyEvaluator.determineTaskType(task);
      if (!type) {
        this.logger.warn(`Unrecognized task type for ID: ${task.id}. Ignoring.`);
        continue;
      }

      if (!StrategyEvaluator.isGlobalThresholdMet(task)) {
        this.logger.info(`Task [${type}] ${task.id} detected, but global attendance threshold not met. Waiting.`);
        continue;
      }

      this.logger.info(`Dispatching task [${type}] ${task.id} to handler...`);
      
      const strategy = this.strategies[type];
      const result = await strategy.execute(task.id, task);

      if (result.status === 'success') {
        this.logger.info(`Task [${type}] ${task.id} completed successfully. Message: ${result.message}`);
        this.completedTasks.add(task.id);
      } else {
        this.logger.warn(`Task [${type}] ${task.id} failed. Message: ${result.message}`);
      }
    }
  }
}

module.exports = {
  AttendanceWatcher
};
