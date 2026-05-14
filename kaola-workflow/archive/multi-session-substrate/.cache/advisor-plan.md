# Advisor Output — multi-session-substrate Phase 3 Plan Gate

## Verdict: REVISE — 4 blockers before phase3-plan.md can be written

## Blocker 1 — pre-commit.sh logic is wrong

Current blueprint iterates ALL locks and blocks if ANY lock is owned by different session. This breaks two-session coexistence (Session A on issue 3 would block on Session B's issue-4 lock).

Correct algorithm (per epic #2):
1. Read tool input from stdin (PreToolUse sends JSON); if command doesn't contain `git commit`, exit 0 immediately.
2. `git diff --cached --name-only` → staged files.
3. Filter to `kaola-workflow/{project}/...` paths only.
   - Exclude: ROADMAP.md, .locks/, .sessions/, archive/, anything outside kaola-workflow/
4. Extract distinct project names from staged paths.
5. For each project, read its workflow-state.md Lease.session_id (or issue lock file).
6. Block only if any project's owner ≠ KAOLA_SESSION_ID.
7. If multiple projects touched in one commit → fail with "split your commit".

## Blocker 2 — Sweep threshold wrong (violates acceptance #6)

Acceptance #6: "Within 24h, lease is held. 24h+ later, sweep releases."
Epic spec: `expires < now − 24h AND last_heartbeat < now − 24h` (24h grace covers gh API outages)

Architect used LOCK_TTL_MS=30min as sweep threshold — wrong. LOCK_TTL_MS governs heartbeat expiry. Sweep must check BOTH conditions against a 24h-ago threshold.

Correct sweep condition:
```js
const cutoff = Date.now() - 24 * 60 * 60 * 1000;
if (new Date(lock.expires).getTime() < cutoff && new Date(lock.last_heartbeat).getTime() < cutoff) {
  // sweep this lock
}
```

## Blocker 3 — PreToolUse hook contract unverified

Two unknowns that architect flagged but did not resolve:
1. **stdin format**: Claude Code PreToolUse sends tool input as JSON via stdin (e.g. `{"tool_input": {"command": "..."}}` or similar). Script must read stdin and check command contains "git commit" before doing expensive git/node work.
2. **Block exit code**: Exit 1 may be a non-blocking error. Claude Code PreToolUse block exit code may be 2 or require JSON `permissionDecision: "deny"` to stdout. Must verify — wrong exit code = silent no-op.

Architect-revision must: (a) confirm the exact stdin JSON schema for PreToolUse Bash hooks, and (b) confirm the correct exit code/output to block execution.

## Blocker 4 — install.sh gap

install.sh:111 copies repair-state.js to ~/.claude/kaola-workflow/scripts/ by name. claim.js is not included. Heartbeat snippet uses `${CLAUDE_PLUGIN_ROOT:-./}/scripts/kaola-workflow-claim.js` — manual-install users would fail silently.

Decision required:
(a) Extend install.sh to copy claim.js + pre-commit.sh (small, consistent with existing pattern, overrides "no install.sh changes" from Phase 2)
(b) Add runtime guard in commands that prints "kaola-workflow-claim.js not found — reinstall via plugin" instead of silent no-op

Advisor recommendation: Option (a) — matches what codebase already does for repair-state.js.

## Smaller Items (non-blocking)

- status --json without session-id: define response shape (array of sessions or require session-id arg)
- release with unknown session-id: graceful skip vs. exit 1 — define behavior
- sleepMs busy-wait: acceptable for ≤150ms

## Action Required

Route to architect-revision-1 with all 4 blockers. Do NOT write phase3-plan.md until resolved.
