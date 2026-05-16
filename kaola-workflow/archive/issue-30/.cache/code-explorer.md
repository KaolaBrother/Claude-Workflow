# Code Explorer Output — issue-30

## Entry Points

All subcommands dispatch through `main()` in `scripts/kaola-workflow-claim.js:1531–1549`.

---

## Key File:Line References

### `scripts/kaola-workflow-claim.js`

| Function | Line | Role |
|---|---|---|
| `getRoot()` | 80 | `git rev-parse --show-toplevel` — extend with `coordRoot()` |
| `locksDir(root)` | 133 | `<root>/kaola-workflow/.locks` — migrate to coordRoot |
| `sessionsDir(root)` | 134 | `<root>/kaola-workflow/.sessions` — migrate to coordRoot |
| `lockPath(root, project)` | 135 | `<locksDir>/<project>.lock` |
| `sessionPath(root, sessionId)` | 136 | `<sessionsDir>/<sessionId>.json` |
| `tickerPidPath(root, sessionId)` | 137 | `<root>/kaola-workflow/.tickers/<sessionId>.pid` — migrate to coordRoot |
| `startupReceiptPath(root, sessionId)` | 281 | `<sessionsDir>/<sessionId>.startup.json` |
| `writeLockFile(lp, lockData)` | 492 | Exclusive `wx` open + fsync — atomic write pattern |
| `writeSessionFile(root, sessionId, machineId)` | 502 | Writes session JSON |
| `writeStartupReceipt(root, sessionId, data)` | 345 | Writes startup receipt JSON |
| `buildLockData(args, machineId, now)` | 562 | Constructs lock JSON object |
| `cmdClaim()` | 930 | Full claim flow: lock + state + GitHub |
| `cmdRelease()` | 1230 | Releases lock + session file |
| `cmdHeartbeat()` | 1236 | Updates `last_heartbeat` and `expires` |
| `cmdTicker()` | 1330 | PID-file heartbeat daemon |
| `cmdSweep()` | 1365 | Evicts stale locks |
| `cmdStatus()` | 1394 | Reports lock/session consistency |
| `cmdHandoff()` | 1115 | Transfers lock to new session |
| `cmdCanHandoff()` | 1096 | Checks if handoff is allowed |
| `cmdWatchPr()` | 1477 | Polls PR state; release on MERGED + `git branch -D` |
| `cmdPatchBranch()` | 1437 | Updates `branch` in lock + state file |
| `cmdStartup()` | 849 | Syncs roadmap, sweeps, watches PRs, claims first issue |
| `cmdBootstrap()` | 800 | Simpler startup: sweep + watch-pr + claim |
| `cmdVerifyStartup()` | 325 | Validates startup receipt authorizes project |
| `releaseSession(root, sessionId, reason, options)` | 1205 | Removes lock + session file |
| `handoffDecision(root, args, existing, previous, now)` | 1072 | Handoff eligibility |
| `localOwnerLiveness(root, ownerSession, lock, now)` | 1039 | Liveness evidence array |
| `claudeProjectDirForRoot(root)` | 1028 | Maps repo root to `~/.claude/projects/<encoded>` |
| `updateSinkLease(stateFile, lockData)` | 449 | Upserts `## Sink` + `## Lease` in workflow-state.md |
| `updateLeaseInPlace(stateFile, lockData)` | 480 | Patches `expires` and `last_heartbeat` only |
| `initialStateContent(lockData)` | 415 | Creates new workflow-state.md content |
| `roadmapDir(root)` | 579 | `<root>/kaola-workflow/.roadmap` |
| `buildSinkBranchName(issueNumber, project, fallbackBranch)` | 381 | Derives branch name from issue + project |
| `runTick(tickCtx)` | 1285 | Tick loop body |

### `hooks/kaola-workflow-pre-commit.sh`

| Location | Line | Role |
|---|---|---|
| `GIT_ROOT` resolution | 4 | `git rev-parse --show-toplevel` — coordRoot bug site |
| `.locks/<project>.lock` path | 54 | `LOCK_FILE="$GIT_ROOT/kaola-workflow/.locks/${PROJECT}.lock"` — must change to git-common-dir |
| Cross-session block | 75–79 | `exit 2` if `OWNER != KAOLA_SESSION_ID` |

### `scripts/kaola-workflow-repair-state.js`

| Location | Line | Role |
|---|---|---|
| `projectOwner(workflowDir, project)` | 80 | Reads lock from `workflowDir/.locks/<project>.lock` — needs coordRoot param |
| `findWorkflowLocation(startDir)` | 42 | Walks up fs to find `kaola-workflow/` — worktree-unaware |

### `scripts/validate-workflow-contracts.js`

| Location | Line | Role |
|---|---|---|
| `.gitignore` assertions | 211–212 | Asserts `.gitignore` contains `.locks/` and `.sessions/` — becomes obsolete if paths move to `.git/` |

---

## Lock File Format

Written by `buildLockData()` at line 562:

```json
{
  "project": "...",
  "session_id": "...",
  "machine_id": "...",
  "claimed_at": "ISO",
  "expires": "ISO",
  "last_heartbeat": "ISO",
  "issue_number": null,
  "claim_comment_id": null,
  "sink": "merge",
  "pr_url": null,
  "pr_number": null,
  "runtime": "claude",
  "branch": "..."
}
```

New field for issue-30: `worktree_path` (absolute path to provisioned worktree).

## Startup Receipt Format

Written by `writeStartupReceipt()` at line 345:

```json
{
  "startup_completed": true,
  "session": "...",
  "written_at": "ISO",
  "runtime": "claude",
  "issue_sync": "ok",
  "roadmap_sync": "ok",
  "issue_source": "ok",
  "project": "...",
  "issue": 30,
  "selected_issue": 30,
  "selected_project": "...",
  "verdict": "green",
  "claim": "acquired"
}
```

New fields for issue-30: `worktree_path` in receipt when worktree is provisioned.

---

## Coordination Directory Layout (Current)

```
<worktree-root>/kaola-workflow/
  .locks/<project>.lock
  .sessions/<sessionId>.json
  .sessions/<sessionId>.startup.json
  .tickers/<sessionId>.pid
  .roadmap/issue-<N>.md
```

**Target after issue-30:**

```
<repo>/.git/kaola-workflow/        ← coordRoot
  .locks/<project>.lock
  .sessions/<sessionId>.json
  .sessions/<sessionId>.startup.json
  .tickers/<sessionId>.pid

<worktree-root>/kaola-workflow/    ← unchanged (artifacts, roadmap)
  .roadmap/issue-<N>.md
  <project>/phase*.md, workflow-state.md
```

Key function: `getCoordRoot()` using `git rev-parse --git-common-dir` (NOT `--git-dir` or `--show-toplevel`).

---

## Existing Worktree-Related Code

None. `git worktree` appears nowhere in the scripts today.

Closest: test 8M at `simulate-workflow-walkthrough.js:1864–1896` — tests `claudeProjectDirForRoot()` encoding of paths with `.` segments (`.worktree/live-owner`).

---

## Architecture Patterns to Follow

1. **Root-as-parameter threading**: every filesystem function takes `root` (and now `coordRoot`) as first parameter; called once per cmd, threaded down.
2. **`writeLockFile` atomic**: `wx` mode + `fsyncSync` — only place using `wx`. Preserve as-is.
3. **Retry with `sleepMs`**: `cmdClaim()`:948 retries `writeLockFile` up to 3 times with `sleepMs(50)` on `EEXIST`.
4. **`isSafeName()` validation**: every path component (project, session, branch) is validated before use.
5. **`OFFLINE` guard**: `const OFFLINE = process.env.KAOLA_WORKFLOW_OFFLINE === '1'` — all `ghExec` and `git push` calls must check this.
6. **Worktree cleanup order**: `git worktree remove <path>` BEFORE `git branch -D <branch>` (branch-D fails if branch is checked out in linked worktree).

---

## Error Handling Patterns

- User-facing errors: `process.stderr.write(msg + '\n')` + `process.exitCode = 2` (conflict) or `1` (no work)
- Fatal internal: `throw new Error(msg)` / `assert(cond, msg)` caught by `main()` try/catch
- GitHub API failures: swallowed with `} catch (_) {}`
- Missing files: silent `} catch (_) {}` in `readJsonFile`
- Conflict exit: `process.exitCode = 2; return;` (never `process.exit(2)`)

---

## Test Framework and Epic Case Structure

**Framework**: Hand-rolled. `assert(condition, message)` at line 10.

**Insertion point for Epic Case 15**: between lines 3217–3219, before `console.log('Workflow walkthrough simulation passed')`.

**Epic Case pattern**:
```javascript
// Epic Case 15: <description>
{
  const epicNTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kaola-workflow-epic15-'));
  try {
    execFileSync('git', ['init', '-q', '-b', 'main', epicNTmp]);
    // Setup fake gh shim if needed
    const env = { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' };
    // Test assertions with sub-test codes: Epic Case 15A, 15B, etc.
    assert(..., 'Epic Case 15A: ...');
  } finally {
    fs.rmSync(epicNTmp, { recursive: true, force: true });
  }
}
```

**Sub-test naming**: `'Epic Case 15A: ...'`, `'Epic Case 15B: ...'`, etc.

---

## Files Requiring Changes

| File | Change |
|---|---|
| `scripts/kaola-workflow-claim.js` | Add `getCoordRoot()` using `--git-common-dir`; thread `coordRoot` through `locksDir`, `sessionsDir`, `tickerPidPath`; add worktree provisioning in `cmdClaim`; add worktree removal in `releaseSession` + `cmdWatchPr` |
| `hooks/kaola-workflow-pre-commit.sh` | Replace `$GIT_ROOT/kaola-workflow/.locks/` with `$(git rev-parse --git-common-dir)/kaola-workflow/.locks/` |
| `scripts/kaola-workflow-repair-state.js` | `projectOwner()`:80 — add coordRoot parameter |
| `scripts/kaola-workflow-sink-merge.js` | `git worktree remove` before `git branch -D` |
| `scripts/validate-workflow-contracts.js:211–212` | `.gitignore` assertions become obsolete (`.git/` is already gitignored) |
| `scripts/simulate-workflow-walkthrough.js` | Add Epic Case 15 at lines 3217–3219 with ACs 1–13 |

---

## Key Env Vars

| Var | Purpose |
|---|---|
| `KAOLA_WORKFLOW_OFFLINE` | Gates all `ghExec` + `git push` calls |
| `KAOLA_SESSION_ID` | Session identity; fallbacks: `CODEX_THREAD_ID`, `CLAUDE_SESSION_ID` |
| `KAOLA_WORKFLOW_FORCE_FF_FAIL` | Test-only FF failure injection |
| `HOME` | Used by `claudeProjectDirForRoot()` |

---

## Critical Idiom

```bash
git rev-parse --git-common-dir   # ← correct: returns shared .git/ from ANY worktree
git rev-parse --git-dir          # ← wrong: returns per-worktree .git/worktrees/X
git rev-parse --show-toplevel    # ← wrong for coordRoot: returns the linked worktree root
```
