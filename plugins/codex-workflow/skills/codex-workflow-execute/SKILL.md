---
name: codex-workflow-execute
description: Use when Phase 3 plan exists and the private Codex workflow needs TDD implementation, scoped validation, and failure routing.
---

# Codex Workflow Execute

Phase 4 implements the plan. The default executor is the current Codex session. Use subagents only when the user explicitly authorizes delegation.

## Guardrails

- Stay inside the active task write set.
- Use RED -> GREEN -> REFACTOR for behavior changes.
- Do not mark a task complete while validation fails.
- Route build/type/lint/tooling failures separately from behavior failures.
- Record every command, result, and evidence path.

## Progress File

Create or update `codex-workflow/{project}/phase4-progress.md`:

```markdown
# Phase 4 - Progress: {project}

## Tasks
| # | Name | Status | Files Modified | Notes |
|---|------|--------|----------------|-------|
| 1 | name | pending | | |

## Failure Routing Ledger
| Task | Failing Command | Classification | Routed To | Evidence | Status |
|------|-----------------|----------------|-----------|----------|--------|

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| executor task 1 | pending | | |
```

## Per-Task Loop

1. Update `workflow-state.md`: `phase: 4`, `step: red`, `task: N`, `next_skill: codex-workflow-execute {project}`.
2. RED: write or update the focused test first, then run it and capture the expected failure.
3. GREEN: implement the minimal change and run the same test until it passes.
4. REFACTOR: clean only within scope while tests stay green.
5. Run the exact validation command from `phase3-plan.md`.
6. Save raw evidence to `.cache/task-{n}.md`.
7. Mark the task complete only after validation passes.

When all tasks are complete, set `next_skill: codex-workflow-review {project}`.
