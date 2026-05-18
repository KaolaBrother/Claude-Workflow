#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');
const assert = require('assert');

const root = path.resolve(__dirname, '..', '..', '..');

const sinkMr = require(path.join(root, 'plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr'));
const claimScript = path.join(root, 'plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js');

function run(script) {
  execFileSync(process.execPath, [path.join(root, 'plugins/kaola-workflow-gitlab/scripts', script)], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe'
  });
}

function testFallbackGuardsAfterArchive() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-gl-fallback-archive-'));
  try {
    // Arrange: live project files
    const liveDir = path.join(tmpRoot, 'kaola-workflow', 'fb-project');
    fs.mkdirSync(liveDir, { recursive: true });
    fs.writeFileSync(path.join(liveDir, 'workflow-state.md'),
      '## Project\nname: fb-project\nstatus: active\n## Sink\nbranch: workflow/fb-project\nsink: merge\n');
    fs.writeFileSync(path.join(liveDir, 'phase6-summary.md'),
      '# Phase 6 Summary\n## Final Validation\nFinal Validation: pass\n');

    // Simulate cmdFinalize: archive the project dir
    fs.mkdirSync(path.join(tmpRoot, 'kaola-workflow', 'archive'), { recursive: true });
    const archiveDest = path.join(tmpRoot, 'kaola-workflow', 'archive', 'fb-project');
    fs.renameSync(liveDir, archiveDest);

    // Snapshot archive content before dispatch chain
    const snapshot = {};
    for (const f of fs.readdirSync(archiveDest)) {
      snapshot[f] = fs.readFileSync(path.join(archiveDest, f), 'utf8');
    }

    // Step 1: cmdSinkFallback — archived project should return updated: false
    const fbResult = spawnSync(process.execPath,
      [claimScript, 'sink-fallback', '--project', 'fb-project'],
      { cwd: tmpRoot, encoding: 'utf8', env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' } });
    assert.strictEqual(fbResult.status, 0, 'sink-fallback should exit 0 on archived project');
    const fbParsed = JSON.parse(fbResult.stdout);
    assert.strictEqual(fbParsed.updated, false, 'updated should be false');
    assert.strictEqual(fbParsed.reason, 'project archived', 'reason should be project archived');
    assert(!fs.existsSync(liveDir), 'live dir must not be recreated by sink-fallback');

    // Step 2: appendSummary on archived path — should return false, not recreate dir
    const summaryFile = path.join(tmpRoot, 'kaola-workflow', 'fb-project', 'phase6-summary.md');
    const appendResult = sinkMr.appendSummary(summaryFile, 'https://gl.example/mr/99', 99);
    assert.strictEqual(appendResult, false, 'appendSummary should return false on archived dir');
    assert(!fs.existsSync(path.join(tmpRoot, 'kaola-workflow', 'fb-project')),
      'appendSummary must not recreate live dir');

    // Step 3: verify archive is byte-for-byte unchanged
    for (const [f, originalContent] of Object.entries(snapshot)) {
      const currentContent = fs.readFileSync(path.join(archiveDest, f), 'utf8');
      assert.strictEqual(currentContent, originalContent, `archive file ${f} must be unchanged`);
    }

    console.log('testFallbackGuardsAfterArchive: PASSED');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

testFallbackGuardsAfterArchive();

run('test-gitlab-forge-helpers.js');
run('test-gitlab-workflow-scripts.js');
run('test-gitlab-sinks.js');

console.log('GitLab workflow walkthrough simulation passed');

