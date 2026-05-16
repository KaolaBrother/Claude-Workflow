# Code Architect Notes - issue-25

## Design

Add authorization commands to the existing claim script instead of introducing a
new helper:

- `verify-startup --session --project` reads
  `kaola-workflow/.sessions/{session}.startup.json` and returns exit 0 only
  when the receipt acquired or owns the project.
- `can-handoff --session --project` computes the same decision as `handoff`
  without mutating files.
- `handoff` calls the shared decision before rewriting locks or workflow state.
- Successful `handoff` writes a fresh `claim: owned` startup receipt so the
  recovering session can pass phase-entry verification afterward.

## Liveness Evidence

Normal handoff is blocked by any of these signals for the previous owner:

- recent local Claude JSONL under `~/.claude/projects/{encoded-root}/{session}.jsonl`
- live ticker PID file
- unexpired lock
- recent heartbeat

## Integration

Phase prompts and Codex skills call `verify-startup`. Routers stop on
`claim:none` and require `can-handoff` before explicit recovery. Validators pin
the new command names and guard phrases.
