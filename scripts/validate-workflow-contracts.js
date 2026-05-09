#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(file, needle) {
  const content = read(file);
  assert(content.includes(needle), `${file} must include: ${needle}`);
}

const phaseCommands = [
  'commands/claude-workflow-phase1.md',
  'commands/claude-workflow-phase2.md',
  'commands/claude-workflow-phase3.md',
  'commands/claude-workflow-phase4.md',
  'commands/claude-workflow-phase5.md',
  'commands/claude-workflow-phase6.md',
];

for (const file of phaseCommands) {
  assert(exists(file), `${file} is missing`);
  assertIncludes(file, 'workflow-state.md');
  assertIncludes(file, 'Required Agent Compliance');
}

assertIncludes('commands/claude-workflow.md', 'thin router');
assertIncludes('commands/claude-workflow.md', 'next_command');
assertIncludes('commands/claude-workflow.md', '/claude-workflow-phase4');

assertIncludes('commands/claude-workflow-phase1.md', 'temporary Phase 1 capture');
assertIncludes('commands/claude-workflow-phase2.md', '.cache/advisor-ideation.md');
assertIncludes('commands/claude-workflow-phase3.md', '.cache/advisor-plan.md');
assertIncludes('commands/claude-workflow-phase3.md', 'architect-revision');

assertIncludes('commands/claude-workflow-phase4.md', 'NO INLINE PHASE 4 FIXES');
assertIncludes('commands/claude-workflow-phase4.md', 'Failure Routing Ledger');
assertIncludes('commands/claude-workflow-phase4.md', 'inline_emergency_fallback_authorized: no');

assertIncludes('commands/claude-workflow-phase5.md', 'review only; do not edit files');
assertIncludes('commands/claude-workflow-phase6.md', 'Final Validation Failure Ledger');
assertIncludes('commands/claude-workflow-phase6.md', 'Do not repair inline');

assert(exists('hooks/hooks.json'), 'hooks/hooks.json is missing');
assert(exists('scripts/claude-workflow-compact-context.js'), 'compact context hook script is missing');
assert(exists('scripts/simulate-workflow-walkthrough.js'), 'workflow walkthrough simulation script is missing');
assertIncludes('hooks/hooks.json', 'SessionStart');
assertIncludes('hooks/hooks.json', 'compact');
assertIncludes('hooks/hooks.json', 'claude-workflow-compact-context.js');

const pluginJson = JSON.parse(read('.claude-plugin/plugin.json'));
assert(!Object.prototype.hasOwnProperty.call(pluginJson, 'hooks'), 'plugin.json must not declare hooks/hooks.json');

const marketplaceJson = JSON.parse(read('.claude-plugin/marketplace.json'));
assert(marketplaceJson.name === 'kaolabrother-claude-workflow', 'marketplace name must stay stable for install commands');
assert(Array.isArray(marketplaceJson.plugins), 'marketplace.json must define plugins');
const workflowPlugin = marketplaceJson.plugins.find(plugin => plugin.name === 'claude-workflow');
assert(workflowPlugin, 'marketplace.json must list claude-workflow');
assert(workflowPlugin.source === './', 'claude-workflow marketplace source must point at the repo root plugin');

const packageJson = JSON.parse(read('package.json'));
assert(Array.isArray(packageJson.files) && packageJson.files.includes('hooks/'), 'package.json files must include hooks/');
assert(Array.isArray(packageJson.files) && packageJson.files.includes('scripts/'), 'package.json files must include scripts/');

const routerLines = read('commands/claude-workflow.md').split(/\r?\n/).length;
assert(routerLines <= 220, `commands/claude-workflow.md must remain a thin router; found ${routerLines} lines`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-workflow-contract-'));
try {
  const stateDir = path.join(tmp, 'claude-workflow', 'demo');
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, 'workflow-state.md'), [
    '# Claude Workflow State',
    '',
    '## Project',
    'name: demo',
    'status: active',
    '',
    '## Current Position',
    'phase: 4',
    'step: route-failure',
    'next_command: /claude-workflow-phase4 demo',
    '',
    '## Ownership Rules',
    'inline_emergency_fallback_authorized: no',
    ''
  ].join('\n'));

  const output = execFileSync(process.execPath, [path.join(root, 'scripts/claude-workflow-compact-context.js')], {
    cwd: tmp,
    encoding: 'utf8'
  });

  assert(output.includes('/claude-workflow-phase4 demo'), 'compact hook output must include next command');
  assert(output.includes('do not repair inline'), 'compact hook output must include inline repair guardrail');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('Workflow contract validation passed');
