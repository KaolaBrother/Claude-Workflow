# Phase 1 - Research: issue-22

## Deliverable

Update Kaola-Workflow session ownership so normal startup resumes only work owned by the current host platform session id, skips work owned by other live sessions, and claims the next free issue. Keep explicit recovery/handoff available only when a user intentionally switches a new session to an unfinished issue.

## Why

A fresh agent in the same repository can currently adopt another live session's work because router/project selection sees a single active project and phase startup can export that project's lease owner id. This defeats parallel workflow isolation and can make a second session continue issue #22 instead of selecting independent work.

## Affected Area

- Lease/session helper: `scripts/kaola-workflow-claim.js` and plugin mirror.
- Router state repair: `scripts/kaola-workflow-repair-state.js` and plugin mirror.
- Claude command guidance: `commands/workflow-next.md` and phase command heartbeat snippets.
- Codex skill guidance: `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` and phase skill heartbeat snippets.
- Claude hook integration: `hooks/hooks.json` plus a session env helper if needed.
- User docs: `README.md`.
- Regression tests: walkthrough simulators and contract validators.

## Key Patterns Found

1. `scripts/kaola-workflow-claim.js`: `cmdSession()` returns another project's owner session from lock/state, which normal startup then exports.
2. `scripts/kaola-workflow-claim.js`: `cmdBootstrap()` generates a UUID fallback rather than deriving from `CODEX_THREAD_ID` or Claude hook input.
3. `scripts/kaola-workflow-repair-state.js`: `selectProject()` treats the only active project as resumable without checking `session_id`.
4. `commands/workflow-next.md`: startup uses `KAOLA_SESSION_ID` or a generated UUID only.
5. `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md`: Codex startup also ignores `CODEX_THREAD_ID`.
6. `commands/kaola-workflow-phase*.md` and Codex phase skills: heartbeat snippets can call `claim.js session --project` and silently adopt the lease owner.
7. `hooks/hooks.json`: Claude plugin hooks do not persist Claude's `SessionStart` `session_id` into `KAOLA_SESSION_ID`.
8. `scripts/simulate-workflow-walkthrough.js` and plugin simulator contain the right place for regression coverage, but current expectations encode the old adoption behavior.
9. `scripts/kaola-workflow-roadmap.js` sorts issue rows descending, so local #23 appears before #22 despite being the follow-up.

## Test Patterns

- Framework: Node.js assertion-style simulation scripts plus contract validators.
- Location: `scripts/simulate-workflow-walkthrough.js`, `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`, `scripts/validate-workflow-contracts.js`, `scripts/validate-kaola-workflow-contracts.js`.
- Structure: add lock-backed and state-only ownership cases for matching session, different session, no free issue, free issue claim, and explicit handoff.

## External Docs

- Claude Code sessions: https://code.claude.com/docs/en/sessions
- Claude Code hooks: https://code.claude.com/docs/en/hooks
- Codex CLI resume: https://developers.openai.com/codex/cli/features#resuming-conversations
- Codex app-server start/resume/fork: https://developers.openai.com/codex/app-server#start-or-resume-a-thread
- Codex slash commands: https://developers.openai.com/codex/cli/slash-commands#built-in-slash-commands

## Completeness Score

10/10

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | invoked | .cache/docs-lookup.md | |
