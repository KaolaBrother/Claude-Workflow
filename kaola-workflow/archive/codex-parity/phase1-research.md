# Phase 1 - Research / Discovery: codex-parity

## Deliverable

Add multi-session wiring to all Codex phase skills so they invoke the same runtime-agnostic shared scripts that Claude phase commands use. Specifically:

1. Add claim lifecycle (claim/release/ticker) to Codex init and phase skills
2. Add sweep + classifier to `kaola-workflow-next` skill
3. Add roadmap `init-issue` to `kaola-workflow-research` skill (Phase 1)
4. Add sink dispatch to `kaola-workflow-finalize` skill (Phase 6)
5. Create `kaola-workflow-next-pr` skill (mirrors `workflow-next-pr.md`)
6. Add `runtime: codex` field to session JSON schema in `claim.js`
7. Extend Codex walkthrough simulator with Case 5 (cross-runtime co-work)

## Why

A user can run a Claude Code session and a Codex session in the same worktree simultaneously. Both runtimes should hold separate locks, cut separate branches, renew their own heartbeats, and merge/PR independently — transparent co-operation over the shared file-and-Git substrate.

## Affected Area

- `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md` — add claim lifecycle
- `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` — add sweep + classifier + session guard
- `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md` — add roadmap init-issue + ticker
- `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md` — add ticker block
- `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md` — add ticker block
- `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md` — add ticker block
- `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md` — add ticker block
- `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` — add ticker block + sink dispatch
- `plugins/kaola-workflow/skills/kaola-workflow-next-pr/SKILL.md` — CREATE (new skill, mirrors workflow-next-pr.md)
- `scripts/kaola-workflow-claim.js` — add `runtime` field to session/lock JSON
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` — add Case 5
- `scripts/validate-kaola-workflow-contracts.js` — update assertion to 9 skills (after next-pr added)

## Key Patterns Found

1. **Codex script lookup pattern** (`plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md:60`):
   Check `plugins/kaola-workflow/scripts/` first, then `$HOME/.codex/plugins/cache`. All Codex skills must use this two-step resolution for script paths.

2. **Claude ticker block** (`commands/kaola-workflow-phase1.md:~10`):
   ```bash
   [ -n "${KAOLA_SESSION_ID:-}" ] && {
     _TICKER_PID_FILE="$(git rev-parse --show-toplevel)/kaola-workflow/.tickers/${KAOLA_SESSION_ID}.pid"
     if [ ! -f "$_TICKER_PID_FILE" ]; then
       nohup node "${CLAUDE_PLUGIN_ROOT:-./}/scripts/kaola-workflow-claim.js" ticker \
         --session "$KAOLA_SESSION_ID" >/dev/null 2>&1 &
       disown
     fi
   }
   ```
   Codex equivalent uses `plugins/kaola-workflow/scripts/` lookup instead of `CLAUDE_PLUGIN_ROOT`.

3. **Codex repair-state pattern** (`plugins/kaola-workflow/scripts/kaola-workflow-repair-state.js`):
   Codex-adapted copy in `plugins/kaola-workflow/scripts/` uses `next_skill` field. This is the blueprint for any script needing Codex-specific adaptations.

4. **Session JSON schema** (`scripts/kaola-workflow-claim.js:buildLockData`):
   Lock fields: `session_id`, `machine_id`, `claimed_at`, `expires`, `last_heartbeat`, `issue_number`, `project`, `sink`, `comment_id`. No `runtime` field today — must be added for cross-runtime discrimination.

5. **Contract validator pattern** (`scripts/validate-kaola-workflow-contracts.js`):
   Asserts 8 SKILL.md files, 9 agent TOMLs, repair script fields. Must be updated to assert 9 SKILL.md files after `kaola-workflow-next-pr` is created.

6. **Codex simulator structure** (`plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js:1-203`):
   Hand-rolled `assert()` + `execFileSync`. Uses `KAOLA_WORKFLOW_OFFLINE=1` + temp dirs. Success string: `"Kaola-Workflow walkthrough simulation passed"`. Pattern to mirror for Case 5: Epic 9 in `simulate-workflow-walkthrough.js` (uses gh shim in temp `bin/` dir prepended to PATH).

## Test Patterns

- **Framework**: hand-rolled `assert()` — no external test framework (consistent across both simulators)
- **Location**: `scripts/simulate-workflow-walkthrough.js` (Claude), `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` (Codex)
- **Structure**: `try { ... assert(...) ... } catch (e) { console.error(...); process.exit(1) }` blocks, `KAOLA_WORKFLOW_OFFLINE=1` for offline isolation, temp dirs via `os.tmpdir()`, gh shim in temp `bin/` for tests requiring GitHub interactions
- **Test command**: `npm run test:kaola-workflow:codex` (already defined in `package.json`)
- **Claude test command**: `npm run test:kaola-workflow:claude` (already defined)
- **Full suite**: `npm test`

## Config & Env

- `KAOLA_SESSION_ID` — UUID of current session; set by `claim` subcommand; read by phase skills after wiring
- `KAOLA_SINK` — `merge` or `pr`; read by router and Phase 6 sink dispatch
- `KAOLA_WORKFLOW_OFFLINE` — `1` to disable all GitHub API calls (used in all tests)
- `CLAUDE_PLUGIN_ROOT` — Claude-only env var for locating scripts; Codex uses two-step lookup instead
- `plugins/kaola-workflow/config/agents.toml` — agent TOML template
- `plugins/kaola-workflow/agents/*.toml` — 9 agent profiles (no `model =` pin)

## External Docs

N/A — all patterns are internal to this codebase. No external API or framework documentation needed.

## GitHub Issue

KaolaBrother/Kaola-Workflow#8

## Completeness Score

8/10
- Goal clarity: 2/3 (spec references `scripts/kaola-workflow/` path which doesn't exist as a directory; actual scripts are at `scripts/kaola-workflow-*.js` — interpreted correctly as the shared scripts dir)
- Expected outcome: 2/3 (4 concrete ACs; `npm test` already exists, just needs Case 5 coverage)
- Scope boundaries: 2/2 (explicit out-of-scope list in issue)
- Constraints: 2/2 (no new npm deps, shared substrate, `runtime` field required for cross-runtime discrimination)

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | — | Internal patterns only; no external API or framework docs needed |

## Notes / Future Considerations

- `workflow-state.md` currently carries one resume pointer per runtime. For cross-runtime projects, both `next_command` and `next_skill` should be written simultaneously so either runtime can resume. This is addressed by having the claim step (which writes `workflow-state.md`) always write both fields.
- The `kaola-workflow-next-pr` skill will be a new 9th skill. `validate-kaola-workflow-contracts.js` currently asserts exactly 8 SKILL.md files — the assertion must be bumped to 9 simultaneously with skill creation.
- Pre-commit guard (`hooks/kaola-workflow-pre-commit.sh`) is Claude-only and out of scope per issue — Codex has no equivalent hook mechanism. The guard is still effective because Codex sessions write `KAOLA_SESSION_ID` into the lock and the hook reads it.
- The `runtime: codex` field is needed in `cmdClaim` output. The Codex path will call `claim.js` with `--runtime codex` (or read `KAOLA_RUNTIME` env var). Session file should also record `runtime`.
