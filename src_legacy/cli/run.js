'use strict';

const path = require('node:path');
const { loadConfig, saveConfig } = require('../config');
const { getActiveProfile } = require('../auth/account-store');
const { ensureLogin } = require('../auth/login');
const { TronClient } = require('../http/client');
const { endpointsFromProvider } = require('../http/endpoints');
const { RollcallMonitor } = require('../rollcall/monitor');

async function runMonitorCmd() {
  const baseDir = process.cwd();
  console.log(`[Boot] Starting AutoRollCall in ${baseDir}`);

  // 1. Load config
  const config = loadConfig(baseDir);
  const profile = getActiveProfile(config);
  
  if (!profile.user) {
    console.error('[Error] No default profile user found. Please configure your accounts in config.yaml.');
    process.exit(1);
  }

  // 2. Determine endpoints
  // Default to TronClass standard endpoints if no provider is configured
  const providerConfig = config.provider || {};
  const endpoints = endpointsFromProvider(providerConfig);

  // 3. Initialize HTTP Client
  const client = new TronClient({
    endpoints,
    userAgent: config.config && config.config['user-agent'] ? config.config['user-agent'][0] : undefined
  });

  // 4. Ensure Login Session
  console.log(`[Auth] Attempting login for user: ${profile.user} ...`);
  try {
    const loggedIn = await ensureLogin(client, config, baseDir);
    if (!loggedIn) {
      console.error('[Error] Login failed.');
      process.exit(1);
    }
    console.log(`[Auth] Login successful. Session verified.`);
  } catch (err) {
    console.error(`[Error] Login error: ${err.message}`);
    process.exit(1);
  }

  // 5. Start Monitor Loop
  console.log(`[Monitor] Starting polling loop. Waiting for rollcalls...`);
  const monitor = new RollcallMonitor(client, {
    pollInterval: config.monitor && config.monitor.interval ? config.monitor.interval * 1000 : 15000,
    onProgress: (event) => {
      switch (event.type) {
        case 'poll':
          if (event.status === 'not_call') {
            process.stdout.write('.');
          } else {
            console.log(`\n[Rollcall Detected] Type: ${event.rollcallType}, ID: ${event.rollcallId}, Status: ${event.status}`);
          }
          break;
        case 'submit_start':
          console.log(`[Submit] Starting submission for ${event.rollcallType} (ID: ${event.rollcallId})...`);
          break;
        case 'submit_result':
          console.log(`[Submit] Result: ${event.result.status}. ${event.result.message}`);
          break;
        case 'waiting_qr':
          console.log(`[QR] ${event.message} (Please provide QR payload manually to the system)`);
          break;
        case 'fatal':
          console.error(`[Fatal] Monitor stopped: ${event.error.message}`);
          break;
        case 'error':
          console.error(`[Error] Monitor encountered an error: ${event.error.message}`);
          break;
        case 'idle':
          console.log(`[Idle] ${event.message}`);
          break;
      }
    }
  });

  // Handle graceful shutdown
  const shutdown = () => {
    console.log('\n[System] Shutting down monitor...');
    monitor.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Run indefinitely
  await monitor.run();
}

module.exports = {
  runMonitorCmd,
};
