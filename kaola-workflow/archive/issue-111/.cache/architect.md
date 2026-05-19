# Code Architect: Issue #111 — Gitea Forge Adapter Blueprint

## Files to Create

| File | Purpose |
|------|---------|
| `plugins/kaola-workflow-gitea/scripts/kaola-gitea-forge.js` | Gitea forge adapter — all CLI and REST ops via `tea` |
| `plugins/kaola-workflow-gitea/scripts/test-gitea-forge-helpers.js` | Unit tests using runner mock |

## Files to Modify
None — greenfield plugin.

## `tea api` Path Convention
`tea api` does NOT auto-prefix `/api/v1`. Every path must begin with `/api/v1/...`:
- Comments: `/api/v1/repos/{owner}/{repo}/issues/{index}/comments`
- Comment update: `/api/v1/repos/{owner}/{repo}/issues/comments/{commentId}`
- PR merge: `/api/v1/repos/{owner}/{repo}/pulls/{index}/merge`
- Labels: `/api/v1/repos/{owner}/{repo}/labels`
- Server version: `/api/v1/version`
- Repo fallback: `/api/v1/repos/{owner}/{repo}`

## Build Sequence
1. Task A — Constants, `teaExec`, pure helpers (no I/O)
2. Task B — Normalizers + `discoverProject` (depends on A)
3. Task C — Issue/comment operations (depends on A, B) — parallel with D
4. Task D — PR operations + `ensureLabel` (depends on A, B) — parallel with C
5. Task E — Unit test file (depends on A–D complete)

## Task A — Constants and `teaExec` + pure helpers

**File:** `plugins/kaola-workflow-gitea/scripts/kaola-gitea-forge.js`
**Action:** CREATE
**Dependencies:** none

```js
const OFFLINE = process.env.KAOLA_WORKFLOW_OFFLINE === '1';
const CLAIM_LABEL = 'workflow:in-progress';
const QUEUED_LABEL = 'workflow:queued';
let _versionChecked = false;

function teaExec(args, opts)
// offline: return opts.offlineStdout || ''
// injected runner: opts.execFileSync — skip version check when present
// first live call: parse `tea --version`, throw if < 0.9.2, set _versionChecked = true
// returns string (trimmed stdout)

function parseJson(raw, fallback)
function firstNumber(...values)  // first finite > 0 value
function labelsOf(raw)           // string|{name}|{title} array → string[]
function uniqueLabels(raw)       // dedup via Set
function preserveWorkflowLabels(currentLabels, nextLabels)
// re-inserts QUEUED_LABEL/CLAIM_LABEL if in current but missing from next
```

**Mirror:** GitLab lines 1-52 (replace `glab`→`tea`, `glabExec`→`teaExec`, add version check)

## Task B — Normalizers + `discoverProject`

**File:** same
**Dependencies:** Task A

```js
function normalizeState(raw)   // mirror GitLab lines 54-60 exactly

function normalizeProject(raw)
// Gitea fields: full_name ("owner/repo"), html_url, owner.login
// Returns: { owner, name, full_name, html_url }
// owner = data.owner?.login || data.full_name.split('/')[0]
// name  = data.name || data.full_name.split('/')[1]
// NO project_id, NO path_with_namespace

function discoverProject(opts)
// Step 1: teaExec(['repo', 'view', '--output', 'json'], opts)
// Step 2: parseJson → if full_name present → normalizeProject
// Step 3 fallback: tea api /api/v1/repos/{owner}/{repo} (derive from git remote)

function normalizeIssue(raw)
// Returns: { number, issue_iid (alias), id, title, body, state, labels, updated_at, web_url, url }
// Gitea fields: number (not iid), html_url (not web_url), updated_at or updated

function normalizePullRequest(raw)
// Returns: { number, pr_number (alias), id, title, state, web_url, pr_url, source_branch, target_branch }
// Gitea fields: head.label (source), base.label (target)
```

**Mirror:** GitLab lines 54-119; restructure normalizeProject for Gitea shape; normalizeMergeRequest → normalizePullRequest

## Task C — Issue and comment operations

**File:** same
**Dependencies:** Tasks A, B
**Parallel with:** Task D

```js
function listIssues(opts)
// ['issues', 'list', '--output', 'json', '--limit', perPage||100]
// if opts.state: push '--state', opts.state

function viewIssue(issueNum, opts)
// ['issues', 'view', String(issueNum), '--output', 'json']

function updateIssueLabels(project, issueNum, opts)
// opts: { add: string[], remove: string[] }
// ['issues', 'edit', String(issueNum)]
// add: push '--add-labels=' + opts.add.join(',')    (= form, comma-joined)
// remove: push '--remove-labels=' + opts.remove.join(',')

function closeIssue(issueNum, opts)
// ['issues', 'close', String(issueNum)]

function createIssueComment(project, issueNum, body, opts)
// ['api', '-X', 'POST', '/api/v1/repos/'+project.full_name+'/issues/'+issueNum+'/comments', '-d', JSON.stringify({body})]

function listIssueComments(project, issueNum, opts)
// ['api', '/api/v1/repos/'+project.full_name+'/issues/'+issueNum+'/comments']

function updateIssueComment(project, issueNum, commentId, body, opts)
// ['api', '-X', 'PATCH', '/api/v1/repos/'+project.full_name+'/issues/comments/'+commentId, '-d', JSON.stringify({body})]
// NOTE: /issues/comments/{id} — no {index} in path
```

**Test mock keys (args.join(' ')):**
| Function call | Mock key |
|---------------|----------|
| `listIssues()` | `'issues list --output json --limit 100'` |
| `listIssues({perPage:50,state:'open'})` | `'issues list --output json --limit 50 --state open'` |
| `viewIssue(4)` | `'issues view 4 --output json'` |
| `updateIssueLabels(proj,4,{add:[CLAIM_LABEL],remove:[QUEUED_LABEL]})` | `'issues edit 4 --add-labels=workflow:in-progress --remove-labels=workflow:queued'` |
| `closeIssue(4)` | `'issues close 4'` |
| `createIssueComment(proj,4,'claim')` | `'api -X POST /api/v1/repos/group/project/issues/4/comments -d {"body":"claim"}'` |
| `listIssueComments(proj,4)` | `'api /api/v1/repos/group/project/issues/4/comments'` |
| `updateIssueComment(proj,4,9001,'done')` | `'api -X PATCH /api/v1/repos/group/project/issues/comments/9001 -d {"body":"done"}'` |

**Mirror:** GitLab lines 121-178; updateIssue→updateIssueLabels (= flag form); notes→REST comments

## Task D — PR operations and `ensureLabel`

**File:** same
**Dependencies:** Tasks A, B
**Parallel with:** Task C

```js
function createPullRequest(opts)
// ['pr', 'create', '--output', 'json']
// sourceBranch: push '--head', opts.sourceBranch
// targetBranch: push '--base', opts.targetBranch
// title: push '--title', opts.title
// description: push '--description', opts.description

function viewPullRequest(prNumber, opts)
// ['pr', 'view', String(prNumber), '--output', 'json']

function listPullRequests(opts)
// ['pr', 'list', '--output', 'json']

function mergePullRequest(project, prNumber, opts)
// if opts.autoMerge: checkServerVersion(opts) — throws if server < 1.17
// body: { Do: opts.squash?'squash':'merge', delete_branch_after_merge: !!opts.removeSourceBranch, merge_message_field: opts.sha||undefined }
// ['api', '-X', 'POST', '/api/v1/repos/'+project.full_name+'/pulls/'+prNumber+'/merge', '-d', JSON.stringify(body)]

function checkServerVersion(opts)
// ['api', '/api/v1/version'] → parseJson → parse major.minor
// throw if minor < 17

function ensureLabel(project, labelDef, opts)
// labelDef: { name, color, description? }
// GET /api/v1/repos/{owner}/{repo}/labels → find by name (case-insensitive)
// if found → return existing; else POST create → return new
```

**Test mock keys:**
| Function call | Mock key |
|---------------|----------|
| `discoverProject()` | `'repo view --output json'` |
| `createPullRequest({sourceBranch:'feature',targetBranch:'main',title:'Ship',description:'body'})` | `'pr create --output json --head feature --base main --title Ship --description body'` |
| `viewPullRequest(8)` | `'pr view 8 --output json'` |
| `listPullRequests()` | `'pr list --output json'` |
| `mergePullRequest(proj,9,{squash:true,removeSourceBranch:true,sha:'abc123'})` | `'api -X POST /api/v1/repos/group/project/pulls/9/merge -d {"Do":"squash","delete_branch_after_merge":true,"merge_message_field":"abc123"}'` |
| `ensureLabel(proj,{name:'workflow:in-progress',color:'#e11d48'})` GET | `'api /api/v1/repos/group/project/labels'` |
| `ensureLabel` POST (when name not found) | `'api -X POST /api/v1/repos/group/project/labels -d {"name":"workflow:in-progress","color":"#e11d48","description":""}'` |

**Mirror:** GitLab lines 180-211; mr→pr, --source-branch→--head, --target-branch→--base; mergeMergeRequest→REST POST; ensureLabel is net-new

## Task E — Unit test file

**File:** `plugins/kaola-workflow-gitea/scripts/test-gitea-forge-helpers.js`
**Dependencies:** Tasks A-D complete

Test sections in order:
1. `runner(calls, responses)` factory — verbatim from GitLab test lines 7-13
2. `normalizeIssue` assertions (number, issue_iid alias, state, labels, url)
3. `normalizePullRequest` assertions (pr_number alias, pr_url, state)
4. `normalizeProject` assertions (owner, name, full_name — no project_id check)
5. `preserveWorkflowLabels` assertion
6. `teaExec` offline short-circuit assertion
7. Runner-wired call block (calls=[], single runner instance)
8. Full mock responses map with exact keys per Tasks C and D
9. All function assertions listed in Tasks C and D
10. Binary assertion loop: `for (const call of calls) { assert.strictEqual(call[0], 'tea'); }`
11. `console.log('Gitea forge helper tests passed')`

**Validate:** `node plugins/kaola-workflow-gitea/scripts/test-gitea-forge-helpers.js`

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

## Key Differences from GitLab Adapter

| Concern | GitLab | Gitea |
|---------|--------|-------|
| Binary | `glab` | `tea` |
| Version guard | none | lazy-once ≥ 0.9.2 in `teaExec` |
| Project identity | `project_id` + `path_with_namespace` | `owner` + `name` + `full_name` |
| `projectApiRef` | present | dropped |
| Issue CLI noun | `issue` (singular) | `issues` (plural) |
| PR CLI noun | `mr` | `pr` |
| PR branch flags | `--source-branch`/`--target-branch` | `--head`/`--base` |
| Label update | `--label`/`--unlabel` (space form) | `--add-labels=`/`--remove-labels=` (= form, comma-join) |
| Comments | `glab api -f body=...` | `tea api -d JSON /api/v1/...` |
| PR merge | `glab mr merge` CLI | `tea api` REST POST |
| `ensureLabel` | absent | present (GET-then-POST) |
| Auto-merge guard | none | throws if Gitea < 1.17 |
