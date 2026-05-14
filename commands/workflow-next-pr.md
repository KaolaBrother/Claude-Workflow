---
description: Workflow Next PR. Sets PR sink mode and delegates to /workflow-next.
argument-hint: (optional project name or task description)
---

# Workflow Next PR

`/workflow-next-pr` is a thin wrapper that sets the sink mode to `pr` and then
delegates to `/workflow-next`. Use this instead of `/workflow-next` when you
want Phase 6 to open a GitHub PR and wait for merge rather than performing a
local fast-forward merge.

## Behavior

1. Set `KAOLA_SINK=pr` in the environment for this session.
2. Delegate to `/workflow-next` with `$ARGUMENTS` passed through unchanged.

`/workflow-next` Startup Step 0 passes `--sink pr` to `claim`, which writes
`sink: pr` to the `## Sink` block of `workflow-state.md`. Phase 6 Step 8 reads
this field and dispatches to `kaola-workflow-sink-pr.js` instead of
`kaola-workflow-sink-merge.js`.

## Startup

```bash
export KAOLA_SINK=pr
```

Then continue exactly as `/workflow-next` would, using `$ARGUMENTS`.

## Contract

- This command must remain ≤ 40 lines.
- It must not perform phase work, claim sessions, or modify files directly.
- The sink selection is propagated via the `KAOLA_SINK` environment variable.
