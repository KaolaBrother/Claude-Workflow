# Architect Notes - issue-22

## Build Sequence

1. Add ownership semantics to `kaola-workflow-claim.js`.
   - Current session id resolution: `--session`, `KAOLA_SESSION_ID`, `CODEX_THREAD_ID`, `CLAUDE_SESSION_ID`, fallback UUID.
   - `session` prints current id; `session --project` validates current id owns the project.
   - `bootstrap` first resumes an owned active project, otherwise claims a free issue, otherwise emits a clear no-work message.
   - `handoff` explicitly transfers lock/state ownership for recovery.

2. Make state repair ownership-aware.
   - Empty selection filters active projects by current session id.
   - Explicit project selection refuses foreign-owned active work during normal routing.
   - Repaired state preserves existing Sink and Lease blocks.

3. Wire platform id sources.
   - Claude: SessionStart hook writes `KAOLA_SESSION_ID` from hook `session_id` into `CLAUDE_ENV_FILE`.
   - Codex: skill startup and helper resolution prefer `CODEX_THREAD_ID` when `KAOLA_SESSION_ID` is absent.

4. Replace adoption snippets.
   - Phase heartbeat snippets derive current id without `--project`.
   - Then they validate project ownership with `session --project --session "$KAOLA_SESSION_ID"`.

5. Update docs/tests.
   - README session lifecycle/recovery docs.
   - Contract validators for new strings/scripts.
   - Walkthrough simulations for lock-backed, state-only, foreign-owned, same-owned, no-free-work, and explicit handoff.

## Interfaces

- `node scripts/kaola-workflow-claim.js session [--project <project>] [--session <id>]`
  - no project: prints current platform-derived or fallback id.
  - project: prints the current id only if it owns the project; exits 2 if occupied by another id.

- `node scripts/kaola-workflow-claim.js handoff --project <project> --session <id> [--runtime claude|codex]`
  - transfers lock/state lease ownership to the specified id.

- `node scripts/kaola-workflow-claim.js bootstrap [--session <id>] [--runtime claude|codex]`
  - returns owned project JSON before claiming new work.
  - claims next green/yellow issue only when the current session has no active owned project.

## Validation Commands

- `node scripts/validate-workflow-contracts.js`
- `node scripts/simulate-workflow-walkthrough.js`
- `node scripts/validate-kaola-workflow-contracts.js`
- `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- `npm run test:kaola-workflow:claude`
- `npm run test:kaola-workflow:codex`
