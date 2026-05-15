# Advisor Ideation Gate - issue-22

## Review

Option B is the right scope. It handles the actual root causes:

- startup id resolution is not platform-aware;
- repair/select treats active projects as resumable without ownership checks;
- phase heartbeat snippets can export a different session's id;
- no explicit handoff primitive exists for intentional recovery.

## Hidden Risks

- `claim.js session --project` currently means "tell me the owner"; changing it abruptly can break tests and snippets. The safer contract is: without `--project`, print the current platform-derived session id; with `--project`, return success only when the current session owns that project, otherwise exit with an occupied status.
- State-only leases matter because Phase 1 can write `workflow-state.md` before a lock is available or after a lock is swept.
- Claude Code needs a hook helper because the authoritative `session_id` arrives as SessionStart input rather than as a normal environment variable.
- Codex should not require a hook; `CODEX_THREAD_ID` is enough when present.

## Decision

Proceed with Option B. Keep recovery/handoff internal and explicit, not part of default `/workflow-next` routing.
