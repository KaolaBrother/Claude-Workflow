# Phase 4 - Progress: issue-37

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

## Pre-Check Findings (resolved before implementation)

1. **`getRoot()` vs `getCoordRoot()`**: `getCoordRoot()` returns the `.git` directory path (via `git rev-parse --git-common-dir`). `worktreePathFor(root, project)` must receive the working-tree root, not the `.git` path. Therefore `cmdWorktreeFinalize` must call `getRoot()` not `getCoordRoot()`. The existing callers of `provisionWorktree()` (e.g., `cmdClaim` at line 1309) all use `const root = getRoot()` for this argument.

2. **`KAOLA_PROJECT` env var**: Never set as an env var in any phase command file. The Phase 4 Worktree Discovery block must use `{project}` (template substitution, filled in by slash command invocation) not `$KAOLA_PROJECT`. Consistent with how other phase files reference the project.

## Tasks
| # | Name | Status | Files Modified | Notes |
|---|------|--------|----------------|-------|
| 1 | cmdPickNext | complete | scripts/kaola-workflow-claim.js | |
| 2 | cmdResume | complete | scripts/kaola-workflow-claim.js | |
| 3 | cmdWorktreeStatus | complete | scripts/kaola-workflow-claim.js | |
| 4 | cmdWorktreeFinalize | complete | scripts/kaola-workflow-claim.js | Used getRoot() not getCoordRoot() |
| 5 | main() + exports | complete | scripts/kaola-workflow-claim.js | |
| 6 | Validator asserts (8 of 10) | complete | scripts/validate-workflow-contracts.js | 2 deferred to Step 2 |
| 7 | Epic Case 17 (17A-17F) | complete | scripts/simulate-workflow-walkthrough.js | |
| 8 | Case 5l (not 5k) | complete | plugins/.../simulate-kaola-workflow-walkthrough.js | 5k already existed; named 5l |
| 9 | Drift mirrors | complete | plugins/.../kaola-workflow-claim.js, validate-workflow-contracts.js | MIRRORS IDENTICAL |
| 10 | Phase 4 Worktree Discovery | complete | commands/kaola-workflow-phase4.md | Used {project} template |
| 11 | workflow-next guard | complete | commands/workflow-next.md | After KAOLA_STARTUP_SESSION= line |
| 6b | Deferred validator asserts | complete | scripts/validate-workflow-contracts.js, plugin mirror | KAOLA_WORKTREE_NATIVE + ACTIVE_WORKTREE_PATH |
| 12 | Docs | complete | CHANGELOG.md, README.md | |

## Build Status
green — npm test passes all 5 checks

## Failure Routing Ledger
| Task | Failing Command | Classification | Routed To | Evidence | Status |

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| tdd-guide task 1-9 (Step 1 group) | complete | .cache/tdd-task-step1.md | Backend Architect agent |
| tasks 10-11 (Step 2) | complete | Trivial Inline Edits within write set | Single-line + block insertions |
| task 6b (deferred asserts) | complete | Trivial Inline Edit | 2 assertIncludes lines |
| task 12 (docs) | complete | Trivial Inline Edit | CHANGELOG + README additions |

## Last Updated
2026-05-17T05:50:00.000Z

## Failure Routing Ledger
| Task | Failing Command | Classification | Routed To | Evidence | Status |

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| tdd-guide task 1 (cmdPickNext) | pending | | |
| tdd-guide task 2 (cmdResume) | pending | | |
| tdd-guide task 3 (cmdWorktreeStatus) | pending | | |
| tdd-guide task 4 (cmdWorktreeFinalize) | pending | | |
| tdd-guide task 5 (main+exports) | pending | | |
| tdd-guide task 6 (validator asserts) | pending | | |
| tdd-guide task 7 (Epic Case 17) | pending | | |
| tdd-guide task 8 (Case 5k) | pending | | |
| tdd-guide task 9 (drift mirrors) | pending | | |
| tdd-guide task 10 (Phase 4 block) | pending | | |
| tdd-guide task 11 (workflow-next guard) | pending | | |
| tdd-guide task 12 (docs) | pending | | |

## Last Updated
2026-05-17T05:25:00.000Z
