# Security Review - issue-25

## Scope

Changed files include local workflow scripts, command/skill prompt text,
simulations, validators, release metadata, and workflow artifacts.

## Security-Sensitive Areas

- Filesystem reads of local Claude JSONL session files under
  `~/.claude/projects/{encoded-root}/{session}.jsonl`.
- PID liveness probing with `process.kill(pid, 0)`.
- Lock and startup receipt writes under `kaola-workflow/.locks` and
  `kaola-workflow/.sessions`.

## Findings

### CRITICAL

none

### HIGH

none

### MEDIUM/LOW

none

## Notes

Session and project names remain constrained by existing safe-name validation
before path construction. The local Claude JSONL path is derived from the
repository root and safe session id; no user-controlled path separators are
accepted in the session id.
