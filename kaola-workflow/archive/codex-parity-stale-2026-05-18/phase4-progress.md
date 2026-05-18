# Phase 4 - Progress: codex-parity

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
| 1 | Add --runtime flag + bootstrap subcommand to claim.js | complete | scripts/kaola-workflow-claim.js, scripts/simulate-workflow-walkthrough.js | 724 lines, validated |
| 2 | Collapse workflow-next.md Startup Step 0 | complete | commands/workflow-next.md | bootstrap call replaces 29-line chain |
| 3 | Create 9th skill + update validator (atomic) | complete | plugins/kaola-workflow/skills/kaola-workflow-next-pr/SKILL.md, scripts/validate-kaola-workflow-contracts.js | validator passes |
| 4 | Bootstrap invocation in kaola-workflow-next SKILL.md | complete | plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md | validator passes |
| 5a | Heartbeat + init-issue + patch-branch in research SKILL.md | complete | plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md | validator passes |
| 5b | Heartbeat in ideation SKILL.md | complete | plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md | validator passes |
| 5c | Heartbeat in plan SKILL.md | complete | plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md | validator passes |
| 5d | Heartbeat in execute SKILL.md | complete | plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md | validator passes |
| 5e | Heartbeat in review SKILL.md | complete | plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md | validator passes |
| 5f | Heartbeat + sink dispatch in finalize SKILL.md | complete | plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md | validator passes |
| 6 | Session lifecycle docs in init SKILL.md | complete | plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md | validator passes |
| 7 | Case 5 cross-runtime in Codex simulator | complete | plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js | all 3 test suites pass |

## Build Status
clean — all tasks complete, 3 test suites pass

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
| tdd-guide executor task 5a | invoked | .cache/tdd-task-5a.md | |
| tdd-guide executor task 5b | invoked | .cache/tdd-task-5b-5e.md | batched with 5c-5e |
| tdd-guide executor task 5c | invoked | .cache/tdd-task-5b-5e.md | batched with 5b |
| tdd-guide executor task 5d | invoked | .cache/tdd-task-5b-5e.md | batched with 5b |
| tdd-guide executor task 5e | invoked | .cache/tdd-task-5b-5e.md | batched with 5b |
| tdd-guide executor task 5f | invoked | .cache/tdd-task-5f-6.md | batched with T6 |
| tdd-guide executor task 6 | invoked | .cache/tdd-task-5f-6.md | batched with T5f |
| tdd-guide executor task 7 | invoked | .cache/tdd-task-7.md | |

## Last Updated
2026-05-15T09:30:00Z
