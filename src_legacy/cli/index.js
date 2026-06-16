'use strict';

const { Command } = require('commander');
const { runMonitorCmd } = require('./run');

function buildProgram() {
  const program = new Command();

  program
    .name('trothu')
    .description('AutoRollCall — TronClass 校園點名系統全自動點名工具')
    .version(require('../../package.json').version);

  program
    .command('run', { isDefault: true })
    .description('啟動監控迴圈，自動等待並執行點名 (預設指令)')
    .action(async () => {
      await runMonitorCmd();
    });

  // Future commands will be added here
  
  return program;
}

module.exports = {
  buildProgram,
};
