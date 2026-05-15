---
name: kaola-workflow-next-pr
description: Use when starting or resuming a Kaola-Workflow for Codex session in PR-sink mode, where Phase 6 opens a GitHub pull request instead of merging directly.
---

# Kaola-Workflow Next PR

This skill sets the sink mode to `pr` and delegates to `kaola-workflow-next`. Use this instead of `kaola-workflow-next` when Phase 6 should open a GitHub pull request and wait for merge rather than fast-forward merging locally.

## Behavior

1. Set `KAOLA_SINK=pr` in the environment.
2. Delegate to `kaola-workflow-next` for routing.
3. Routing decisions are recorded in `kaola-workflow/{project}/workflow-state.md` via `kaola-workflow-next`.

## Startup

```bash
export KAOLA_SINK=pr

```

Then continue as `kaola-workflow-next` would, using `$ARGUMENTS`.

## Contract

- This skill must remain ≤ 40 lines.
- It must not perform phase work directly.
- The sink selection is propagated via `KAOLA_SINK=pr`.
