# Phase 1 - Research / Discovery: issue-37

## Deliverable
Replace the JSON session-id lease system in `scripts/kaola-workflow-claim.js` with git-worktree-as-primary-claim-signal. Branch `workflow/issue-N` existing locally = issue is claimed. No JSON lock file, no heartbeat, no sweep. Land behind `KAOLA_WORKTREE_NATIVE=1` env flag with in-flight projects continuing under old path until drained.

## Why
Eliminate 84KB of complex lease/heartbeat/sweep/session machinery. Git's filesystem-level "one worktree per branch" invariant provides an atomic, race-safe claim primitive with no TTL, no daemon, no GitHub-comment tiebreaker. Simplifies every phase entry from `verify-startup + ticker daemon` to "am I on the right branch?"

## Affected Area
- `scripts/kaola-workflow-claim.js` (primary — 16 subcommands, ~84KB)
- `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` (byte-identical mirror — must stay in sync)
- `scripts/validate-workflow-contracts.js` (hard-asserts dropped function names — must update first)
- `scripts/simulate-workflow-walkthrough.js` (Epic Cases 1, 6G, 13, 14, 14a, 14b — must rewrite)
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` (Cases 5a-5i — must rewrite)
- `commands/workflow-next.md` (calls startup, can-handoff, handoff — all dropped)
- `commands/workflow-init.md:279` (calls claim directly — dropped)
- `commands/kaola-workflow-phase[1-6].md` (each calls ticker + verify-startup — both dropped)
- `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md:44` (references startup)

## Key Patterns Found

1. **provisionWorktree()** `scripts/kaola-workflow-claim.js:591` — production-ready claim primitive; checks `git worktree list --porcelain`, then `git worktree add -b workflow/issue-N -- {path} HEAD`; handles existing-branch resume
2. **removeWorktree()** `scripts/kaola-workflow-claim.js:623` — release primitive; dirty-check via `git -C <path> status --porcelain`; clean removal via `git worktree remove --force`; dirty → `fs.renameSync` to `.abandoned-` prefix
3. **buildSinkBranchName()** `scripts/kaola-workflow-claim.js:699` — canonical branch naming: `workflow/issue-N`; used everywhere; must remain unchanged
4. **pickFirstActionableIssue()** `scripts/kaola-workflow-claim.js:1098` — pick-next pattern; currently scans lock files; must rewrite to check `git branch --list workflow/issue-N`
5. **Subcommand dispatch** `scripts/kaola-workflow-claim.js:2133` — flat `if (sub === 'xxx') return cmdXxx()` chain; follow this exact pattern for new `pick-next` subcommand
6. **OFFLINE guard** `scripts/kaola-workflow-claim.js:8` — `const OFFLINE = !!process.env.KAOLA_WORKFLOW_OFFLINE`; all GitHub calls wrapped with `if (!OFFLINE)`

## Test Patterns
- Framework: hand-rolled assert (no Jest/Mocha) — `assert(condition, 'message')` pattern
- Location: `scripts/simulate-workflow-walkthrough.js` and `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- Structure: `epicCase(N, 'description', async () => { ... })` — async functions, temp dir per case, OFFLINE mode for unit-style tests

## Config & Env
- `KAOLA_WORKFLOW_OFFLINE=1` — bypass GitHub API; wrap all new GitHub calls with `if (!OFFLINE)`
- `KAOLA_COORD_ROOT=/path` — override coordination root (used in tests)
- `KAOLA_SESSION_ID=uuid` — session ID override; `cmdSession()` (line 540) is KEPT
- `KAOLA_WORKTREE_NATIVE=1` — NEW flag to add; gates new worktree-as-signal path
- `KAOLA_WORKTREE_PATH=/path` — override worktree placement; honored by `provisionWorktree()`
- Existing: `KAOLA_ENFORCE_PLATFORM_SESSION`, `KAOLA_KERNEL_SESSION_SKIP`, `KAOLA_KERNEL_SESSION_FAKE_PID`, `KAOLA_WORKFLOW_DEBUG_CWD`

## External Docs
None required — pure internal refactor using Node.js built-ins (`node:fs`, `node:path`, `node:child_process`, `node:crypto`, `node:os`) and existing git CLI operations already in the codebase.

## GitHub Issue
KaolaBrother/Kaola-Workflow#37

## Completeness Score
10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | Pure internal refactor; all patterns in codebase; no external library changes |

## Notes / Future Considerations
- `validate-workflow-contracts.js` must be updated BEFORE touching claim.js — it hard-asserts dropped function names at lines 220-234 and 278-285; CI will fail immediately otherwise
- Drift guard runs first in both npm test legs — sync plugin mirror with `cp scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js` after every edit
- Subcommands to DROP: `claim`, `release`, `heartbeat`, `ticker`, `sweep`, `derive-session`, `verify-startup`, `can-handoff`, `handoff`, `startup`, `bootstrap`
- Subcommands to KEEP: `status`, `patch-branch`, `watch-pr`, `finalize`, `session`
- Directories to remove from coordination root: `.locks/`, `.sessions/`, `.tickers/`, `.runtime/`, `.pending-removal/`, `.audit/`
- Edge case: ghost branch (branch exists, no worktree) → treat as claimed; `resume-by-id` materializes worktree from branch
- Artifact placement: hybrid (c) — artifacts live in main worktree during phases, copied into issue worktree at finalize pre-PR
- Cross-machine coordination: out of scope per issue spec
- Migration: in-flight projects with existing `.locks/` continue under old path until `KAOLA_WORKTREE_NATIVE=1` is set; old code stays until queue is drained
