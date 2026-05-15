# Code Review Notes - issue-22

## Scope Reviewed

- `scripts/kaola-workflow-claim.js` and plugin mirror.
- `scripts/kaola-workflow-repair-state.js` and plugin mirror.
- Claude/Codex router and heartbeat snippets.
- Claude SessionStart env hook.
- README and roadmap generator.
- Root and Codex simulations plus contract validators.

## Findings

### CRITICAL

none

### HIGH

none

### MEDIUM/LOW

none

## Checks

- Verified normal startup no longer uses `session --project` to export a project owner's id.
- Verified `session --project --session <id>` validates ownership and exits occupied for foreign leases.
- Verified bootstrap returns `verdict: "owned"` before claiming a second issue for the same session.
- Verified explicit `handoff` updates lock-backed and state-only leases.
- Verified repair-state preserves Sink/Lease blocks and supports Codex `next_skill`.
- Verified docs now say no-free-work stops instead of silently adopting a foreign lease.
