# Phase 4 - Progress: pr-sink

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
| T1 | claim.js: --sink flag, lockData, buildSinkBlock, releaseSession, cmdWatchPr, dispatcher | complete | scripts/kaola-workflow-claim.js | G1 serial chokepoint |
| T2 | kaola-workflow-sink-pr.js (new) | complete | scripts/kaola-workflow-sink-pr.js | G2 parallel |
| T3 | workflow-next-pr.md (new, ≤40 lines) | complete | commands/workflow-next-pr.md | 35 lines |
| T4 | kaola-workflow-phase6.md Step 8 dispatch | complete | commands/kaola-workflow-phase6.md | G3 parallel |
| T5 | workflow-next.md watch-pr + KAOLA_SINK_FLAG | complete | commands/workflow-next.md, scripts/validate-workflow-contracts.js | Cap bumped 240→250 |
| T6 | install.sh: add sink-pr.js | complete | install.sh | G2 parallel |
| T7 | validate-workflow-contracts.js: assertions | complete | scripts/validate-workflow-contracts.js | 14 new assertions + cap 240→250 |
| T8 | simulate-workflow-walkthrough.js: Epic Case 7 | complete | scripts/simulate-workflow-walkthrough.js | 7G,7A,7B,7C,7D,7E,7F all pass |
| T9 | README.md + CHANGELOG.md | complete | README.md, CHANGELOG.md | G2 parallel |

## Build Status

clean

## Failure Routing Ledger

| Task | Failing Command | Classification | Routed To | Evidence | Status |
|------|-----------------|----------------|-----------|----------|--------|

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| tdd-guide executor T1 | invoked | .cache/tdd-task-T1.md | |
| tdd-guide executor T2 | invoked | .cache/tdd-task-T2.md | |
| tdd-guide executor T3 | invoked | .cache/tdd-task-T3.md | |
| tdd-guide executor T4 | invoked | .cache/tdd-task-T4.md | |
| tdd-guide executor T5 | invoked | .cache/tdd-task-T5.md | |
| tdd-guide executor T6 | invoked | .cache/tdd-task-T6.md | |
| tdd-guide executor T7 | invoked | .cache/tdd-task-T7.md | |
| tdd-guide executor T8 | invoked | .cache/tdd-task-T8.md | |
| tdd-guide executor T9 | invoked | .cache/tdd-task-T9.md | |

## Last Updated

2026-05-15T10:35:00Z
