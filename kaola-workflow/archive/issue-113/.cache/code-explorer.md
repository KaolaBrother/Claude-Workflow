# Code Explorer Output — issue-113

## Script 1: kaola-workflow-claim.js (639 LOC)

### ghExec calls

| Call site | Args | Purpose | Returns |
|-----------|------|---------|---------|
| `listOpenIssues` | `['issue', 'list', '--state', 'open', '--limit', '100', '--json', 'number,title,labels,updatedAt,url']` | Fetch all open issues | JSON array with number, title, labels[], updatedAt, url |
| `postAdvisoryClaim` (label ensure) | `['label', 'create', 'workflow:in-progress', '--color', 'f9d0c4', '--description', '...']` | Ensure claim label exists | swallowed |
| `postAdvisoryClaim` (add label) | `['issue', 'edit', '<N>', '--add-label', 'workflow:in-progress']` | Attach claim label | swallowed |
| `postAdvisoryClaim` (comment) | `['issue', 'comment', '<N>', '--body', '<!-- kw:claim project=... -->...']` | Post advisory claim comment | swallowed |
| `clearAdvisoryClaim` (remove label) | `['issue', 'edit', '<N>', '--remove-label', 'workflow:in-progress']` | Remove claim label | swallowed |
| `clearAdvisoryClaim` (comment) | `['issue', 'comment', '<N>', '--body', 'Kaola-Workflow advisory claim cleared: ...']` | Post release comment | swallowed |
| `cmdWatchPr` | `['pr', 'view', '<pr_url>', '--json', 'state,number']` | Poll PR state | JSON { state, number } |

### Key patterns
- All claim/clear calls fire-and-forget in try/catch
- OFFLINE guard: `if (OFFLINE) return '';`
- `project` required for API calls; GitHub gets it from cwd; Gitea needs `discoverProject()`

### Exported functions
```js
module.exports = {
  archiveProjectDir, buildBranchName, claimExplicitTarget, claimProject,
  getCoordRoot, projectNameForIssue, provisionWorktree, readActiveFolders,
  readPriorityConfig, removeWorktree, worktreePathFor
};
```

---

## Script 2: kaola-workflow-classifier.js (387 LOC)

### ghExec calls

| Call site | Args | Purpose | Returns |
|-----------|------|---------|---------|
| `getRepoOwnerName` | `['repo', 'view', '--json', 'owner,name']` | Detect owner/name for API | JSON { owner: { login }, name } |
| `issueHasRemoteClaimComment` | `['api', 'repos/<owner>/<name>/issues/<N>/comments']` | Fetch comments for kw:claim marker | JSON array with body, updated_at |
| `checkDependsOn` | `['issue', 'view', '<depN>', '--json', 'state,closedAt']` | Check dependency issue closed | JSON { state, closedAt } |
| `cmdClassify` | `['issue', 'view', '<N>', '--json', 'number,title,body,labels,state']` | Fetch full issue for classification | JSON { number, title, body, labels[], state } |

### JSON output schema (stdout)
```json
{ "verdict": "green"|"yellow"|"red"|"blocked"|"owned", "reasoning": "..." }
```
Exit 2 = already claimed locally (no stdout).

### No module.exports — CLI only.

---

## Script 3: kaola-workflow-roadmap.js (311 LOC)

- **Zero ghExec calls** — filesystem-only, reads `.roadmap/issue-*.md`
- Subcommands: generate, migrate, validate, init-issue, project-name
- No module.exports — CLI only
- Port: copy as-is, no forge adaptation needed

---

## Script 4: kaola-workflow-active-folders.js (124 LOC)

### ghExec calls

| Call site | Args | Purpose | Returns |
|-----------|------|---------|---------|
| `issueIsClosed` | `['issue', 'view', '<N>', '--json', 'state']` | Check if issue closed | JSON { state } — 'closed' = closed |

### Exported functions
```js
module.exports = { field, getRoot, isSafeName, issueIsClosed, readActiveFolders };
```

`readActiveFolders` returns: project, project_dir, state_file, status, issue_number, phase, next_command, branch, worktree_path, sink, pr_url, pr_number.

---

## Script 5: kaola-workflow-compact-context.js (112 LOC)

- **Zero ghExec calls** — reads workflow-state.md from filesystem
- Hook script: reads JSON { cwd } from stdin, emits compact resume text
- No module.exports — CLI only
- Port: copy as-is, no forge adaptation needed

---

## Script 6: kaola-workflow-repair-state.js (558 LOC)

- **Zero ghExec calls** — reads local phase artifact files
- Reads phase1-research.md through phase6-summary.md, writes corrected workflow-state.md
- Exported functions: complianceRows, delegationPolicyCompliance, reconstruct, stateContent, unresolvedCompliance
- Port: copy as-is, no forge adaptation needed

---

## Gitea Forge Adapter: kaola-gitea-forge.js

Available functions:
```js
teaExec(args, opts?) → string
discoverProject(opts?) → { owner, name, full_name, html_url }
listIssues(opts?) → normalizedIssue[]
viewIssue(issueNum, opts?) → normalizedIssue
updateIssueLabels(project, issueNum, opts?) → {}
closeIssue(issueNum, opts?) → normalizedIssue|null
createIssueComment(project, issueNum, body, opts?) → { id, ... }
listIssueComments(project, issueNum, opts?) → raw[]
createPullRequest(opts?) → normalizedPR
viewPullRequest(prNumber, opts?) → normalizedPR
listPullRequests(opts?) → normalizedPR[]
mergePullRequest(project, prNumber, opts?) → {}
ensureLabel(project, labelDef, opts?) → labelObject
CLAIM_LABEL = 'workflow:in-progress'
QUEUED_LABEL = 'workflow:queued'
```

normalizedIssue fields: number, issue_iid, id, title, body, state, labels: string[], updated_at, web_url, url

normalizedPR fields: number, pr_number, id, title, state, web_url, pr_url, source_branch, target_branch

---

## Existing Gitea Ports (already done)

| Gitea Script | Status |
|--------------|--------|
| kaola-gitea-forge.js | Complete |
| kaola-gitea-workflow-sink-merge.js | Complete (issue #112) |
| kaola-gitea-workflow-sink-pr.js | Complete (issue #112) |
| test-gitea-forge-helpers.js | Complete |
| test-gitea-sinks.js | Complete |

Scripts NOT yet ported: kaola-gitea-workflow-claim.js, kaola-gitea-workflow-classifier.js, kaola-gitea-workflow-roadmap.js, kaola-gitea-workflow-active-folders.js, kaola-gitea-workflow-compact-context.js, kaola-gitea-workflow-repair-state.js

---

## GitHub → Gitea API Mapping

| GitHub call | Gitea forge call | Notes |
|-------------|-----------------|-------|
| `gh issue list --state open --limit 100 --json ...` | `forge.listIssues({ state: 'open', perPage: 100 })` | Returns normalizedIssue[] |
| `gh issue view <N> --json state` | `forge.viewIssue(N)` | .state same values |
| `gh label create <name> --color ... --description ...` | `forge.ensureLabel(project, { name, color, description })` | Needs project obj |
| `gh issue edit <N> --add-label workflow:in-progress` | `forge.updateIssueLabels(project, N, { add: [...] })` | Needs project obj |
| `gh issue edit <N> --remove-label workflow:in-progress` | `forge.updateIssueLabels(project, N, { remove: [...] })` | Needs project obj |
| `gh issue comment <N> --body '...'` | `forge.createIssueComment(project, N, body)` | Needs project obj |
| `gh api repos/<owner>/<name>/issues/<N>/comments` | `forge.listIssueComments(project, N)` | Returns raw Gitea objects |
| `gh repo view --json owner,name` | `forge.discoverProject()` | Returns { owner, name, full_name, html_url } |
| `gh pr view <url> --json state,number` | `forge.viewPullRequest(prNumber)` | State normalized |
| `gh issue close <N>` | `forge.closeIssue(N)` | |

---

## Key Design Constraint

`project` object requirement: Gitea forge requires `{ full_name, html_url }` for label, comment, merge calls. In claim.js, `postAdvisoryClaim` and `clearAdvisoryClaim` need to call `forge.discoverProject()` (or read from workflow-state.md via `readProjectInfo` pattern from sink-merge.js).

Pattern already solved in kaola-gitea-workflow-sink-merge.js:
```js
function readProjectInfo(root, project) {
  // read full_name from workflow-state.md ## Sink block
  // fallback: forge.discoverProject()
}
```

---

## Test Patterns

- Main test: `scripts/simulate-workflow-walkthrough.js` — sets KAOLA_WORKFLOW_OFFLINE=1
- Gitea test structure: hand-rolled assert (no framework), single file per area
- New test file needed: `test-gitea-workflow-scripts.js` in plugins/kaola-workflow-gitea/scripts/
