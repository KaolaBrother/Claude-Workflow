# Code Explorer Output — Issue #105

## Affected Area: Phase 6 Finalize / Merge Closure Logic

### `scripts/kaola-workflow-claim.js`

| Function | Lines | Role |
|---|---|---|
| `archiveProjectDir(root, project, statusValue, suffix)` | 410–438 | Core archive: writes `status: closed` + `step: complete`, does `fs.renameSync(src, dest)` into `kaola-workflow/archive/`. Detects linked worktree and cleans up main-repo copy (lines 429–437). |
| `cmdFinalize()` | 441–452 | Subcommand entry for `finalize`: calls `archiveProjectDir(root, project, 'closed')`, removes worktree (unless `--keep-worktree`), calls `clearAdvisoryClaim`. |
| `cmdRelease()` | 460–470 | Calls `archiveProjectDir(root, project, 'abandoned', '.discarded-...')`. |
| `cmdWatchPr()` | 563–588 | On PR MERGED: calls `archiveProjectDir`. Used for `sink: pr` path. |
| `cmdWorktreeFinalize()` | 531–545 | Copies artifacts from main worktree into linked worktree, then does `git add` + `git commit` in linked worktree. Does NOT call `archiveProjectDir`. |
| `writeState(root, data)` | 194–237 | Writes initial `workflow-state.md`; writes `workflow_path: fast` and `phase: fast` when `isFast` (line 196–206). |

### `scripts/kaola-workflow-sink-merge.js`

| Function | Lines | Role |
|---|---|---|
| `main()` | 194–268 | Removes worktree (Step 0), then fetch/checkout/rebase/FF-merge/push/close-issue/delete-branch. **No archive call**. No awareness of `kaola-workflow/` folder state. |

### `commands/kaola-workflow-phase6.md`

| Section | Lines | Role |
|---|---|---|
| Step 8b "Finalize (Archive + Status Close)" | 489–523 | Prescribes `cmdFinalize --keep-worktree` runs BEFORE Step 8 (commit). Order: 8a artifact mirror → 8b cmdFinalize → 8 git commit → 9 sink-merge. |
| Step 8b guard | 491 | "This step runs only when `sink: merge`." For `sink: pr`, archival deferred to `watch-pr`. |
| Prerequisite check | 14–25 | If `workflow_path: fast`: gate on `fast-summary.md` status PASSED. If `workflow_path: full`: gate on `phase5-review.md`. Only fast-path conditional. All other steps identical. |

---

## Archive Logic: Fast-Path vs Full-Path

Archive is **triggered identically** in both paths — by `cmdFinalize` in Phase 6 Step 8b, which calls `archiveProjectDir`. No code branch treats `workflow_path: fast` differently for archival.

Archive destination construction (`kaola-workflow-claim.js:424–428`):
```js
const archiveBase = path.join(root, 'kaola-workflow', 'archive');
fs.mkdirSync(archiveBase, { recursive: true });
let dest = path.join(archiveBase, project + (suffix || ''));
if (fs.existsSync(dest)) dest += '.archived-' + new Date().toISOString().replace(/[:.]/g, '-');
fs.renameSync(src, dest);
```

**Root cause for #100/#101**: The agent wrote `Archive: Pending cmdFinalize after push` in the summary — inverting the required order (finalize must run BEFORE commit, not after). No code gate prevents `git commit` from proceeding with a live folder still staged.

---

## Validation / Guard Gaps

**`hooks/kaola-workflow-pre-commit.sh` (lines 30–48)**:
- Collects staged files matching `^kaola-workflow/`
- Excludes `kaola-workflow/archive/` (line 32) and `kaola-workflow/.roadmap/` (line 33)
- Blocks only if `PROJECT_COUNT > 1` (more than one live project staged at once)
- **Critical gap**: Does NOT block staging a live `kaola-workflow/{project}/` folder alone. A single `kaola-workflow/issue-N/` with `status: active` passes silently.

**`sink-merge.js`**: No check for folder archive state before merging.

**Phase 6 Step 8b ordering**: Prose instruction only. No shell guard or script assertion prevents `git commit` with live folder present.

---

## Test Structure

**`scripts/simulate-workflow-walkthrough.js`**

Test helpers:
- `runNode(script, args, cwd, extraEnv)` — synchronous, `{ status, stdout, stderr }`, runs with `KAOLA_WORKFLOW_OFFLINE=1`
- `json(result)` — asserts `status === 0`, parses `result.stdout`
- `runClaimOnline(args, cwd, binDir, extraEnv)` — spawns with custom `PATH` containing a `gh` shim
- `runClaimOnlineLastJson(...)` — parses the last JSON line (for `worktree-finalize` which emits git progress)
- `assert(condition, message)` — throws `Error(message)` on failure (line 17–19)

**Fast-path coverage (only one test)**:

| Test | Lines | Coverage |
|---|---|---|
| `testFastStartupState` | 461–474 | Verifies `KAOLA_PATH=fast` writes `workflow_path: fast`, `phase: fast`, correct `next_command`/`next_skill`. Does NOT test Phase 6 or archival. |

**Full-path E2E tests covering archive**:

| Test | Lines | Coverage |
|---|---|---|
| `testE2EGitHubMergeFullChain` | 1014–1084 | startup → worktree-finalize → `finalize --keep-worktree` → sink-merge; asserts archive exists and main is clean |
| `testE2EGitHubPrFullChain` | 1086–1164 | startup → worktree-finalize → sink-pr → watch-pr MERGED; asserts archive exists |
| `testParallelIssueIndependence` | 1166–1258 | Two issues in parallel; asserts second is untouched when first finalizes |
| `testFinalizeFromLinkedWorktreeCleansMainCopy` | 631–678 | Directly tests `archiveProjectDir` cleanup of main worktree copy |
| `testFinalizeFromMainRootNoSpuriousRemoval` | 680–709 | Verifies no spurious archive deletion when run from main root |

**Gap**: No `testFastE2EMergeFullChain` or equivalent test that runs `KAOLA_PATH=fast` through startup → fast-path → `worktree-finalize` → `finalize --keep-worktree` → sink-merge and asserts live folder is archived before commit lands on main.

---

## Naming / Conventions

**Archive operations**:
- `archiveProjectDir(root, project, statusValue, suffix)` — single archive function for all paths
- Status values: `'closed'` (finalize, watch-pr MERGED), `'abandoned'` (release/discard, watch-pr CLOSED)

**Env vars**:

| Variable | Location | Effect |
|---|---|---|
| `KAOLA_PATH` | `kaola-workflow-claim.js:332` | Sets `workflow_path` in `workflow-state.md` at claim time; `'fast'` triggers fast-path state |
| `KAOLA_SINK` | `kaola-workflow-claim.js:330` | Sets `sink` field; default `'merge'`; `'pr'` disables Step 8b cmdFinalize |
| `KAOLA_WORKFLOW_OFFLINE` | Throughout | `'1'` skips all `gh`/git-push/fetch calls |
| `KAOLA_WORKFLOW_FORCE_FF_FAIL` | `kaola-workflow-sink-merge.js:9` | Test-only; forces FF merge failures |
| `KAOLA_WORKFLOW_FORCE_MERGE_IMPOSSIBLE` | `kaola-workflow-sink-merge.js:10` | Test-only; triggers exit-3 merge-impossible path |

**`workflow_path` values**: `'fast'` or `'full'` (default when absent).

---

## Key Files

| File | Role | Key Lines |
|---|---|---|
| `scripts/kaola-workflow-claim.js` | `archiveProjectDir` (410–438), `cmdFinalize` (441–452), `writeState` (194–237) | Critical |
| `scripts/kaola-workflow-sink-merge.js` | FF merge, no archive logic | Important — confirms no archive enforcement |
| `commands/kaola-workflow-phase6.md` | Step 8b ordering (489–523), fast prereq fork (14–25) | Critical |
| `commands/kaola-workflow-fast.md` | Routes to Phase 6 after PASSED (137–143) | Medium |
| `hooks/kaola-workflow-pre-commit.sh` | Multi-project guard (30–48); live-folder gap is here | High |
| `scripts/simulate-workflow-walkthrough.js` | `testFastStartupState` (461–474); no fast E2E chain | Critical |
