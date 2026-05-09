---
description: Claude Workflow Phase 4. Subagent-executed TDD implementation with strict failure routing.
argument-hint: <project name>
---

# Claude Workflow Phase 4 - Execute

NO INLINE PHASE 4 FIXES without explicit user authorization.

Phase 4 is subagent-executed. The main session is the orchestrator: it updates
state, starts task agents, verifies results, classifies validation failures, and
routes fixes. It does not write implementation or test code.

## Prerequisite

`phase3-plan.md` must exist. If missing, stop:

```text
Phase 3 is not complete. Run /claude-workflow-phase3 first.
```

Read:

```text
claude-workflow/{project}/workflow-state.md
claude-workflow/{project}/phase1-research.md
claude-workflow/{project}/phase3-plan.md
claude-workflow/{project}/phase4-progress.md
```

## Operational Guardrails

Phase 4 is subagent-executed.

Main session may:
- inspect diffs
- run validation
- classify failures
- update progress/evidence files
- delegate follow-up fixes

Main session must not:
- write implementation fixes inline
- write or rewrite tests inline
- mark a task complete while validation fails
- silently bypass `tdd-guide`

Failure routing:
- behavior/test failure -> `tdd-guide`
- missing acceptance behavior -> `tdd-guide`
- build/type/lint/tooling failure -> `build-error-resolver`
- scope/write-set violation -> stop and ask unless reverting the agent's own
  obvious deviation
- emergency inline fallback -> only with explicit user authorization recorded as
  `inline_emergency_fallback_authorized: yes`

Default state must include:

```text
main_session_role: orchestrator
implementation_owner: tdd-guide
fix_owner: tdd-guide or build-error-resolver
inline_emergency_fallback_authorized: no
```

## Resume Detection

If `phase4-progress.md` is missing, create it from `phase3-plan.md`.

If present:

- first task with `pending` -> `task-pending`
- first task with `in_progress` and no `.cache/tdd-task-N.md` -> `delegate-task`
- cache exists but RED/GREEN evidence missing -> `verify-agent-result`
- cache exists and evidence valid but validation not run -> `validate-task`
- validation failed and no routing ledger row -> `route-failure`
- validation passed but progress not updated -> `update-progress`
- all tasks complete -> route to `/claude-workflow-phase5 {project}`

If ambiguous, stop and ask. Do not guess.

## Progress File Template

Create `claude-workflow/{project}/phase4-progress.md`:

```markdown
# Phase 4 - Progress: {project}

## Operational Guardrails

Phase 4 is subagent-executed.

Main session may:
- inspect diffs
- run validation
- classify failures
- update progress/evidence files
- delegate follow-up fixes

Main session must not:
- write implementation fixes inline
- write or rewrite tests inline
- mark a task complete while validation fails

Failure routing:
- behavior/test failure -> tdd-guide
- build/type/lint/tooling failure -> build-error-resolver
- scope/write-set violation -> stop or escalate
- emergency inline fallback -> only with explicit user authorization

## Tasks
| # | Name | Status | Files Modified | Notes |
|---|------|--------|----------------|-------|
| 1 | [name] | pending | | |

## Build Status
clean

## Failure Routing Ledger
| Task | Failing Command | Classification | Routed To | Evidence | Status |
|------|-----------------|----------------|-----------|----------|--------|

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| tdd-guide executor task 1 | pending | | |

## Last Updated
[ISO-8601 UTC]
```

## Per-Task Loop

### Step 1 - Delegate Task

Before invoking the agent, update:

```text
phase: 4
phase_name: Execute
step: delegate-task
task: {n}
next_command: /claude-workflow-phase4 {project}
inline_emergency_fallback_authorized: no
```

Invoke ECC `tdd-guide` for the task.

Provide:
- the full task definition from `phase3-plan.md`
- `Test File`, `Write Set`, dependencies, and validation command
- relevant Phase 1 test patterns
- explicit Git policy for this workflow: do not create checkpoint commits unless
  the user or project convention explicitly requires them

Agent task:
- Execute using ECC `tdd-workflow`
- write/update tests first and verify RED
- implement minimum code for GREEN
- refactor only while tests stay green
- keep edits inside the write set unless escalating
- return modified files, commands run, RED evidence, GREEN evidence, deviations

Write raw output to:

```text
claude-workflow/{project}/.cache/tdd-task-{n}.md
```

Mark the compliance row `invoked` with that evidence path.

### Step 2 - Verify Agent Result

The main session reviews the returned diff and evidence:

- changed files are in the write set, or deviation is justified
- RED evidence exists, or RED is explicitly `N/A` for no-testable-change work
- GREEN evidence exists for the same test target
- implementation follows Phase 3 and Phase 1 patterns

If this verification fails, send the task back to `tdd-guide` with the specific
failure. Do not repair implementation inline.

### Step 3 - Validate Task

Run the exact affected validation command from `phase3-plan.md`, plus any
required type/lint command for affected files.

If validation fails, add a row to `Failure Routing Ledger` before invoking the
fix agent.

Routing:
- build/type/lint/dependency/tooling -> `build-error-resolver`
- behavior/regression/coverage/acceptance -> `tdd-guide`
- scope/write-set -> stop and ask, unless reverting the agent's own deviation

Record each routed fix in:

```text
claude-workflow/{project}/.cache/tdd-task-{n}-fix-{m}.md
```

Re-run validation after the routed fix. Keep the task `in_progress` until
validation passes.

### Step 4 - Update Progress

Only after validation passes:

- mark task `complete`
- record modified files
- update build status
- update `Last Updated`
- update `workflow-state.md` to next task or Phase 5

## Completion

When all tasks are complete and compliance rows are resolved, route to:

```text
/claude-workflow-phase5 {project}
```
