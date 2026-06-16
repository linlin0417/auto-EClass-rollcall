#!/usr/bin/env node
'use strict';

const { buildProgram } = require('../src/cli/index');

const program = buildProgram();
program.parseAsync(process.argv).catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
