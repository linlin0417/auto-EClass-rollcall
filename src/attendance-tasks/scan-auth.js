'use strict';

/**
 * Executes a QR Scan attendance check.
 * Requires physical scanning or out-of-band token sharing.
 */
class ScanAuthStrategy {
  constructor(agent, logger) {
    this.agent = agent;
    this.logger = logger;
  }

  async execute(taskId, payload) {
    this.logger.warn(`Interactive scan required for Task ID: ${taskId}.`);
    this.logger.warn(`Cannot bypass QR Scan automatically. Please scan the code provided by the teacher.`);
    
    // In a future advanced version, an out-of-band bot or OCR plugin could be injected here.
    return { status: 'failed', message: 'Manual intervention required for QR Scan.' };
  }
}

module.exports = {
  ScanAuthStrategy
};
