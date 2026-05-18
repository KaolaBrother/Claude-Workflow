#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

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

console.log('GitLab sink tests passed');

