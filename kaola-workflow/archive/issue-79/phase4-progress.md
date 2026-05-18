# Phase 4 - Progress: issue-79

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
| 1 | Dogfood: update CLAUDE.md Non-Negotiable Rules | complete | CLAUDE.md | 5 bullets; validator passes |
| 2 | Dogfood: create AGENTS.md | complete | AGENTS.md | Created; second line = MANDATORY sentinel |
| 3 | Update commands/workflow-init.md (GitHub Claude command) | complete | commands/workflow-init.md | Validators pass |
| 4 | Update plugins/kaola-workflow-gitlab/commands/workflow-init.md | complete | plugins/kaola-workflow-gitlab/commands/workflow-init.md | Validators pass |
| 5 | Update plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md | complete | plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md | Validators pass |
| 6 | Update plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md | complete | plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md | Validators pass |
| 7 | Update validate-workflow-contracts.js + mirror | complete | scripts/validate-workflow-contracts.js, plugins/kaola-workflow/scripts/validate-workflow-contracts.js | Mirror identical; validators pass |
| 8 | Update validate-kaola-workflow-contracts.js | complete | scripts/validate-kaola-workflow-contracts.js | Validators pass |
| 9 | Update validate-kaola-workflow-gitlab-contracts.js | complete | plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js | Validators pass |
| 10 | Run all three validators | complete | — | All 3 exit 0 |
| 11 | Run walkthrough simulation | complete | — | Exit 0: "Workflow walkthrough simulation passed" |

## Build Status
green — all 3 validators pass; walkthrough simulation passed

## Failure Routing Ledger
| Task | Failing Command | Classification | Routed To | Evidence | Status |
|------|-----------------|----------------|-----------|----------|--------|

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| tdd-guide executor task 1 | invoked | .cache/tdd-task-1.md | |
| tdd-guide executor task 2 | invoked | .cache/tdd-task-2.md | |
| tdd-guide executor task 3 | invoked | .cache/tdd-task-3.md | |
| tdd-guide executor task 4 | invoked | .cache/tdd-task-4.md | |
| tdd-guide executor task 5 | invoked | .cache/tdd-task-5.md | |
| tdd-guide executor task 6 | invoked | .cache/tdd-task-6.md | |
| tdd-guide executor task 7 | invoked | .cache/tdd-task-7.md | |
| tdd-guide executor task 8 | invoked | .cache/tdd-task-8.md | |
| tdd-guide executor task 9 | invoked | .cache/tdd-task-9.md | |

## Last Updated
2026-05-18T12:35:00.000Z
