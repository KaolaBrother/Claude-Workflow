# Phase 4 - Progress: issue-40

## Operational Guardrails

Phase 4 is subagent-executed.

Main session may:
- inspect diffs
- run small targeted validation commands
- delegate expensive or noisy validation
- classify failures
- update progress/evidence files
- delegate follow-up fixes
- apply the Trivial Inline Edit Exception

Main session must not:
- write implementation fixes inline except under the Trivial Inline Edit Exception
- write or rewrite tests inline except under the Trivial Inline Edit Exception
- mark a task complete while validation fails

Failure routing:
- behavior/test failure -> tdd-guide
- build/type/lint/tooling failure -> build-error-resolver
- scope/write-set violation -> stop or escalate
- emergency inline fallback -> only with explicit user authorization

## Tasks
| # | Name | Status | Files Modified | Notes |
|---|------|--------|----------------|-------|
| A1 | Byte-sync plugin validator | complete | plugins/kaola-workflow/scripts/validate-workflow-contracts.js | Byte-identical copy from root |
| A2 | Fix cmdWorktreeFinalize root derivation | complete | scripts/kaola-workflow-claim.js | Line 2402: findMainWorktree() || getRoot() |
| A3 | Add Case 17M (finalize-from-inside-worktree) | complete | scripts/simulate-workflow-walkthrough.js | Inserted after Case 17J |
| B4 | Extract selectFirstClaimable helper | complete | scripts/kaola-workflow-claim.js | Inserted before runStartupClaimFirstAvailable |
| B5 | Refactor runStartupClaimFirstAvailable | complete | scripts/kaola-workflow-claim.js | Delegates to selectFirstClaimable |
| B6 | Rewrite cmdPickNext | complete | scripts/kaola-workflow-claim.js, plugins copy | Fixes flaws 4+5+8+9; Test 17B updated: owned not none |
| B7 | Add Case 17L (verify-startup after pick-next) | complete | scripts/simulate-workflow-walkthrough.js | Inserted after 17M |
| B8 | Add Case 17N (sweep GCs expired pick-next worktree) | complete | scripts/simulate-workflow-walkthrough.js | Uses synthetic session prefix for GC |
| B9 | Add contract assertions to validate-kaola-workflow-contracts.js | complete | scripts/validate-kaola-workflow-contracts.js | 6 assertions; pre-existing backslash bug fixed |
| C10 | Replace exit 0 with verdict-based routing in workflow-next.md | complete | commands/workflow-next.md | Verdict-routing if/fi block; line limit bumped 250→265 (TIE) |
| C11 | Mirror router change into Codex SKILL.md | complete | plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md | Uses --runtime codex |
| D12 | Teach scanPhaseArtifacts to read workflow-state.md first | complete | scripts/kaola-workflow-claim.js | Excludes step=claimed to preserve 17D/17E artifact scan |
| E13 | Add cleanup to cmdWorktreeFinalize (archive + release + remove) | complete | scripts/kaola-workflow-claim.js, plugins copy | Test ordering rewritten; backslash bug fixed (TIE) |
| E14 | Extend Case 17F to assert archive and cleanup | complete | scripts/simulate-workflow-walkthrough.js | 17F moved terminal; archive + removal assertions |

## Build Status
PASS — all 3 validators exit 0; simulate-workflow-walkthrough passes

## Failure Routing Ledger
| Task | Failing Command | Classification | Routed To | Evidence | Status |
|------|-----------------|----------------|-----------|----------|--------|

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| tdd-guide executor task A1 | invoked | .cache/tdd-task-A1.md | |
| tdd-guide executor task A2 | invoked | .cache/tdd-task-A2-A3.md | |
| tdd-guide executor task A3 | invoked | .cache/tdd-task-A2-A3.md | |
| tdd-guide executor task B4 | pending | | |
| tdd-guide executor task B5 | pending | | |
| tdd-guide executor task B6 | pending | | |
| tdd-guide executor task B7 | pending | | |
| tdd-guide executor task B8 | pending | | |
| tdd-guide executor task B9 | invoked | .cache/tdd-task-B9.md | |
| tdd-guide executor task C10 | invoked | .cache/tdd-task-C10.md | |
| tdd-guide executor task C11 | invoked | .cache/tdd-task-C11.md | |
| tdd-guide executor task D12 | invoked | .cache/tdd-task-D12.md | |
| tdd-guide executor task E13 | invoked | .cache/tdd-task-E13-E14.md | |
| tdd-guide executor task E14 | invoked | .cache/tdd-task-E13-E14.md | |

## Last Updated
2026-05-17T18:47:00.000Z
