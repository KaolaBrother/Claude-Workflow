# Code Explorer Cache — issue-32

## Entry Points

- Gap 1 (doc-updater path): `commands/kaola-workflow-phase6.md` Step 3 (Claude Code path) and `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` Step 3 (Codex path) — triggered during Phase 6 when doc-updater agent is invoked
- Gap 2 (phase artifacts in main worktree): `scripts/kaola-workflow-claim.js` `cmdClaim()` at line 1383 — triggered at claim time, writes `workflow-state.md` to main worktree `root` rather than linked worktree
- Gap 3 (test cleanup): `scripts/simulate-workflow-walkthrough.js` lines 3994, 4010, 4018 — triggered when integration tests run claim subcommands without `cwd:` set

---

## Gap 1 — doc-updater Targets Main Worktree

**Root cause:**

In the Codex path (`SKILL.md` line 44), the heartbeat block does `cd "$KAOLA_WORKTREE_PATH" 2>/dev/null || true`, which switches CWD to the linked worktree. However, Step 3 (line 74) says "use the `doc-updater` Codex agent role when documentation changes are needed and subagents are available; otherwise update docs in the current session" — the `doc-updater` agent is launched as a subagent and does not inherit an explicit target-path instruction.

In the Claude Code path (`commands/kaola-workflow-phase6.md` Step 3, lines 275-307), there is no worktree CWD switch at all before invoking doc-updater. The agent invocation just says "invoke ECC `doc-updater` with changed files and checklist" — no path parameter, no `cd`.

**Detection signal (canonical):** Lock file at `coordRoot/kaola-workflow/.locks/{project}.lock`, field `worktree_path`. This is written at line 1380 in claim.js: `const finalLock = Object.assign({}, lockData, ..., { worktree_path: wtPath, branch })`. If `worktree_path` is non-null and the path exists on disk (`fs.existsSync`), a linked worktree is active.

**Secondary signals:** `workflow-state.md` `## Sink` block `branch:` field; `git worktree list --porcelain` confirmation; `KAOLA_WORKTREE_PATH` env var (set at claim time per `.env.example`).

**Fix location:** Both paths need fixing:
- `commands/kaola-workflow-phase6.md` Step 3: Before invoking doc-updater, resolve the lock file, read `worktree_path`, and instruct doc-updater to operate from that path (not repo root)
- `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` Step 3: The CWD switch at line 44 covers the session's own shell, but doc-updater as a subagent needs an explicit target path passed to it (e.g., `--cwd "$KAOLA_WORKTREE_PATH"` or equivalent)

---

## Gap 2 — Phase Artifacts Created in Main Worktree

**Root cause:** `scripts/kaola-workflow-claim.js` line 1383:
```javascript
const stateFile = path.join(root, 'kaola-workflow', args.project, 'workflow-state.md');
```
`root` here is the main worktree git toplevel (from `git rev-parse --show-toplevel`), not `wtPath` (the linked worktree). So `workflow-state.md` and any phase artifact directories (`phase1-research.md`, `.cache/`, etc.) all land under the main worktree's `kaola-workflow/{project}/`.

**Lock file:** Line 1380 writes the correct `worktree_path` to the lock. The lock is in `coordRoot/kaola-workflow/.locks/{project}.lock`. Lock `worktree_path` = `worktreePathFor(root, project)` = `path.join(path.dirname(root), path.basename(root) + '.kw', project)`.

**Fix location:** Phase 6 Step 8 (Commit Gate). Before staging, detect artifacts at the main-worktree path:
```bash
MAIN_ARTIFACTS="$(git rev-parse --show-toplevel)/kaola-workflow/{project}/"
LOCK_WT_PATH="$(node -e "..." .locks/{project}.lock)"  # read worktree_path from lock
```
If `LOCK_WT_PATH` is non-empty and differs from the main worktree path, copy any artifacts found under `MAIN_ARTIFACTS` into `LOCK_WT_PATH/kaola-workflow/{project}/` before `git add`.

**Both Phase 6 files need updating:**
- `commands/kaola-workflow-phase6.md` Step 8 — lines 512-531
- `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` lines 136-144 (the `git add` block after the cross-session staging guard)

---

## Gap 3 — Walkthrough Test Suite Leaves Untracked Dirs

**Sub-issue A — Missing `cwd:` on spawnSync calls.** Lines 3994, 4010, 4018 in `scripts/simulate-workflow-walkthrough.js` call `spawnSync` with no `cwd:` field. Since `claim.js` resolves `root` via `git rev-parse --show-toplevel` starting from the process CWD, these calls resolve to the live repo root and write `kaola-workflow/proj-ac3/`, `kaola-workflow/proj-ac7/`, `kaola-workflow/proj-ac8/` into the live working tree.

The correct pattern (used at line 4122) is: `{ cwd: tmp, encoding: 'utf8', env: ... }`.

Additionally, at line 4020, `KAOLA_COORD_ROOT: coordRootAc8` is set but `cwd` is still omitted — when `KAOLA_COORD_ROOT` is set, claim.js uses it for coordRoot but still resolves `root` from CWD. The env var only partially redirects the writes.

**Fix for sub-issue A:** Add `cwd: tmp` (or `cwd: coordRootAc8` as appropriate) to the spawnSync call options at lines 3994, 4010, and 4018. For the AC8 case at line 4018, add `cwd: coordRootAc8` since that test intentionally redirects coordRoot there.

**Sub-issue B — `shouldSweep` never prunes synthetic test sessions.** `shouldSweep` at line 574:
```javascript
function shouldSweep(lock) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return new Date(lock.expires).getTime() < cutoff &&
    new Date(lock.last_heartbeat).getTime() < cutoff;
}
```
Synthetic test sessions (`sess-claimed`, `sess-test`, `sess-ac3`, etc.) have freshly-written `expires` and `last_heartbeat` timestamps — they will never pass the 24h cutoff and will never be swept. This predicate cannot be modified with a parameter to detect synthetics without breaking production semantics.

**Fix for sub-issue B:** Implement a NEW separate predicate, e.g. `isSyntheticTestSession(lock)`, that identifies lock files whose `session_id` matches a known synthetic pattern (e.g., prefix `sess-` that doesn't match UUID4 format) and/or whose `worktree_path` lives under a system tmpdir. Then in `cmdSweep()` (line 1793), call this predicate in addition to `shouldSweep` to also prune test-session lock files. Do NOT change `shouldSweep`'s signature or semantics.

---

## Architecture Insights

| Pattern | Where Used |
|---|---|
| `coordRoot` vs `root` | `coordRoot` = `git rev-parse --git-common-dir` (shared across all worktrees via `.git` file); `root` = `git rev-parse --show-toplevel` (main worktree only) — all lock/session/ticker files use `coordRoot`; all workflow-state files use `root` (which is the Gap 2 bug) |
| Lock file as canonical state | `coordRoot/kaola-workflow/.locks/{project}.lock` holds `worktree_path`, `session_id`, `branch`, `expires`, `last_heartbeat` — always read this first |
| `try/finally` cleanup pattern | Epic 16 and other test epics: `mkdtempSync` + `finally { rmSync(tmp); rmSync(tmp + '.kw') }` — the `.kw` sibling dir must always be explicitly cleaned |
| `KAOLA_WORKFLOW_OFFLINE=1` | Disables GitHub API calls in tests |
| `KAOLA_COORD_ROOT` | Overrides coordRoot resolution — used in AC8 test to redirect lock file writes to a tmp dir |
| Cross-session staging guard | Checked in both `commands/kaola-workflow-phase6.md` (lines 461-510) and `SKILL.md` (lines 81-130) before any `git add` under `kaola-workflow/{project}/` |

---

## Key Files

| File | Role | Importance |
|---|---|---|
| `scripts/kaola-workflow-claim.js` | Core coordination: claim, release, heartbeat, sweep, worktree provisioning | Critical — Gap 2 root cause at line 1383; `shouldSweep` at line 574; `worktreePathFor` at line 580; `cmdSweep` at line 1793 |
| `scripts/simulate-workflow-walkthrough.js` | Integration test suite (~4349 lines), hand-rolled assert | Critical — Gap 3 root cause at lines 3994, 4010, 4018 (missing `cwd:`); correct pattern at line 4122 |
| `commands/kaola-workflow-phase6.md` | Phase 6 command for Claude Code runtime | High — Gap 1 doc-updater invocation at lines 275-307; Gap 2 commit gate at lines 512-531 |
| `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` | Phase 6 skill for Codex runtime | High — CWD switch at line 44 (`cd "$KAOLA_WORKTREE_PATH"`); doc-updater at line 74; commit gate at lines 136-144 |
| `scripts/kaola-workflow-sink-merge.js` | Sink-merge: worktree removal before branch checkout | Medium — imports `removeWorktree` from claim.js; Step 0 (lines 159-165) removes worktree |
| `.env.example` | Documents `KAOLA_WORKTREE_PATH` env var | Reference |

---

## Dependencies

**External:**
- `git worktree` (add, list --porcelain, remove, prune)
- GitHub API (via `@octokit/rest`, bypassed with `KAOLA_WORKFLOW_OFFLINE=1`)
- `node fs`, `path`, `child_process.execFileSync`, `spawnSync`

**Internal:**
- `kaola-workflow-sink-merge.js` imports `getCoordRoot`, `removeWorktree` from `kaola-workflow-claim.js`
- `kaola-workflow-session-env.js` writes identity file to `coordRoot/kaola-workflow/.runtime/<claudePid>.identity`
- Lock file data structure (lines 874-892 in claim.js): fields include `project`, `session_id`, `machine_id`, `claimed_at`, `expires`, `last_heartbeat`, `worktree_path`, `branch`, `sink`, `issue_number`, `pr_number`, `claim_comment_id`

---

## Recommendations

**Gap 1 — doc-updater path fix:**
- Read lock file `worktree_path` field before invoking doc-updater in both Phase 6 files
- In `commands/kaola-workflow-phase6.md`, add a shell block before Step 3 that resolves `KAOLA_WORKTREE_PATH` from the lock if not already set, then pass that path explicitly to doc-updater as its working context
- In `SKILL.md`, line 44 already does `cd "$KAOLA_WORKTREE_PATH"` — augment Step 3 to pass the worktree path as the doc-updater's target explicitly, not just relying on inherited CWD
- Fallback priority: (1) lock file `worktree_path` → (2) `KAOLA_WORKTREE_PATH` env var → (3) current working directory

**Gap 2 — artifact copy in commit gate:**
- Add to Phase 6 Step 8 in both files: read `worktree_path` from lock; if it differs from main worktree path and artifacts exist at main-worktree `kaola-workflow/{project}/`, `rsync` or `cp -r` them into the linked worktree before `git add`
- Do not modify `cmdClaim` itself — fixing the write location there would break the resume path (Phase 1-5 all expect `workflow-state.md` in the main worktree during those phases)

**Gap 3 — test cleanup:**
- Add `cwd: tmp` to the three `spawnSync` calls at lines 3994, 4010, and 4018
- For the AC8 case at line 4018, use `cwd: coordRootAc8`
- Add a `finally` block to the Epic 8N test block that removes any `kaola-workflow/proj-ac*/` dirs created under the live repo root
- For `shouldSweep`: implement `isSyntheticTestSession(lock)` as a new predicate in `cmdSweep` — do not change `shouldSweep`. Heuristic: `session_id` that does not match UUID4 pattern, or `worktree_path` that starts with `os.tmpdir()`
