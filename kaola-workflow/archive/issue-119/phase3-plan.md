# Phase 3 - Plan: issue-119

## Blueprint

### Files to Create
| File | Purpose | Key Interfaces |
|------|---------|----------------|
| none | — | — |

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-pr.js` | Add OFFLINE constant; offline early-return in `ensurePullRequest`; gate `--merge` in `main()` | Gitea sink crashes on `assert(pr && pr.pr_number)` when offline |
| `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js` | Add OFFLINE constant; offline early-return in `ensureMergeRequest`; gate `--merge` in `main()` | GitLab sink same crash; forge exec guards return `''` not a valid MR object |
| `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js` | Append offline subprocess test (Test 19) | Verify OFFLINE=1 path exits 0, writes placeholders, commits |
| `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js` | Append offline subprocess test | Verify same for MR sink |

### Build Sequence
1. Add OFFLINE constant to Gitea sink (no deps)
2. Add offline early-return + `--merge` gate to Gitea sink (depends on step 1)
3. Add OFFLINE constant to GitLab sink (parallel with steps 1-2)
4. Add offline early-return + `--merge` gate to GitLab sink (depends on step 3)
5. Append Gitea offline subprocess test (depends on steps 1-2)
6. Append GitLab offline subprocess test (depends on steps 3-4)
7. Validate both test suites + walkthrough

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | 1, 3 | disjoint files (gitea vs gitlab sink) |
| B | 2, 4 | disjoint files, each depends on its group-A task |
| C | 5, 6 | disjoint files, each depends on its group-B task |

### External Dependencies
- No new packages. Uses Node.js builtins already imported: `path`, `fs`, `spawnSync` (`child_process`), `execFileSync`.

## Task List

### Task 1: Gitea sink OFFLINE constant
- File: `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-pr.js`
- Write Set: above file only
- Depends On: none
- Parallel Group: A
- Action: MODIFY
- Implement: After the require block (after last `require(...)` line, ~line 8), insert:
  ```js
  const OFFLINE = process.env.KAOLA_WORKFLOW_OFFLINE === '1';
  ```
- Mirror: `scripts/kaola-workflow-sink-pr.js:7` (GitHub reference)
- Validate: `node --check plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-pr.js`

### Task 2: Gitea sink offline early-return + --merge gate
- File: `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-pr.js`
- Write Set: above file only
- Depends On: Task 1
- Parallel Group: B (after A)
- Action: MODIFY
- Implement:
  1. Inside `ensurePullRequest`, after `const root = options.root || getRoot();` and BEFORE `const gitExec = options.gitExec || execFileSync;` and push, insert the offline block (see architect.md Task 2).
     - Calls `updateStateSinkBlock(stateFile, prUrl, prNumber, project.full_name, project.html_url)` — 5 args (confirmed V1).
     - Calls `appendSummary(summaryFile, prUrl, prNumber)` — tolerate false return (V2 confirmed creates-if-missing when dir exists).
     - Returns `{ pr: { pr_url: prUrl, pr_number: prNumber }, project }` — matches `main()` destructure.
  2. In `main()`: change `if (args.merge)` → `if (args.merge && !OFFLINE)`.
- Validate: `node --check plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-pr.js`

### Task 3: GitLab sink OFFLINE constant
- File: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js`
- Write Set: above file only
- Depends On: none
- Parallel Group: A
- Action: MODIFY
- Implement: Same as Task 1, insert after require block (~line 8):
  ```js
  const OFFLINE = process.env.KAOLA_WORKFLOW_OFFLINE === '1';
  ```
- Validate: `node --check plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js`

### Task 4: GitLab sink offline early-return + --merge gate
- File: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js`
- Write Set: above file only
- Depends On: Task 3
- Parallel Group: B
- Action: MODIFY
- Implement:
  1. Inside `ensureMergeRequest`, after `const root = options.root || getRoot();` and BEFORE `const gitExec = ...` and push, insert the offline block (see architect.md Task 4).
     - Calls `updateStateSinkBlock(stateFile, mrUrl, mrIid)` — 3 args (V3 confirmed).
     - Returns `{ mr_url: mrUrl, mr_iid: mrIid }` — matches `main()` reads of `mr.mr_iid` and `mr.mr_url || mr.web_url`.
  2. In `main()`: change `if (args.merge)` → `if (args.merge && !OFFLINE)`.
- Validate: `node --check plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js`

### Task 5: Gitea offline subprocess test
- File: `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js`
- Write Set: above file only
- Depends On: Tasks 1-2
- Parallel Group: C
- Action: MODIFY
- Implement: Append Test 19 block after the final `console.log('Gitea sink tests passed');` line. Test:
  - Creates real repo via `setupRealRepo('offline-gt-pr-test', 'test-gt-offline-pr')`
  - Spawns sink-pr subprocess with `KAOLA_WORKFLOW_OFFLINE: '1'` in env, no forge creds
  - Asserts exit 0, stdout includes `PR URL: OFFLINE_PLACEHOLDER` and `PR Number: 0`
  - Reads `workflow-state.md` — asserts `pr_url: OFFLINE_PLACEHOLDER`, `pr_number: 0`, `full_name: OFFLINE_PLACEHOLDER`, `project_html_url: OFFLINE_PLACEHOLDER`
  - Reads `phase6-summary.md` — asserts it includes `PR URL: OFFLINE_PLACEHOLDER` and `PR Number: 0`
  - Checks `git log --oneline -1` includes `chore: record PR metadata for test-gt-offline-pr`
  - (Full code in architect.md Task 5)
- Validate: `node plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js`

### Task 6: GitLab offline subprocess test
- File: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`
- Write Set: above file only
- Depends On: Tasks 3-4
- Parallel Group: C
- Action: MODIFY
- Implement: Append offline MR test block after final `console.log('GitLab sink tests passed');`. Same structure as Task 5 but:
  - Uses `setupRealRepo('offline-gl-mr-test', 'test-gl-offline-mr')`
  - Spawns sink-mr subprocess
  - Asserts `MR URL: OFFLINE_PLACEHOLDER` and `MR IID: 0`
  - Reads state — asserts `mr_url: OFFLINE_PLACEHOLDER`, `mr_iid: 0`
  - Reads summary — asserts `MR URL:` and `MR IID: 0`
  - Checks `git log --oneline -1` includes `chore: record MR metadata for test-gl-offline-mr`
  - (Full code in architect.md Task 6)
- Validate: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

## Advisor Notes
Phase 3 advisor (advisor-plan.md) verdict: Greenlight — no revision required.

Key carried concern (first task in Phase 4 before any sink edit): read `setupRealRepo` and `writeWorkflow` in both test files to confirm:
- (a) HEAD is on `main` when sink runs
- (b) Project dir + state file with Sink block exist at expected paths
- (c) Function-returned `branch` matches second arg

Nit (advisory, non-blocking): add a second `spawnSync` call per test with `--merge` in argv and assert exit 0 to cover the `!OFFLINE` guard.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | — | advisor greenlighted without gaps; no revision needed |
