# Phase 3 - Plan: issue-111

## Blueprint

### Files to Create
| File | Purpose | Key Interfaces |
|------|---------|----------------|
| `plugins/kaola-workflow-gitea/scripts/kaola-gitea-forge.js` | Gitea forge adapter — all CLI and REST ops via `tea` | 23 exports: constants, teaExec, normalizers, issue/comment/PR ops, ensureLabel |
| `plugins/kaola-workflow-gitea/scripts/test-gitea-forge-helpers.js` | Unit tests using injectable runner mock | runner factory, all function assertions, binary loop |

### Files to Modify
None — greenfield plugin.

### Build Sequence
1. Task A — Constants, `teaExec`, pure helpers (no I/O); no dependencies
2. Task B — Normalizers + `discoverProject`; depends on A
3. Task C — Issue/comment operations; depends on A, B; parallel with D
4. Task D — PR operations + `ensureLabel`; depends on A, B; parallel with C
5. Task E — Unit test file; depends on A–D complete

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| Serial | A then B | B depends on A helpers |
| Parallel | C and D | Disjoint function sets, same write file, non-overlapping lines |
| Serial | E after C+D | Tests reference all exported symbols |

### External Dependencies
None — `execFileSync` from Node `child_process` only; no `package.json` additions.

## Task List

### Task A: Constants and `teaExec` + pure helpers
- File: `plugins/kaola-workflow-gitea/scripts/kaola-gitea-forge.js`
- Test File: `plugins/kaola-workflow-gitea/scripts/test-gitea-forge-helpers.js`
- Write Set: kaola-gitea-forge.js (create)
- Depends On: none
- Parallel Group: serial
- Action: CREATE
- Implement:
  - `const OFFLINE = process.env.KAOLA_WORKFLOW_OFFLINE === '1'`
  - `const CLAIM_LABEL = 'workflow:in-progress'`
  - `const QUEUED_LABEL = 'workflow:queued'`
  - `let _versionChecked = false`
  - `teaExec(args, opts)`: if offline or opts.offline → return `opts.offlineStdout || ''`; if `opts.execFileSync` present → skip version check, call injected runner; first live call → `execFileSync('tea', ['--version'])`, parse semver, throw if `< 0.9.2`, set `_versionChecked = true`; returns trimmed stdout string
  - `parseJson(raw, fallback)`: try JSON.parse, return fallback on error
  - `firstNumber(...values)`: returns first finite value > 0
  - `labelsOf(raw)`: string|{name}|{title} array → string[]
  - `uniqueLabels(raw)`: dedup via Set
  - `preserveWorkflowLabels(currentLabels, nextLabels)`: re-inserts QUEUED_LABEL/CLAIM_LABEL if in current but missing from next
- Mirror: GitLab lines 1-52 (replace `glab`→`tea`, `glabExec`→`teaExec`, add version check)
- Validate: `node plugins/kaola-workflow-gitea/scripts/test-gitea-forge-helpers.js`

### Task B: Normalizers + `discoverProject`
- File: `plugins/kaola-workflow-gitea/scripts/kaola-gitea-forge.js`
- Test File: `plugins/kaola-workflow-gitea/scripts/test-gitea-forge-helpers.js`
- Write Set: kaola-gitea-forge.js (append)
- Depends On: Task A
- Parallel Group: serial
- Action: MODIFY
- Implement:
  - `normalizeState(raw)`: mirror GitLab lines 54-60 exactly
  - `normalizeProject(raw)`: Gitea fields `full_name` ("owner/repo"), `html_url`, `owner.login`; returns `{ owner, name, full_name, html_url }` where `owner = data.owner?.login || data.full_name.split('/')[0]`, `name = data.name || data.full_name.split('/')[1]`; NO `project_id`, NO `path_with_namespace`
  - `discoverProject(opts)`: step 1 `teaExec(['repo', 'view', '--output', 'json'], opts)`; step 2 `parseJson` → if `full_name` present → `normalizeProject`; step 3 fallback: `tea api /api/v1/repos/{owner}/{repo}`
  - `normalizeIssue(raw)`: returns `{ number, issue_iid (alias for number), id, title, body, state, labels, updated_at, web_url, url }` using Gitea fields `number` (not `iid`), `html_url` (not `web_url`), `updated_at || updated`
  - `normalizePullRequest(raw)`: returns `{ number, pr_number (alias), id, title, state, web_url, pr_url, source_branch, target_branch }` using Gitea `head.label` (source), `base.label` (target)
- Mirror: GitLab lines 54-119; restructure normalizeProject for Gitea shape; normalizeMergeRequest→normalizePullRequest
- Validate: `node plugins/kaola-workflow-gitea/scripts/test-gitea-forge-helpers.js`

### Task C: Issue and comment operations
- File: `plugins/kaola-workflow-gitea/scripts/kaola-gitea-forge.js`
- Test File: `plugins/kaola-workflow-gitea/scripts/test-gitea-forge-helpers.js`
- Write Set: kaola-gitea-forge.js (append)
- Depends On: Tasks A, B
- Parallel Group: C∥D
- Action: MODIFY
- Implement:
  - `listIssues(opts)`: `['issues', 'list', '--output', 'json', '--limit', opts.perPage||100]`; if `opts.state`: push `'--state', opts.state`
  - `viewIssue(issueNum, opts)`: `['issues', 'view', String(issueNum), '--output', 'json']`
  - `updateIssueLabels(project, issueNum, opts)`: `['issues', 'edit', String(issueNum)]`; if `opts.add`: push `'--add-labels=' + opts.add.join(',')`; if `opts.remove`: push `'--remove-labels=' + opts.remove.join(',')`; NOTE: `tea issues edit` may not emit JSON — `parseJson(raw, {})` returns `{}` if it prints human-readable; document assumption in function comment
  - `closeIssue(issueNum, opts)`: `['issues', 'close', String(issueNum)]`; NOTE: no `project` param — mirrors GitLab adapter; `tea` resolves repo from cwd
  - `createIssueComment(project, issueNum, body, opts)`: `['api', '-X', 'POST', '/api/v1/repos/'+project.full_name+'/issues/'+issueNum+'/comments', '-d', JSON.stringify({body})]`
  - `listIssueComments(project, issueNum, opts)`: `['api', '/api/v1/repos/'+project.full_name+'/issues/'+issueNum+'/comments']`
  - `updateIssueComment(project, issueNum, commentId, body, opts)`: `['api', '-X', 'PATCH', '/api/v1/repos/'+project.full_name+'/issues/comments/'+commentId, '-d', JSON.stringify({body})]`; NOTE: `/issues/comments/{id}` — no `{index}` segment in path (Gitea PATCH comment endpoint omits the issue index — `/issues/comments/{id}` is correct per docs-lookup)
- Mock keys (args.join(' ')):
  - `listIssues()` → `'issues list --output json --limit 100'`
  - `listIssues({perPage:50,state:'open'})` → `'issues list --output json --limit 50 --state open'`
  - `viewIssue(4)` → `'issues view 4 --output json'`
  - `updateIssueLabels(proj,4,{add:[CLAIM_LABEL],remove:[QUEUED_LABEL]})` → `'issues edit 4 --add-labels=workflow:in-progress --remove-labels=workflow:queued'`
  - `closeIssue(4)` → `'issues close 4'`
  - `createIssueComment(proj,4,'claim')` → `'api -X POST /api/v1/repos/group/project/issues/4/comments -d {"body":"claim"}'`
  - `listIssueComments(proj,4)` → `'api /api/v1/repos/group/project/issues/4/comments'`
  - `updateIssueComment(proj,4,9001,'done')` → `'api -X PATCH /api/v1/repos/group/project/issues/comments/9001 -d {"body":"done"}'`
- Mirror: GitLab lines 121-178
- Validate: `node plugins/kaola-workflow-gitea/scripts/test-gitea-forge-helpers.js`

### Task D: PR operations and `ensureLabel`
- File: `plugins/kaola-workflow-gitea/scripts/kaola-gitea-forge.js`
- Test File: `plugins/kaola-workflow-gitea/scripts/test-gitea-forge-helpers.js`
- Write Set: kaola-gitea-forge.js (append)
- Depends On: Tasks A, B
- Parallel Group: C∥D
- Action: MODIFY
- Implement:
  - `createPullRequest(opts)`: `['pr', 'create', '--output', 'json']`; push `'--head', opts.sourceBranch`; push `'--base', opts.targetBranch`; push `'--title', opts.title`; push `'--description', opts.description`
  - `viewPullRequest(prNumber, opts)`: `['pr', 'view', String(prNumber), '--output', 'json']`
  - `listPullRequests(opts)`: `['pr', 'list', '--output', 'json']`
  - `mergePullRequest(project, prNumber, opts)`: if `opts.autoMerge`: `checkServerVersion(opts)` — throws if server minor < 17; body must be constructed in insertion order: `mergeBody.Do = opts.squash ? 'squash' : 'merge'`, `mergeBody.delete_branch_after_merge = !!opts.removeSourceBranch`, then conditionally `if (opts.sha) mergeBody.merge_message_field = opts.sha`; `['api', '-X', 'POST', '/api/v1/repos/'+project.full_name+'/pulls/'+prNumber+'/merge', '-d', JSON.stringify(mergeBody)]`
  - `checkServerVersion(opts)`: `['api', '/api/v1/version']` → `parseJson` → parse `major.minor`; throw if `minor < 17`
  - `ensureLabel(project, labelDef, opts)`: GET `/api/v1/repos/{owner}/{repo}/labels` → find by name (case-insensitive); if found → return existing; else POST create with body constructed in order `{ name: labelDef.name, color: labelDef.color, description: labelDef.description || '' }` → return new
- Mock keys (args.join(' ')):
  - `discoverProject()` → `'repo view --output json'`
  - `createPullRequest({sourceBranch:'feature',targetBranch:'main',title:'Ship',description:'body'})` → `'pr create --output json --head feature --base main --title Ship --description body'`
  - `viewPullRequest(8)` → `'pr view 8 --output json'`
  - `listPullRequests()` → `'pr list --output json'`
  - `mergePullRequest(proj,9,{squash:true,removeSourceBranch:true,sha:'abc123'})` → `'api -X POST /api/v1/repos/group/project/pulls/9/merge -d {"Do":"squash","delete_branch_after_merge":true,"merge_message_field":"abc123"}'`
  - `ensureLabel(proj,{name:'workflow:in-progress',color:'#e11d48'})` GET → `'api /api/v1/repos/group/project/labels'`
  - `ensureLabel` POST (name not found) → `'api -X POST /api/v1/repos/group/project/labels -d {"name":"workflow:in-progress","color":"#e11d48","description":""}'`
- Mirror: GitLab lines 180-211; mr→pr, --source-branch→--head, --target-branch→--base; mergeMergeRequest→REST POST
- Validate: `node plugins/kaola-workflow-gitea/scripts/test-gitea-forge-helpers.js`

### Task E: Unit test file
- File: `plugins/kaola-workflow-gitea/scripts/test-gitea-forge-helpers.js`
- Write Set: test file (create)
- Depends On: Tasks A–D complete
- Parallel Group: serial (after C∥D)
- Action: CREATE
- Implement (in order):
  1. `runner(calls, responses)` factory — verbatim from GitLab test lines 7-13
  2. `normalizeIssue` assertions (number, issue_iid alias, state, labels, url)
  3. `normalizePullRequest` assertions (pr_number alias, pr_url, state)
  4. `normalizeProject` assertions (owner, name, full_name — no project_id check)
  5. `preserveWorkflowLabels` assertion
  6. `teaExec` offline short-circuit assertion
  7. Runner-wired call block (calls=[], single runner instance)
  8. Full mock responses map with exact keys per Tasks C and D
  9. All function assertions listed in Tasks C and D mock key tables
  10. Binary assertion loop: `for (const call of calls) { assert.strictEqual(call[0], 'tea'); }`
  11. `console.log('Gitea forge helper tests passed')`
- Mirror: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-forge-helpers.js`
- Validate: `node plugins/kaola-workflow-gitea/scripts/test-gitea-forge-helpers.js`

## Complete Export List

```js
module.exports = {
  CLAIM_LABEL, QUEUED_LABEL,
  teaExec,
  labelsOf, uniqueLabels, preserveWorkflowLabels, normalizeState,
  normalizeProject, normalizeIssue, normalizePullRequest,
  discoverProject,
  listIssues, viewIssue, updateIssueLabels, closeIssue,
  createIssueComment, listIssueComments, updateIssueComment,
  createPullRequest, viewPullRequest, listPullRequests, mergePullRequest,
  ensureLabel
};
```

Total: 23 exports (vs 20 in GitLab). Dropped: `projectApiRef`. Added: `teaExec`, `ensureLabel`.

## Advisor Notes

Advisor verdict: Approved — three fixes folded in, no architect revision needed.

1. **Fix 1 (Locking)**: `mergePullRequest` body must be constructed in insertion order: `Do`, then `delete_branch_after_merge`, then conditionally `merge_message_field`. This matches the mock key string `{"Do":"squash","delete_branch_after_merge":true,"merge_message_field":"abc123"}`.

2. **Fix 2 (Documentation)**: `updateIssueComment` uses path `/api/v1/repos/{owner}/{repo}/issues/comments/{commentId}` — no `{index}` segment. Code comment cites docs-lookup: "Gitea PATCH comment endpoint omits the issue index — /issues/comments/{id} is correct per docs-lookup".

3. **Fix 3 (Signature consistency)**: `closeIssue(issueNum, opts)` — no `project` param. Code comment: "no project param — mirrors GitLab adapter; tea resolves repo from cwd".

4. **Phase 4 note (non-blocking)**: `tea issues edit` may not emit JSON stdout — `parseJson(raw, {})` returns `{}` if it prints human-readable. Document assumption in `updateIssueLabels` comment. If test fails, switch to after-call `viewIssue(issueNum)`.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | — | Advisor found only clarifications, not blueprint gaps; no revision cycle needed |
