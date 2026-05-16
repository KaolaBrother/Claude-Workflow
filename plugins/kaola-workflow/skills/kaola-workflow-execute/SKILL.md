---
name: kaola-workflow-execute
description: Use when Phase 3 plan exists and Kaola-Workflow for Codex, also called kaola-workflow, needs TDD implementation, scoped validation, and failure routing.
---

# Kaola-Workflow Execute

Phase 4 implements the plan. Prefer the `tdd-guide` Codex agent role for assigned implementation tasks when subagents are available. Use the current Codex session as the fallback executor when session policy, availability, or user direction prevents delegation.

## Session Heartbeat

If a session is active or recoverable, ensure the background heartbeat ticker is running:

```bash
claim_script="plugins/kaola-workflow/scripts/kaola-workflow-claim.js"
if [ ! -f "$claim_script" ]; then
  claim_script="$(find "$HOME/.codex/plugins/cache" -path '*/kaola-workflow/*/scripts/kaola-workflow-claim.js' -print -quit 2>/dev/null)"
fi
if [ -f "$claim_script" ] && [ -z "${KAOLA_SESSION_ID:-}" ]; then
  KAOLA_SESSION_ID="$(node "$claim_script" session 2>/dev/null || true)"
  [ -n "$KAOLA_SESSION_ID" ] && export KAOLA_SESSION_ID
fi
if [ -f "$claim_script" ] && [ -n "${KAOLA_SESSION_ID:-}" ] && [ -n "${KAOLA_PROJECT:-}" ]; then
  node "$claim_script" session --project "$KAOLA_PROJECT" --session "$KAOLA_SESSION_ID" >/dev/null || {
    echo "Kaola-Workflow: $KAOLA_PROJECT is owned by another session; use explicit recovery/handoff to continue it."
    exit 1
  }
fi
[ -n "${KAOLA_SESSION_ID:-}" ] && {
  _TICKER_PID_FILE="$(git rev-parse --show-toplevel)/kaola-workflow/.tickers/${KAOLA_SESSION_ID}.pid"
  if [ ! -f "$_TICKER_PID_FILE" ] || ! kill -0 "$(cat "$_TICKER_PID_FILE" 2>/dev/null)" 2>/dev/null; then
    nohup node "$claim_script" ticker \
      --session "$KAOLA_SESSION_ID" >/dev/null 2>&1 &
    disown
  fi
  cd "$KAOLA_WORKTREE_PATH" 2>/dev/null || true
}
```

## Goal Contract

Continue until all Phase 3 tasks are complete, validation evidence is recorded
for each task, failure routing is resolved, and `workflow-state.md` points to
`next_skill: kaola-workflow-review {project}`. Stop only for true external
authorization, materially user-owned choices, or ambiguity that blocks
correctness.

## Startup Receipt Guard

For issue-backed work, verify that `kaola-workflow/.sessions/${KAOLA_SESSION_ID}.startup.json`
exists and authorizes this exact project with `claim: "owned"` or
`claim: "acquired"` before doing phase work. Run the script-level verifier and
stop on failure:

```bash
node "$claim_script" verify-startup --session "$KAOLA_SESSION_ID" --project "$KAOLA_PROJECT" >/dev/null || {
  echo "Kaola-Workflow: startup receipt does not authorize $KAOLA_PROJECT; run startup or explicit recovery instead."
  exit 1
}
```

## Guardrails

- Stay inside the active task write set.
- Use RED -> GREEN -> REFACTOR for behavior changes.
- Do not mark a task complete while validation fails.
- Route behavior/test failures to `tdd-guide`.
- Route build/type/lint/tooling failures to `build-error-resolver`.
- Record every command, result, and evidence path.

## Progress File

Create or update `kaola-workflow/{project}/phase4-progress.md`:

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
| tdd-guide executor task 1 | pending | | |
```

## Per-Task Loop

1. Update `workflow-state.md`: `phase: 4`, `step: red`, `task: N`, `next_skill: kaola-workflow-execute {project}`.
2. RED: write or update the focused test first, then run it and capture the expected failure.
3. GREEN: implement the minimal change and run the same test until it passes.
4. REFACTOR: clean only within scope while tests stay green.
5. Run the exact validation command from `phase3-plan.md`.
6. Save raw evidence to `.cache/tdd-task-{n}.md`.
7. Mark the task complete only after validation passes.

If validation fails after GREEN or REFACTOR, classify the failure in the Failure
Routing Ledger:

- behavior, regression, coverage, or acceptance failure -> `tdd-guide`
- build, type, lint, dependency, formatting, or tooling failure -> `build-error-resolver`

When all tasks are complete, set `next_skill: kaola-workflow-review {project}`.
