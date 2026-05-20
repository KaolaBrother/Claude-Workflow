#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..');

function run(script) {
  execFileSync(process.execPath, [path.join(root, 'plugins/kaola-workflow-gitea/scripts', script)], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe'
  });
}

run('validate-kaola-workflow-gitea-contracts.js');
run('test-gitea-workflow-scripts.js');
run('test-gitea-sinks.js');

console.log('Gitea Codex workflow walkthrough simulation passed');
