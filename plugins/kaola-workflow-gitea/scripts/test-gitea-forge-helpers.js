#!/usr/bin/env node
'use strict';

const assert = require('assert');
const forge = require('./kaola-gitea-forge');

function runner(calls, responses) {
  return function executable(bin, args) {
    calls.push([bin, args]);
    const key = args.join(' ');
    return Object.prototype.hasOwnProperty.call(responses, key) ? responses[key] : '';
  };
}

const issue = forge.normalizeIssue({
  id: 321,
  number: 12,
  title: 'Port helpers',
  body: 'touches: plugins/kaola-workflow-gitea/scripts',
  state: 'open',
  labels: [{ name: forge.CLAIM_LABEL }, 'workflow:queued'],
  updated_at: '2026-05-18T00:00:00Z',
  html_url: 'https://gitea.example/group/project/issues/12'
});
assert.strictEqual(issue.number, 12);
assert.strictEqual(issue.issue_iid, 12);
assert.strictEqual(issue.body, 'touches: plugins/kaola-workflow-gitea/scripts');
assert.strictEqual(issue.state, 'open');
assert.strictEqual(issue.url, 'https://gitea.example/group/project/issues/12');
assert.deepStrictEqual(issue.labels, [forge.CLAIM_LABEL, forge.QUEUED_LABEL]);
assert.deepStrictEqual(
  forge.preserveWorkflowLabels(issue.labels, ['triage']),
  ['triage', forge.QUEUED_LABEL, forge.CLAIM_LABEL]
);

const pr = forge.normalizePullRequest({
  id: 444,
  number: 9,
  title: 'PR',
  state: 'merged',
  html_url: 'https://gitea.example/group/project/pulls/9',
  head: { label: 'feature' },
  base: { label: 'main' }
});
assert.strictEqual(pr.pr_number, 9);
assert.strictEqual(pr.pr_url, 'https://gitea.example/group/project/pulls/9');
assert.strictEqual(pr.state, 'merged');
assert.strictEqual(pr.source_branch, 'feature');
assert.strictEqual(pr.target_branch, 'main');

const project = forge.normalizeProject({
  full_name: 'group/project',
  html_url: 'https://gitea.example/group/project',
  owner: { login: 'group' },
  name: 'project'
});
assert.strictEqual(project.owner, 'group');
assert.strictEqual(project.name, 'project');
assert.strictEqual(project.full_name, 'group/project');
assert.strictEqual(project.html_url, 'https://gitea.example/group/project');

assert.strictEqual(forge.teaExec(['issue', 'list'], { offline: true, offlineStdout: '[]' }), '[]');

const calls = [];
const execFileSync = runner(calls, {
  'repo view --output json': JSON.stringify({
    full_name: 'group/project',
    html_url: 'https://gitea.example/group/project',
    owner: { login: 'group' },
    name: 'project'
  }),
  'issues list --output json --limit 100': JSON.stringify([{ number: 4, state: 'open' }]),
  'issues list --output json --limit 50 --state open': JSON.stringify([{ number: 5, state: 'open' }]),
  'issues view 4 --output json': JSON.stringify({ number: 4, state: 'open', title: 'View me' }),
  'issues edit 4 --add-labels=workflow:in-progress --remove-labels=workflow:queued': '',
  'issues close 4': JSON.stringify({ number: 4, state: 'closed' }),
  'api -X POST /api/v1/repos/group/project/issues/4/comments -d {"body":"claim"}': JSON.stringify({ id: 9001, body: 'claim' }),
  'api /api/v1/repos/group/project/issues/4/comments': JSON.stringify([{ id: 9001, body: 'claim' }]),
  'api -X PATCH /api/v1/repos/group/project/issues/comments/9001 -d {"body":"done"}': JSON.stringify({ id: 9001, body: 'done' }),
  'pr create --output json --head feature --base main --title Ship --description body': JSON.stringify({
    number: 8,
    state: 'open',
    html_url: 'https://gitea.example/group/project/pulls/8'
  }),
  'pr view 8 --output json': JSON.stringify({ number: 8, state: 'open' }),
  'pr list --output json': JSON.stringify([{ number: 8, state: 'open' }]),
  'api -X POST /api/v1/repos/group/project/pulls/9/merge -d {"Do":"squash","delete_branch_after_merge":true,"merge_message_field":"abc123"}': '{}',
  'api /api/v1/repos/group/project/labels': JSON.stringify([]),
  'api -X POST /api/v1/repos/group/project/labels -d {"name":"workflow:in-progress","color":"#e11d48","description":""}': JSON.stringify({ id: 1, name: 'workflow:in-progress' })
});

assert.strictEqual(forge.discoverProject({ execFileSync }).full_name, 'group/project');
assert.strictEqual(forge.listIssues({ execFileSync })[0].issue_iid, 4);
assert.strictEqual(forge.listIssues({ execFileSync, perPage: 50, state: 'open' })[0].issue_iid, 5);
assert.strictEqual(forge.viewIssue(4, { execFileSync }).title, 'View me');
// updateIssueLabels returns {} (tea issues edit may not emit JSON)
forge.updateIssueLabels(project, 4, {
  execFileSync,
  add: [forge.CLAIM_LABEL],
  remove: [forge.QUEUED_LABEL]
});
assert.strictEqual(forge.closeIssue(4, { execFileSync }).state, 'closed');
assert.strictEqual(forge.createIssueComment(project, 4, 'claim', { execFileSync }).id, 9001);
assert.strictEqual(forge.listIssueComments(project, 4, { execFileSync })[0].id, 9001);
assert.strictEqual(forge.updateIssueComment(project, 4, 9001, 'done', { execFileSync }).body, 'done');
assert.strictEqual(
  forge.createPullRequest({
    execFileSync,
    sourceBranch: 'feature',
    targetBranch: 'main',
    title: 'Ship',
    description: 'body'
  }).pr_number,
  8
);
assert.strictEqual(forge.viewPullRequest(8, { execFileSync }).state, 'open');
assert.strictEqual(forge.listPullRequests({ execFileSync })[0].pr_number, 8);
forge.mergePullRequest(project, 9, {
  execFileSync,
  squash: true,
  removeSourceBranch: true,
  sha: 'abc123'
});
// ensureLabel: labels GET returns [], so POST is called
const newLabel = forge.ensureLabel(project, { name: 'workflow:in-progress', color: '#e11d48' }, { execFileSync });
assert.strictEqual(newLabel.name, 'workflow:in-progress');

for (const call of calls) {
  assert.strictEqual(call[0], 'tea');
}

console.log('Gitea forge helper tests passed');
