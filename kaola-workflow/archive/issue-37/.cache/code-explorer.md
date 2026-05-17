# Code Explorer Output — Issue #37

## Entry Points

- `scripts/kaola-workflow-claim.js:2133` — `main()` dispatch function
- `commands/workflow-next.md:65` — calls `startup` subcommand (dropped)
- `commands/workflow-init.md:279` — calls `claim` directly (dropped)
- `commands/kaola-workflow-phase[1-6].md` — each calls `ticker` and `verify-startup` (both dropped)

## Current Claim Lifecycle (to be replaced)

1. `cmdStartup()` (line 1211) calls `syncIssuesToRoadmap`, `runBootstrapSweep`, `watch-pr`, `classify`, then `claim`
2. `cmdClaim()` (line 1305) writes O_EXCL lock file to `{coordRoot}/kaola-workflow/.locks/{project}.lock`
3. `cmdClaim()` posts GitHub comment, runs tiebreaker, calls `provisionWorktree()`
4. Phase commands start `ticker` daemon via `nohup` to maintain `last_heartbeat` every 15 minutes
5. Phase commands call `verify-startup` to check session receipt authorizes phase work
6. `cmdHandoff()` (line 1574) transfers lock file ownership between sessions
7. `cmdSweep()` (line 1911) removes expired locks, prunes worktrees, drains `.pending-removal/`
8. `cmdRelease()` deletes lock file and removes worktree

## Proposed New Model (worktree-as-signal)

1. Issue N is claimed iff branch `workflow/issue-N` exists locally
2. `provisionWorktree()` at line 591 is the creation primitive — production-ready
3. `removeWorktree()` at line 623 is the release primitive — handles dirty/clean cases
4. `cmdStatus` and `cmdPatchBranch` are KEPT; `cmdWatchPr` and `cmdFinalize` are KEPT

## Architecture: Subcommand Dispatch

- Flat `if (sub === 'xxx') return cmdXxx()` chain in `main()` at line 2133
- `cmd` prefix for subcommand handlers; `run` prefix for internal helpers
- `parseArgs()` called at top of each cmd function for CLI arg parsing
- `module.exports` at line 2158 exports: `{ buildSinkBranchName, getCoordRoot, removeWorktree, archiveProjectDir }`

## Error Handling Patterns

- Soft failure: `process.stderr.write('msg\n'); process.exitCode = 1; return;`
- Conflict: `process.exitCode = 2; return;`
- Identity enforcement: `process.exitCode = 3; return;`
- Session not found: `process.exitCode = 4; return;`
- Assertions: `assert(condition, 'msg')` — caught by top-level try/catch
- GitHub API errors: `if (!res.ok)` pattern with OFFLINE fallback
- `OFFLINE = !!process.env.KAOLA_WORKFLOW_OFFLINE` at line 8

## Worktree Infrastructure (Already Exists)

- `worktreePathFor(root, project)` — line 587-589: `path.join(path.dirname(root), path.basename(root) + '.kw', project)`
- `provisionWorktree(root, project, issueNumber, branch)` — line 591-621: checks `git worktree list --porcelain`, checks `git branch --list`, then creates with `-b` or without
- `removeWorktree(worktreePath, root)` — line 623-679: dirty check via `git -C <path> status --porcelain`, clean removal via `git worktree remove --force`, dirty → `fs.renameSync` to `.abandoned-` prefix
- `drainPendingRemovals(root)` — line 681-698
- `archiveProjectDir(coordRoot, project)` — line 1701
- `buildSinkBranchName()` — line 699-708: returns `workflow/issue-N`
- `pickFirstActionableIssue()` — line 1098: pick-next pattern (needs rewrite to check git branch instead of lock files)

## Test Locations and Epic Cases to Rewrite

### `scripts/simulate-workflow-walkthrough.js`
- **Epic Case 1** (line 382-460): claim → heartbeat → status → second-claim-blocked (exit 2) → sweep → release. MUST REWRITE.
- **Epic Case 6G** (line ~1122): Tests `bootstrap` on claim.js. MUST REWRITE.
- **Epic Case 13** (line 2967): "true parallel bootstrap coordination" — concurrent bootstrap sessions. MUST REWRITE.
- **Epic Case 14** (line 3111): "startup transaction syncs issues, writes a receipt" — tests `startup` directly. MUST REWRITE.
- **Epic Case 14a** (line 3236) and **14b** (line 3295): Priority ranking via startup. MUST REWRITE.

### `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- **Cases 5a-5i** (lines ~232-548): Tests `claim`, `bootstrap`, `can-handoff`, `handoff`, `verify-startup`. ALL MUST REWRITE.

## External Callers of Dropped Subcommands

| Subcommand | Callers |
|---|---|
| `claim` | `commands/workflow-init.md:279`; internally from `cmdBootstrap`, `cmdStartup`; plugin walkthrough 245,260,277,454 |
| `release` | Only internal |
| `heartbeat` | `simulate-workflow-walkthrough.js` Epic Case 1 ~407-412; via `ticker` daemon from all 6 phase commands |
| `ticker` | `commands/kaola-workflow-phase1.md:44`, `phase2.md:48`, `phase3.md:46`, `phase4.md:36`, `phase5.md:50`, `phase6.md:51` |
| `sweep` | Only internal |
| `derive-session` | No external callers |
| `verify-startup` | All 6 phase commands (~line 61 each); plugin walkthrough:533 |
| `can-handoff` | `commands/workflow-next.md:163`; plugin walkthrough:510 |
| `handoff` | `commands/workflow-next.md:164`; plugin walkthrough:523,528 |
| `startup` | `commands/workflow-next.md:65`; `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md:44`; walkthrough Epic Case 14 ~3152 |
| `bootstrap` | Walkthrough Epic Case 6G ~1122; plugin walkthrough:292,351,357,363 |

## Lock/Lease File Structure

### Directory layout under `{coordRoot}/kaola-workflow/`
- `.locks/{project}.lock` — JSON lock file per claimed project
- `.sessions/{sessionId}.json` — session identity file
- `.sessions/{sessionId}.startup.json` — startup receipt
- `.tickers/{sessionId}.pid` — ticker daemon PID file
- `.runtime/{sessionId}-{platform}.json` — platform identity file

### Lock file JSON format (line ~1370)
```json
{
  "project": "issue-42",
  "session_id": "uuid",
  "machine_id": "uuid",
  "claimed_at": "ISO",
  "expires": "ISO",
  "last_heartbeat": "ISO",
  "issue_number": 42,
  "claim_comment_id": "12345",
  "sink": "merge",
  "pr_url": null,
  "pr_number": null,
  "runtime": "claude",
  "worktree_path": "/path/.kw/project",
  "branch": "workflow/issue-42",
  "owner_session_id": "uuid"
}
```

## Env Vars & Feature Flags

- `KAOLA_WORKFLOW_OFFLINE=1` — bypass all GitHub API calls
- `KAOLA_ENFORCE_PLATFORM_SESSION=1` — enforce kernel session derivation
- `KAOLA_KERNEL_SESSION_SKIP=1` — skip kernel session check
- `KAOLA_COORD_ROOT=/path` — override coordination root
- `KAOLA_WORKTREE_PATH=/path` — override worktree placement
- `KAOLA_SESSION_ID=uuid` — override session ID
- `KAOLA_KERNEL_SESSION_FAKE_PID=12345` — fake PID for testing
- `KAOLA_WORKFLOW_DEBUG_CWD=1` — debug CWD resolution
- **`KAOLA_WORKTREE_NATIVE` does NOT currently exist** — must be added as new feature flag per issue migration plan

## Critical Blockers

1. `scripts/validate-workflow-contracts.js` lines 220-234: Hard-asserts literal strings for ALL functions being dropped. Must update in lockstep.
2. Lines 231-234: Epic Case titles hard-asserted in walkthrough must be removed or replaced.
3. Lines 278-285: Asserts `commands/workflow-next.md` includes `startup receipt`, `claim: "none"`, `can-handoff`, `handoff --project`, `--force-live-takeover`. Must update.
4. `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`: Must stay byte-identical — sync with `cp` after every edit.
5. Plugin walkthrough Cases 5a-5i: All test dropped subcommands — must rewrite.

## Dependencies

- External: `node:fs`, `node:path`, `node:child_process`, `node:crypto`, `node:os` — all built-ins; no npm deps in claim.js
- Internal: `scripts/kaola-workflow-classifier.js` (classify subcommand), `scripts/kaola-workflow-roadmap.js` (syncIssuesToRoadmap inside startup)
- GitHub API: Direct `https` calls via `node:https`; guarded by `if (!OFFLINE)`
