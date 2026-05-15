---
name: kaola-workflow-next-pr
description: Use when starting or resuming a Kaola-Workflow for Codex session in PR-sink mode, where Phase 6 opens a GitHub pull request instead of merging directly.
---

# Kaola-Workflow Next PR

This skill sets the sink mode to `pr` and delegates to `kaola-workflow-next`. Use this instead of `kaola-workflow-next` when Phase 6 should open a GitHub pull request and wait for merge rather than fast-forward merging locally.

## Behavior

1. Set `KAOLA_SINK=pr` in the environment.
2. Run the bootstrap startup sequence with PR sink.
3. Delegate to `kaola-workflow-next` for routing.
4. Routing decisions are recorded in `kaola-workflow/{project}/workflow-state.md` via `kaola-workflow-next`.

## Startup

```bash
export KAOLA_SINK=pr

claim_script="plugins/kaola-workflow/scripts/kaola-workflow-claim.js"
if [ ! -f "$claim_script" ]; then
  claim_script="$(find "$HOME/.codex/plugins/cache" -path '*/kaola-workflow/*/scripts/kaola-workflow-claim.js' -print -quit 2>/dev/null)"
fi

if [ -f "$claim_script" ] && [ -n "${KAOLA_SESSION_ID:-}" ]; then
  node "$claim_script" bootstrap \
    --session "$KAOLA_SESSION_ID" \
    --runtime codex \
    --sink pr 2>/dev/null || true
fi
```

Then continue as `kaola-workflow-next` would, using `$ARGUMENTS`.

## Contract

- This skill must remain ≤ 40 lines.
- It must not perform phase work directly.
- The sink selection is propagated via `KAOLA_SINK=pr`.
