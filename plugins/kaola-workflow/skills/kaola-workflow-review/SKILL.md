---
name: kaola-workflow-review
description: Use when Phase 4 tasks are complete and Kaola-Workflow for Codex, also called kaola-workflow, needs quality review, optional security review, and review-fix routing.
---

# Kaola-Workflow Review

Phase 5 reviews completed work. Review findings come first; fixes are implemented only after classification.

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
}
```

## Goal Contract

Continue until quality review, conditional security review, review-fix routing,
and `phase5-review.md` are complete, then update `workflow-state.md` with
`next_skill: kaola-workflow-finalize {project}`. Stop only for true external
authorization, materially user-owned choices, or ambiguity that blocks
correctness.

## Inputs

## Startup Receipt Guard

For issue-backed work, verify that `kaola-workflow/.sessions/${KAOLA_SESSION_ID}.startup.json`
exists and records this project or an owned/acquired claim before doing phase
work. If the receipt is missing, stale, or belongs to another session, run
`kaola-workflow-claim.js startup --session "$KAOLA_SESSION_ID" --runtime codex`
or stop instead of continuing.

Read:

```text
kaola-workflow/{project}/workflow-state.md
kaola-workflow/{project}/phase3-plan.md
kaola-workflow/{project}/phase4-progress.md
```

## Review Steps

1. Inspect changed files and task evidence.
2. Use the `code-reviewer` Codex agent role or `codex review` when useful for a detached review pass; otherwise perform a review stance locally.
3. Check correctness, scope, naming, error handling, test coverage, debug statements, and validation evidence.
4. Run a security-sensitive file scan. If auth, payments, user data, filesystem access, external APIs, or secrets changed, use the `security-reviewer` Codex agent role or perform the same security review locally.
5. Route CRITICAL/HIGH findings back to implementation before Phase 6. MEDIUM/LOW findings may become follow-ups.
6. Save raw review output to `.cache/code-reviewer.md` and `.cache/security-reviewer.md` when used.

## Phase File

```markdown
# Phase 5 - Review: {project}

## Code Review Findings
### CRITICAL
none
### HIGH
none
### MEDIUM/LOW
...

## Security Review
ran yes/no and reason

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| quality review | invoked | .cache/code-reviewer.md | |
| security review | invoked/N/A | .cache/security-reviewer.md or file-risk scan | reason if N/A |
| review-fix executors | invoked/N/A | .cache/review-fix-*.md | reason if N/A |

## Review Status
PASSED | PASSED WITH FOLLOW-UPS
```

Set `next_skill: kaola-workflow-finalize {project}`.
