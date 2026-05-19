# Phase 3 - Plan: issue-113

## Blueprint

### Files to Create
| File | Purpose | Key Interfaces |
|------|---------|----------------|
| plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-active-folders.js | Discover active workflow folders for Gitea | readActiveFolders(), issueIsClosed() |
| plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-classifier.js | Classify Gitea issues (green/yellow/red/blocked/owned) | classifyIssue(), discoverProject() |
| plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-claim.js | Claim, release, finalize Gitea workflow projects | claimExplicitTarget, claimProject, getCoordRoot, listOpenIssues, partitionActiveAndDrift, watchMergeRequests, etc. |
| plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-roadmap.js | Gitea roadmap generation from open issues | refreshFromGitea(), isGeneratedRoadmap() |
| plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-compact-context.js | Compact context for Gitea workflow | compactContext() |
| plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-repair-state.js | Repair Gitea workflow-state.md | repairState() |
| plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js | Test suite for all Gitea workflow scripts | all unit tests (hand-rolled assert) |

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js | Line 9: require → ./kaola-gitea-workflow-claim | Remove broken cross-plugin import |
| plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-pr.js | Line 8: require → ./kaola-gitea-workflow-claim | Remove broken cross-plugin import |

### Build Sequence
1. kaola-gitea-workflow-active-folders.js — no internal deps
2. kaola-gitea-workflow-classifier.js — imports active-folders
3. kaola-gitea-workflow-claim.js — imports active-folders + classifier (direct require)
4. kaola-gitea-workflow-roadmap.js — independent (no forge-specific deps remaining)
5. kaola-gitea-workflow-compact-context.js — independent (pure file I/O)
6. kaola-gitea-workflow-repair-state.js — independent (pure file I/O)
7. Repoint sink-merge.js + sink-pr.js — requires claim to exist
8. test-gitea-workflow-scripts.js — covers 1-7

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | 4, 5, 6 | disjoint files, no shared imports |
| B | 7a, 7b | disjoint files (sink-merge vs sink-pr) |
| serial | 1 → 2 → 3 → A → B → 8 | dependency order |

### External Dependencies
- `require('./kaola-gitea-forge')` — already present in plugins/kaola-workflow-gitea/scripts/
- `require('./kaola-gitea-workflow-active-folders')` — created in Task 1
- `require('./kaola-gitea-workflow-classifier')` — created in Task 2

## Task List

### Task 1: Port kaola-gitea-workflow-active-folders.js
- File: plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-active-folders.js
- Test File: plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js (section: active-folders)
- Write Set: plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-active-folders.js
- Depends On: none
- Parallel Group: serial (first)
- Action: CREATE
- Template: plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-active-folders.js
- Implement:
  - Line 7: `require('./kaola-gitlab-forge')` → `require('./kaola-gitea-forge')`
  - `issueIsClosed`: `forge.viewIssue(num).state === 'closed'` — forge handles OFFLINE at teaExec level; no extra guard needed
  - Keep `firstPositiveInteger(field(content, 'issue_iid'), field(content, 'issue_number'))` — dual-read for state file compatibility
  - Emit both `issue_iid: issueIid` and `issue_number: issueIid` (alias pattern — required by internal callers: classifier uses issue_iid, sinks use issue_number)
- Validate: `KAOLA_WORKFLOW_OFFLINE=1 node plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js 2>&1 | grep -E 'active-folders|PASS|FAIL|passed|failed'`

### Task 2: Port kaola-gitea-workflow-classifier.js
- File: plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-classifier.js
- Test File: plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js (section: classifier)
- Write Set: plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-classifier.js
- Depends On: Task 1 (imports active-folders)
- Parallel Group: serial (after Task 1)
- Action: CREATE
- Template: plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-classifier.js
- Implement:
  - Line 7: `require('./kaola-gitlab-forge')` → `require('./kaola-gitea-forge')`
  - Line 8: `require('./kaola-gitlab-workflow-active-folders')` → `require('./kaola-gitea-workflow-active-folders')`
  - `SHARED_INFRA`: add `'plugins/kaola-workflow-gitea/scripts'` to the array
  - `areaForPath`: add prefix check `'plugins/kaola-workflow-gitea/'` → area `'gitea-workflow'`
  - `issueHasRemoteClaimNotes`: replace `forge.listIssueNotes` → `forge.listIssueComments`; guard uses `project.full_name` (not `project.project_id`)
  - `discoverProject()`: returns `{ full_name, html_url }` (Gitea shape — no project_id)
  - Preserve all verdicts: green, yellow, red, blocked, owned
- Validate: `KAOLA_WORKFLOW_OFFLINE=1 node plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js 2>&1 | grep -E 'classifier|PASS|FAIL|passed|failed'`

### Task 3: Port kaola-gitea-workflow-claim.js
- File: plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-claim.js
- Test File: plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js (sections: claim, watchMergeRequests, claimExplicitTarget)
- Write Set: plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-claim.js
- Depends On: Tasks 1, 2
- Parallel Group: serial (after Task 2)
- Action: CREATE
- Template: plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js
- Implement:
  - Lines 7-15 requires: swap forge/classifier/active-folders to Gitea variants
  - `buildBranchName`: prefix `'workflow/gitea-issue-'` (was `'workflow/gitlab-issue-'`)
  - Add `discoverProjectSafe()` helper after requires:
    ```js
    function discoverProjectSafe() {
      try { return forge.discoverProject(); } catch (_) { return {}; }
    }
    ```
  - `writeState`: `## Gitea` section containing `issue_number`, `full_name`, `project_html_url`
  - `claimProject`: maps `projectInfo.full_name` + `projectInfo.html_url`; calls `discoverProjectSafe()` at start
  - `postAdvisoryClaim`: `ensureLabel` first, then `updateIssueLabels`, then `createIssueComment` (all in try/catch); guard: `if (!project.full_name) return;`
  - `clearAdvisoryClaim`: `updateIssueLabels(remove)` + optional `createIssueComment`; uses `project.full_name`
  - `listOpenIssues`: `forge.listIssues({ state: 'open' })`
  - `watchMergeRequests` / `cmdWatchPr`: parse pr_url with `/\/pulls\/(\d+)/` → `forge.viewPullRequest(prNumber)`; state comparison in lowercase; explicit `if (OFFLINE) return { watched: 0, offline: true };` at top
  - `classifyIssue`: direct `require('./kaola-gitea-workflow-classifier')` call (not subprocess)
  - `cmdFinalize` / `cmdRelease`: use `full_name` + `html_url` fields from state
  - Deduplicate `getCoordRoot`: remove the second definition (around line 375 in GitLab template)
  - Drop `!OFFLINE` guard in `claimProject` (GitLab already dropped it; forge handles OFFLINE)
  - Exports: `archiveProjectDir, buildBranchName, claimExplicitTarget, claimProject, getCoordRoot, listOpenIssues, partitionActiveAndDrift, projectNameForIssue, provisionWorktree, readActiveFolders, removeWorktree, watchMergeRequests, worktreePathFor`
  - NOTE: do NOT export `readPriorityConfig` — not in GitLab template, no Gitea caller needs it
- Validate: `KAOLA_WORKFLOW_OFFLINE=1 node plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js 2>&1 | grep -E 'claim|watchMerge|claimExplicit|PASS|FAIL|passed|failed'`

### Task 4: Port kaola-gitea-workflow-roadmap.js
- File: plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-roadmap.js
- Test File: plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js (section: roadmap)
- Write Set: plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-roadmap.js
- Depends On: none (independent)
- Parallel Group: A
- Action: CREATE
- Template: plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-roadmap.js
- Implement:
  - `require('./kaola-gitlab-forge')` → `require('./kaola-gitea-forge')`
  - HEADER comment: update generated-by to `kaola-gitea-workflow-roadmap.js`
  - Rename `refreshFromGitLab` → `refreshFromGitea`; use `forge.listIssues({ state: 'open' })`
  - `isGeneratedRoadmap`: match new header string
  - `RULES_BLOCK`: update any GitLab references to Gitea
  - Remove dead `ghExec` definition if present (confirmed dead code in roadmap template)
  - Export: `refreshFromGitea` (renamed from `refreshFromGitLab`)
- Validate: `KAOLA_WORKFLOW_OFFLINE=1 node plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js 2>&1 | grep -E 'roadmap|PASS|FAIL|passed|failed'`

### Task 5: Port kaola-gitea-workflow-compact-context.js
- File: plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-compact-context.js
- Test File: plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js (section: compact-context)
- Write Set: plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-compact-context.js
- Depends On: none (independent)
- Parallel Group: A
- Action: CREATE
- Template: plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-compact-context.js
- Implement: Pure copy — no forge calls, no forge-specific strings. Only rename module header comment if present.
- Validate: `KAOLA_WORKFLOW_OFFLINE=1 node plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js 2>&1 | grep -E 'compact|PASS|FAIL|passed|failed'`

### Task 6: Port kaola-gitea-workflow-repair-state.js
- File: plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-repair-state.js
- Test File: plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js (section: repair-state)
- Write Set: plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-repair-state.js
- Depends On: none (independent)
- Parallel Group: A
- Action: CREATE
- Template: plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-repair-state.js
- Implement:
  - Line 323: `const preserved = ['GitLab', 'Sink']` → `['Gitea', 'Sink']`
  - Archive-safety guard: preserve from GitLab version (safer per issue #108)
  - All other logic is pure file I/O — copy verbatim
- Validate: `KAOLA_WORKFLOW_OFFLINE=1 node plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js 2>&1 | grep -E 'repair|PASS|FAIL|passed|failed'`

### Task 7a: Repoint kaola-gitea-workflow-sink-merge.js
- File: plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js
- Write Set: plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js
- Depends On: Task 3 (claim must exist)
- Parallel Group: B
- Action: MODIFY
- Implement:
  - Line 9: `require('../../../scripts/kaola-workflow-claim')` → `require('./kaola-gitea-workflow-claim')`
- Validate: `KAOLA_WORKFLOW_OFFLINE=1 node plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js`

### Task 7b: Repoint kaola-gitea-workflow-sink-pr.js
- File: plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-pr.js
- Write Set: plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-pr.js
- Depends On: Task 3 (claim must exist)
- Parallel Group: B
- Action: MODIFY
- Implement:
  - Line 8: `require('../../../scripts/kaola-workflow-claim')` → `require('./kaola-gitea-workflow-claim')`
- Validate: `KAOLA_WORKFLOW_OFFLINE=1 node plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js`

### Task 8: Create test-gitea-workflow-scripts.js
- File: plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js
- Write Set: plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js
- Depends On: Tasks 1-7b (tests everything)
- Parallel Group: serial (last)
- Action: CREATE
- Template: plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js
- Implement:
  - All `require()` → Gitea variants
  - `writeState` fixture: `## Gitea` block with `full_name`, `project_html_url`; branch `workflow/gitea-issue-N`
  - Roadmap tests: update header string assertions to match new `kaola-gitea-workflow-roadmap.js` header
  - `claimExplicitTarget` test: stub `ensureLabel` / `updateIssueLabels` / `createIssueComment` (not `updateIssue` / `createIssueNote`)
  - `watchMergeRequests` test: `pr_url` with `/pulls/44`; stub `viewPullRequest` (not `viewMergeRequest`)
  - `issueHasRemoteClaimNotes` test: stub `listIssueComments`; `discoverProject` returns `{ full_name, html_url }`
  - `repair-state` test: `## Gitea` section (not `## GitLab`)
  - Final log: `'Gitea workflow script tests passed'`
  - Pattern: hand-rolled assert — `function assert(cond, msg) { if (!cond) throw new Error(msg); }`
- Validate: `KAOLA_WORKFLOW_OFFLINE=1 node plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js`

## Advisor Notes

From `.cache/advisor-ideation.md` and `.cache/architect.md`:
- GitLab plugin confirmed present — all 7 template files exist. Approach A is genuine copy-rename-swap.
- OFFLINE is handled at forge teaExec level. Drop redundant guards except in cmdWatchPr.
- simulate-gitea-workflow-walkthrough.js is OUT OF SCOPE — issue #116 owns integration tests.
- Dual aliasing must be preserved: active-folders emits both `issue_iid` and `issue_number`; internal callers depend on both.
- `readPriorityConfig` is NOT exported — not in GitLab template, no Gitea caller needs it.
- `ensureLabel` must be called before `updateIssueLabels` (Gitea API requirement).
- `getCoordRoot` duplicate in GitLab template (lines 55 + 375) — deduplicate in port (remove second).
- Archive-safety guards from sink-merge/sink-fallback: preserve GitLab version (safer per issue #108).

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-ideation.md | |
| architect revisions | N/A | advisor corrections applied in phase3-plan.md directly | no full revision cycle needed — two targeted corrections |
