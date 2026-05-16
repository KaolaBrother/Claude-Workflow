---
name: kaola-workflow-research
description: Use when beginning Phase 1 of Kaola-Workflow for Codex, also called kaola-workflow, and gathering facts before strategy or implementation.
---

# Kaola-Workflow Research

Phase 1 discovers facts only. Do not choose a solution or edit implementation files.

## Goal Contract

Continue until Phase 1 has parsed requirements, recorded research evidence,
selected a safe workflow project name, written `phase1-research.md`, and updated
`workflow-state.md` with `next_skill: kaola-workflow-ideation {project}`. Stop
only for true external authorization, materially user-owned choices, or
ambiguity that blocks correctness.

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

## Steps

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

1. Parse the request:
   - deliverable
   - user value
   - affected area
   - success criteria
   - linked issue, or `none`
2. Generate a deterministic 2-4 word kebab-case project name from the linked
   issue title or task description. If `kaola-workflow/{name}/` exists, append
   the first available collision suffix such as `{name}-2`; do not ask the user
   to confirm routine generated names.
   If a linked GitHub issue number `N` is known and no `## Sink` block exists
   yet, add a lightweight `## Sink` block to `workflow-state.md` with
   `branch: TBD`, `issue_number: N`, `claimed_at: N/A`, and `sink: merge` so
   later sessions can recognize the active issue before `phase1-research.md`
   exists.
3. Inspect relevant files, tests, config, docs, and issues. Use the `code-explorer` Codex agent role when subagents are available; otherwise perform the same read-only research in the current session.
4. Use the `docs-lookup` Codex agent role only when current external behavior matters; otherwise record why docs lookup is N/A.
5. Write raw notes to `.cache/code-explorer.md` and `.cache/docs-lookup.md` when used.
6. Score completeness from 0-10. Stop and ask if below 7.
7. Write `kaola-workflow/{project}/phase1-research.md` and update `workflow-state.md`. Preserve any existing `## Sink` and `## Lease` blocks exactly; never replace the whole state file with phase-only fields.

## Phase File

```markdown
# Phase 1 - Research: {project}

## Deliverable
...

## Why
...

## Affected Area
...

## Key Patterns Found
1. path:line - fact

## Test Patterns
- Framework:
- Location:
- Structure:

## External Docs
links or none

## Completeness Score
X/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | invoked/N/A | .cache/docs-lookup.md or docs-impact check | reason if N/A |
```

8. If a GitHub issue is linked, run `init-issue` to create the roadmap tracking file:

```bash
claim_script="plugins/kaola-workflow/scripts/kaola-workflow-claim.js"
if [ ! -f "$claim_script" ]; then
  claim_script="$(find "$HOME/.codex/plugins/cache" -path '*/kaola-workflow/*/scripts/kaola-workflow-claim.js' -print -quit 2>/dev/null)"
fi
roadmap_script="$(dirname "$claim_script")/kaola-workflow-roadmap.js"
node "$roadmap_script" init-issue \
  --issue "$ISSUE_NUMBER" \
  --title "$ISSUE_TITLE" \
  --status open \
  --workflow-project "$KAOLA_PROJECT" \
  --next-step "ready"
```

9. If a claim session is active and a branch has been cut, patch the lock file with the branch name:

```bash
claim_script="plugins/kaola-workflow/scripts/kaola-workflow-claim.js"
if [ ! -f "$claim_script" ]; then
  claim_script="$(find "$HOME/.codex/plugins/cache" -path '*/kaola-workflow/*/scripts/kaola-workflow-claim.js' -print -quit 2>/dev/null)"
fi
[ -n "${KAOLA_SESSION_ID:-}" ] && node "$claim_script" patch-branch \
  --session "$KAOLA_SESSION_ID" \
  --project "$KAOLA_PROJECT" \
  --branch "$(git rev-parse --abbrev-ref HEAD)"
```

State next pointer: `next_skill: kaola-workflow-ideation {project}`. Preserve
any existing `## Sink` and `## Lease` blocks during this update.
