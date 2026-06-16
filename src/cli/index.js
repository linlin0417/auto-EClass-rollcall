'use strict';

const { Command } = require('commander');
const { ConfigurationParser } = require('../config-parser/index');
const { CampusNetworkAgent } = require('../lms-agent/agent');
const { AttendanceWatcher } = require('../attendance-tasks/watcher');
const { createSafeLogger } = require('../utils/logger');

function buildProgram() {
  const program = new Command();

  program
    .name('trothu')
    .description('AutoRollCall — 跨平台純 JS 版點名監控工具 (Anti-AGPL Architecture)')
    .version(require('../../package.json').version);

  program
    .command('run', { isDefault: true })
    .description('啟動監控迴圈，自動等待並執行點名 (預設指令)')
    .action(async () => {
      const logger = createSafeLogger();
      const baseDir = process.cwd();
      
      logger.info(`[Boot] Starting AutoRollCall NPM Version in ${baseDir}`);

      // 1. Load config
      const parser = new ConfigurationParser({ baseDir, logger });
      const config = parser.parse();
      
      const profileName = config.accounts.current;
      const profile = config.accounts.profiles[profileName];
      
      if (!profile || !profile.user) {
        logger.error('[Error] No default profile user found. Please create a config.yaml with your credentials.');
        process.exit(1);
      }

      // 2. Initialize Agent
      const agent = new CampusNetworkAgent(config.provider, { logger });

      // 3. Authenticate
      try {
        await agent.authenticate(profile.user, profile.passwd);
      } catch (err) {
        logger.error(`[Fatal] Authentication failed: ${err.message}`);
        process.exit(1);
      }

      // 4. Start Watcher
      const watcher = new AttendanceWatcher(agent, {
        logger,
        interval: config.monitor.interval
      });

      // Handle graceful shutdown
      const shutdown = () => {
        console.log('\n[System] Shutting down monitor...');
        watcher.stop();
        process.exit(0);
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

      // Start the infinite loop
      await watcher.start();
    });

  return program;
}

module.exports = {
  buildProgram
};
