#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const claimScript = path.join(__dirname, 'kaola-gitlab-workflow-claim.js');

const forge = require('./kaola-gitlab-forge');
const sinkMr = require('./kaola-gitlab-workflow-sink-mr');
const sinkMerge = require('./kaola-gitlab-workflow-sink-merge');

function withForge(stubs, fn) {
  const originals = {};
  for (const key of Object.keys(stubs)) {
    originals[key] = forge[key];
    forge[key] = stubs[key];
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(stubs)) forge[key] = originals[key];
  }
}

function tempRoot(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), name));
}

function writeWorkflow(root, project, issueIid, summary) {
  const dir = path.join(root, 'kaola-workflow', project);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'workflow-state.md'), [
    '# Kaola-Workflow State',
    '',
    '## Project',
    'name: ' + project,
    'status: active',
    '',
    '## GitLab',
    'issue_iid: ' + issueIid,
    'project_id: 77',
    'path_with_namespace: group/project',
    'project_web_url: https://gitlab.example/group/project',
    '',
    '## Sink',
    'branch: workflow/gitlab-issue-' + issueIid,
    'issue_number: ' + issueIid,
    'sink: merge',
    ''
  ].join('\n'));
  fs.writeFileSync(path.join(dir, 'phase6-summary.md'), summary || '# Phase 6\n\n## Final Validation\n\n- `npm test`: pass\n');
  return dir;
}

withForge({
  listMergeRequests() {
    return [{
      mr_iid: 8,
      mr_url: 'https://gitlab.example/group/project/-/merge_requests/8',
      web_url: 'https://gitlab.example/group/project/-/merge_requests/8',
      state: 'opened',
      source_branch: 'feature'
    }];
  },
  createMergeRequest() {
    throw new Error('existing MR should be reused');
  }
}, () => {
  const root = tempRoot('kw-gl-mr-reuse-');
  writeWorkflow(root, 'sink-project', 68);
  const calls = [];
  const mr = sinkMr.ensureMergeRequest({
    branch: 'feature',
    project: 'sink-project',
    issue: 68
  }, {
    root,
    gitExec(bin, args) { calls.push([bin, args]); return ''; }
  });
  assert.strictEqual(mr.mr_iid, 8);
  assert.deepStrictEqual(calls[0], ['git', ['push', 'origin', 'feature']]);
  const state = fs.readFileSync(path.join(root, 'kaola-workflow', 'sink-project', 'workflow-state.md'), 'utf8');
  assert(state.includes('sink: mr'));
  assert(state.includes('mr_url: https://gitlab.example/group/project/-/merge_requests/8'));
  assert(state.includes('mr_iid: 8'));
  const summary = fs.readFileSync(path.join(root, 'kaola-workflow', 'sink-project', 'phase6-summary.md'), 'utf8');
  assert(summary.includes('MR URL: https://gitlab.example/group/project/-/merge_requests/8'));
  assert(summary.includes('MR IID: 8'));
});

withForge({
  listMergeRequests() { return []; },
  createMergeRequest(opts) {
    assert.strictEqual(opts.sourceBranch, 'feature-new');
    assert.strictEqual(opts.targetBranch, 'main');
    assert.strictEqual(opts.description, 'Closes #69');
    return {
      mr_iid: 9,
      mr_url: 'https://gitlab.example/group/project/-/merge_requests/9',
      web_url: 'https://gitlab.example/group/project/-/merge_requests/9',
      state: 'opened',
      source_branch: 'feature-new'
    };
  }
}, () => {
  const root = tempRoot('kw-gl-mr-create-');
  writeWorkflow(root, 'new-project', 69);
  const mr = sinkMr.ensureMergeRequest({
    branch: 'feature-new',
    project: 'new-project',
    issue: 69
  }, {
    root,
    skipPush: true
  });
  assert.strictEqual(mr.mr_iid, 9);
});

withForge({
  mergeMergeRequest(mrIid, opts) {
    assert.strictEqual(mrIid, 10);
    assert.strictEqual(opts.autoMerge, true);
    assert.strictEqual(opts.squash, true);
    assert.strictEqual(opts.removeSourceBranch, true);
    assert.strictEqual(opts.sha, 'abc123');
    return { mr_iid: 10, state: 'merged' };
  }
}, () => {
  assert.strictEqual(sinkMr.mergeMergeRequest(10, {
    autoMerge: true,
    squash: true,
    removeSourceBranch: true,
    sha: 'abc123'
  }).state, 'merged');
});

assert.strictEqual(sinkMr.routeMergeRequestState({ state: 'opened' }), 'open');
assert.strictEqual(sinkMr.routeMergeRequestState({ state: 'closed' }), 'closed');
assert.strictEqual(sinkMr.routeMergeRequestState({ state: 'merged' }), 'merged');

{
  const root = tempRoot('kw-gl-merge-gate-');
  writeWorkflow(root, 'gate-project', 70, '# Phase 6\n\n## Final Validation\n\n- `npm test`: blocked\n');
  assert.throws(() => sinkMerge.closeLinkedIssue(root, 'gate-project', 70), /Final validation evidence/);
}

withForge({
  createIssueNote(project, issueIid, body) {
    assert.strictEqual(project.project_id, 77);
    assert.strictEqual(issueIid, 71);
    assert(body.includes('final validation passed'));
    return { id: 9001 };
  },
  closeIssue(issueIid) {
    assert.strictEqual(issueIid, 71);
    return { issue_iid: 71, state: 'closed' };
  }
}, () => {
  const root = tempRoot('kw-gl-merge-close-');
  writeWorkflow(root, 'close-project', 71);
  const result = sinkMerge.runDirectMerge({
    branch: 'feature-close',
    project: 'close-project',
    issue: 71
  }, {
    root,
    skipGit: true
  });
  assert.strictEqual(result.merged, true);
  assert.strictEqual(result.close.note_id, 9001);
});

{
  // Bug 1: finalValidationPassed reads from archive fallback
  const root = tempRoot('kw-gl-fvp-archived-');
  try {
    writeWorkflow(root, 'test-proj', 99);
    fs.mkdirSync(path.join(root, 'kaola-workflow', 'archive'), { recursive: true });
    fs.renameSync(
      path.join(root, 'kaola-workflow', 'test-proj'),
      path.join(root, 'kaola-workflow', 'archive', 'test-proj')
    );
    assert.strictEqual(sinkMerge.finalValidationPassed(root, 'test-proj'), true,
      'finalValidationPassed should return true from archive fallback');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

withForge({
  createIssueNote(project, issueIid, body) {
    assert.strictEqual(project.project_id, 77);
    return { id: 9002 };
  },
  closeIssue(issueIid) {
    assert.strictEqual(issueIid, 99);
    return { issue_iid: 99, state: 'closed' };
  }
}, () => {
  // Bug 1: runDirectMerge succeeds after archive (tests both finalValidationPassed + readProjectInfo)
  const root = tempRoot('kw-gl-rdm-archived-');
  try {
    writeWorkflow(root, 'archive-proj', 99);
    fs.mkdirSync(path.join(root, 'kaola-workflow', 'archive'), { recursive: true });
    fs.renameSync(
      path.join(root, 'kaola-workflow', 'archive-proj'),
      path.join(root, 'kaola-workflow', 'archive', 'archive-proj')
    );
    const result = sinkMerge.runDirectMerge(
      { branch: 'workflow/archive-proj', project: 'archive-proj', issue: 99 },
      { root, skipGit: true }
    );
    assert.strictEqual(result.merged, true, 'runDirectMerge should succeed after archive');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

{
  // Bug 3: appendSummary returns false when parent dir doesn't exist (archived)
  const root = tempRoot('kw-gl-appsum-archived-');
  try {
    const summaryFile = path.join(root, 'kaola-workflow', 'gone-project', 'phase6-summary.md');
    // Parent dir does NOT exist
    const result = sinkMr.appendSummary(summaryFile, 'https://example/mr/1', 1);
    assert.strictEqual(result, false, 'appendSummary should return false when parent dir missing');
    assert(!fs.existsSync(path.dirname(summaryFile)),
      'appendSummary must not create the parent directory');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

{
  // Bug 3: appendSummary returns true and writes file when parent dir exists
  const root = tempRoot('kw-gl-appsum-live-');
  try {
    fs.mkdirSync(path.join(root, 'kaola-workflow', 'live-project'), { recursive: true });
    const summaryFile = path.join(root, 'kaola-workflow', 'live-project', 'phase6-summary.md');
    const result = sinkMr.appendSummary(summaryFile, 'https://example/mr/2', 2);
    assert.strictEqual(result, true, 'appendSummary should return true when dir exists');
    const content = fs.readFileSync(summaryFile, 'utf8');
    assert(content.includes('MR URL: https://example/mr/2'), 'should write MR URL');
    assert(content.includes('MR IID: 2'), 'should write MR IID');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

{
  // Bug 2: sink-fallback with no active dir → returns {updated: false, reason: 'project archived'}
  const root = tempRoot('kw-gl-sfskip-');
  try {
    // No kaola-workflow/already-archived dir created
    const result = spawnSync(process.execPath, [claimScript, 'sink-fallback', '--project', 'already-archived'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' }
    });
    assert.strictEqual(result.status, 0, 'sink-fallback should exit 0 on archived project');
    const parsed = JSON.parse(result.stdout);
    assert.strictEqual(parsed.updated, false, 'updated should be false');
    assert.strictEqual(parsed.reason, 'project archived', 'reason should be project archived');
    assert(!fs.existsSync(path.join(root, 'kaola-workflow', 'already-archived')),
      'live dir must not be created');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

{
  // Bug 2: sink-fallback with active dir present → returns {updated: true, sink: 'mr'}
  const root = tempRoot('kw-gl-sflive-');
  try {
    const projDir = path.join(root, 'kaola-workflow', 'active-project');
    fs.mkdirSync(projDir, { recursive: true });
    fs.writeFileSync(path.join(projDir, 'workflow-state.md'),
      'sink: merge\nbranch: workflow/active-project\nlast_result: phase6_complete\n');
    const result = spawnSync(process.execPath, [claimScript, 'sink-fallback', '--project', 'active-project'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' }
    });
    assert.strictEqual(result.status, 0, 'sink-fallback should exit 0 with live dir');
    const parsed = JSON.parse(result.stdout);
    assert.strictEqual(parsed.updated, true, 'updated should be true');
    assert.strictEqual(parsed.sink, 'mr', 'sink should be mr');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

{
  // Bug 2: unsafe project name → non-zero exit with 'unsafe project name' message
  const root = tempRoot('kw-gl-sfunsafe-');
  try {
    const result = spawnSync(process.execPath, [claimScript, 'sink-fallback', '--project', '../escape'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' }
    });
    assert.notStrictEqual(result.status, 0, 'expected non-zero exit for unsafe name');
    assert((result.stderr || '').includes('unsafe project name'),
      `expected unsafe-name message; got stderr: ${result.stderr}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

console.log('GitLab sink tests passed');

