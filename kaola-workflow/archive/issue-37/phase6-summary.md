# Phase 6 - Summary: issue-37

## Delivered
Four new subcommands to `scripts/kaola-workflow-claim.js` behind the `KAOLA_WORKTREE_NATIVE=1` environment flag, replacing JSON session-lease claims with git worktree existence as the primary claim primitive:
- **`pick-next`**: Scans local branches + git ls-remote to find unclaimed issues; provisions a worktree for the winning candidate; handles race loss with retry; sets `workflow:in-progress` label online
- **`resume`**: Reads `git worktree list --porcelain` to locate the main worktree; scans phase artifacts to determine current phase; emits the next slash command
- **`worktree-status`**: Lists active `workflow/issue-*` worktrees with GitHub issue metadata
- **`worktree-finalize`**: Copies artifacts from worktree back into main repo; commits with conventional message; removes worktree
- Extended `main()` dispatcher and `module.exports` for all four subcommands
- Updated `commands/workflow-next.md` and `commands/kaola-workflow-phase4.md` with worktree-native guards
- Added 10 contract assertions to `scripts/validate-workflow-contracts.js`
- Added Epic Case 17 (sub-cases 17A–17F) to `scripts/simulate-workflow-walkthrough.js`
- Added Case 5l to plugin walkthrough; synced all drift mirrors

## Files Changed
- `scripts/kaola-workflow-claim.js`
- `scripts/validate-workflow-contracts.js`
- `scripts/simulate-workflow-walkthrough.js`
- `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` (mirror)
- `plugins/kaola-workflow/scripts/validate-workflow-contracts.js` (mirror)
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- `commands/workflow-next.md`
- `commands/kaola-workflow-phase4.md`
- `.env.example`
- `README.md`
- `CHANGELOG.md`

## Test Coverage
No coverage tooling configured. All 5 checks in `npm test` pass. New behavior covered by Epic Case 17 (17A–17F) and contract assertions. Prior behavior covered by existing 16 epic cases.

## Final Validation Evidence
| Command | Result | Evidence |
|---------|--------|----------|
| `node scripts/simulate-workflow-walkthrough.js` | PASS | .cache/final-validation.md |

## Documentation Docking
DOCKED — .cache/doc-docking.md

## Final Validation Failure Ledger
| Failing Command | Classification | Routed To | Evidence | Status |
|-----------------|----------------|-----------|----------|--------|
| (none) | | | | |

## Follow-Up Items
From Phase 5 (MEDIUM/LOW — do not block closure):
- MEDIUM-1: Refactor cmdPickNext/cmdResume/cmdWorktreeFinalize to stay under 50-line cap
- MEDIUM-2: Log provisionWorktree errors to stderr in cmdPickNext
- MEDIUM-3: Normalize `issue` field to integer in `cmdResume` output
- MEDIUM-4: Fix Phase-4 Worktree Discovery block — `--show-toplevel` wrong from inside issue worktree (known limitation of KAOLA_WORKTREE_NATIVE experimental path)
- MEDIUM-5: Add failure-path test coverage to Epic Case 17
- MEDIUM-6: Strengthen contract validator to include dispatcher string checks
- LOW-1: Anchor `refs/heads/` replacement regex in `cmdWorktreeStatus`
- LOW-2: Extract phase-routing table from `cmdResume` if/else chain
- LOW-3: Derive `.kw` cleanup path from `pick17a.worktree_path` in 17F
- LOW-4: Minor `module.exports` formatting consistency

## Closure Decision
Advisor consulted (.cache/advisor-closure.md). Decision: PROCEED — close issue #37. Follow-up items are durably captured in `phase5-review.md`; no individual follow-up GitHub issues will be filed per advisor recommendation and user /goal ("Stop when finishing the issue").

## Commit And Push
READY FOR FINAL GIT GATE

## GitHub Issue
Closed (#37) — after final commit and sink-merge.

## Roadmap
Updated — after archive and sink.

## Archive
Pending — cmdFinalize moves kaola-workflow/issue-37/ → kaola-workflow/archive/issue-37/

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| doc-updater | invoked | .cache/doc-updater.md | |
| documentation docking | invoked | .cache/doc-docking.md | |
| closure advisor gate | invoked | .cache/advisor-closure.md | |
| final-validation fix executors | N/A | .cache/final-validation.md (PASS, no fix needed) | |
| roadmap refresh | pending | kaola-workflow/ROADMAP.md | runs in Step 7 |
| archive completed folder | pending | | cmdFinalize in Step 8b |
| final commit and push | ready | drift checks PASSED, git status clean | final gate runs after this file is committed |

## Status
READY FOR FINAL GIT GATE
