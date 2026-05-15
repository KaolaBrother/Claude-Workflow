# Code Explorer Notes - issue-22

## Scope

- GitHub issue #22: `Use platform session id ownership to decide resume vs parallel work`.
- Current Codex thread id in this session: `CODEX_THREAD_ID=019e2ae2-7157-7c23-b01f-31b5b77a6594`.
- Current local `KAOLA_SESSION_ID` is unset, which makes current startup behavior depend on helper fallback behavior.

## Current Behavior Evidence

1. `scripts/kaola-workflow-claim.js`
   - `cmdBootstrap()` generates `crypto.randomUUID()` when `--session` is absent.
   - `cmdSession()` returns the project owner session from a lock or state-only lease via `sessionForProject()`.
   - Phase snippets currently call `claim.js session --project ...` when `KAOLA_SESSION_ID` is unset, so a fresh process can export another session's owner id.
   - Duplicate issue protection uses `issueAlreadyClaimed()`, which checks both lock files and active `workflow-state.md` issue numbers.
   - Bootstrap runs sweep, PR watch, classifier, and claim, then prints JSON with `{ project, issue, verdict, session }`.

2. `scripts/kaola-workflow-repair-state.js`
   - `activeProjects()` returns any project with phase artifacts or active state.
   - `selectProject()` accepts an explicitly requested existing project without checking lease ownership.
   - Empty-argument routing selects the only active project even if its `session_id` belongs to another active session.
   - `stateContent()` rewrites state from artifacts but does not preserve an existing `## Lease` block.

3. Router and phase guidance
   - `commands/workflow-next.md` and `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` generate a UUID if `KAOLA_SESSION_ID` is absent.
   - Phase command docs and Codex phase skills rehydrate `KAOLA_SESSION_ID` from `claim.js session --project`.
   - This is the direct adoption path issue #22 calls out.

4. Claude hook surface
   - `hooks/hooks.json` currently has only a compact `SessionStart` hook and a `PreToolUse` commit guard.
   - No hook persists Claude Code's `session_id` into `KAOLA_SESSION_ID`.
   - `scripts/kaola-workflow-compact-context.js` reads SessionStart input, but only prints compact resume context.

5. Codex plugin surface
   - Codex has no hook equivalent here, but the runtime exposes `CODEX_THREAD_ID` to this session.
   - Codex skill startup should prefer `KAOLA_SESSION_ID`, then `CODEX_THREAD_ID`, then a fallback UUID.

6. Tests and validators
   - `scripts/simulate-workflow-walkthrough.js` and `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` contain multi-session tests.
   - Existing tests expect `claim.js session --project` to return a project owner's session id from lock/state; issue #22 requires reversing that default behavior for normal startup.
   - `scripts/validate-kaola-workflow-contracts.js` requires shared plugin scripts to match root `scripts/`.
   - `scripts/kaola-workflow-roadmap.js` currently sorts issues descending, which places #23 before #22 even though #23 is a follow-up.

## Conflict Classifier Evidence

- `scripts/kaola-workflow-claim.js` bootstrap calls `kaola-workflow-classifier.js` before claim.
- `scripts/kaola-workflow-classifier.js` already skips claimed issue numbers from lock-backed and state-only leases.
- If bootstrap skips an occupied issue and picks a new issue, the classifier does perform an overlap check, but it is coarse and has been filed separately as issue #23.

## Files Likely Affected

- `scripts/kaola-workflow-claim.js`
- `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
- `scripts/kaola-workflow-repair-state.js`
- `plugins/kaola-workflow/scripts/kaola-workflow-repair-state.js`
- `commands/workflow-next.md`
- `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md`
- `commands/kaola-workflow-phase*.md`
- `plugins/kaola-workflow/skills/kaola-workflow-{research,ideation,plan,execute,review,finalize}/SKILL.md`
- `hooks/hooks.json`
- optional new Claude hook helper under `scripts/` and `plugins/kaola-workflow/scripts/`
- `README.md`
- `scripts/simulate-workflow-walkthrough.js`
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- `scripts/validate-workflow-contracts.js`
- `scripts/validate-kaola-workflow-contracts.js`

## Test Pattern

- Primary test commands:
  - `npm run test:kaola-workflow:claude`
  - `npm run test:kaola-workflow:codex`
- The Claude test invokes `claude plugin validate .`, so local Claude CLI availability matters.
- The Codex contract validator checks root/plugin shared script byte equality for claim/classifier/roadmap/sink scripts.
