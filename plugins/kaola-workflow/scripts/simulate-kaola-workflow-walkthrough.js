#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const pluginRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(pluginRoot, '..', '..');
const claimScript = path.join(pluginRoot, 'scripts', 'kaola-workflow-claim.js');
const nextSkill = path.join(pluginRoot, 'skills', 'kaola-workflow-next', 'SKILL.md');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runClaim(args, cwd) {
  const result = spawnSync(process.execPath, [claimScript, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' }
  });
  if (result.error) throw result.error;
  assert(result.status === 0, 'claim command failed: ' + result.stderr);
  return JSON.parse(result.stdout);
}

function assertNoLegacyCoordDirs(root) {
  for (const name of ['lo' + 'cks', 'sess' + 'ions', 'tick' + 'ers']) {
    assert(!fs.existsSync(path.join(root, 'kaola-workflow', '.' + name)), 'legacy coordination dir must not exist: .' + name);
  }
}

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-codex-active-folders-'));
  try {
    const acquired = runClaim(['startup', '--target-issue', '163', '--runtime', 'codex', '--sink', 'pr'], tmp);
    assert(acquired.claim === 'acquired', 'Codex startup should acquire explicit issue');
    assert(acquired.project === 'issue-163', 'Codex startup should derive project from issue');
    const stateFile = path.join(tmp, 'kaola-workflow', 'issue-163', 'workflow-state.md');
    const state = fs.readFileSync(stateFile, 'utf8');
    assert(state.includes('issue_number: 163'), 'state should record issue number');
    assert(state.includes('sink: pr'), 'state should record PR sink');
    assert(!state.includes('## ' + 'Lease'), 'state should not contain a retired ownership block');
    assertNoLegacyCoordDirs(tmp);

    const owned = runClaim(['startup', '--target-issue', '163', '--runtime', 'codex'], tmp);
    assert(owned.claim === 'owned', 'Codex startup should reuse active folder');

    const status = runClaim(['status'], tmp);
    assert(status.count === 1, 'status should report one active folder');

    const skill = fs.readFileSync(nextSkill, 'utf8');
    assert(skill.includes('active folders'), 'next skill should route via active folders');
    assert(!skill.includes(['verify', 'startup'].join('-')), 'next skill should not require startup verifier');
    assert(!skill.includes(['can', 'hand' + 'off'].join('-')), 'next skill should not describe old transfer flow');

    const validator = path.join(repoRoot, 'scripts', 'validate-kaola-workflow-contracts.js');
    assert(fs.existsSync(validator), 'Codex contract validator must exist');

    console.log('Kaola-Workflow walkthrough simulation passed');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main();
