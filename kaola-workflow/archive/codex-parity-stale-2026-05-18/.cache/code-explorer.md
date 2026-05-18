# Code Explorer: codex-parity

## Codex Plugin Locations

- `plugins/kaola-workflow/skills/` — 8 Codex skills:
  - `kaola-workflow-init/SKILL.md`
  - `kaola-workflow-next/SKILL.md`
  - `kaola-workflow-research/SKILL.md`
  - `kaola-workflow-ideation/SKILL.md`
  - `kaola-workflow-plan/SKILL.md`
  - `kaola-workflow-execute/SKILL.md`
  - `kaola-workflow-review/SKILL.md`
  - `kaola-workflow-finalize/SKILL.md`
- `.agents/plugins/marketplace.json` — Codex private marketplace descriptor → `./plugins/kaola-workflow`
- `plugins/kaola-workflow/.codex-plugin/plugin.json` — Codex plugin descriptor v1.1.1, exposes `./skills/`

## Claude Command Inventory

- `commands/kaola-workflow-phase{1-6}.md` — 6 phase commands
- `commands/workflow-next.md` — Claude router (sweep + classify + claim + dispatch)
- `commands/workflow-next-pr.md` — PR sink variant of router
- `commands/workflow-init.md` — initialization command

## Parity Gaps (Claude has, Codex lacks)

1. **Session claim/release lifecycle** — `claim.js claim/release/heartbeat/ticker` never invoked from any Codex skill
2. **Background heartbeat ticker** — `nohup ... claim.js ticker` block in every Claude phase command; absent from Codex phase skills
3. **Branch management** — `claim.js patch-branch` cuts feature branch at claim; absent from Codex Phase 1
4. **Roadmap integration** — `roadmap.js init-issue` called by Claude Phase 1; absent from Codex research skill
5. **Parallel session safety** — `classifier.js` run by Claude router; absent from Codex next skill
6. **Sweep of stale locks** — `claim.js sweep` run by Claude router; absent from Codex next skill
7. **Sink dispatch** — `sink-merge.js` / `sink-pr.js` dispatched by Claude Phase 6; absent from Codex finalize skill
8. **PR watch** — `claim.js watch-pr` in `workflow-next-pr.md`; no Codex `kaola-workflow-next-pr` skill exists
9. **Pre-commit guard** — `hooks/kaola-workflow-pre-commit.sh` enforces write-set ownership; not wired into Codex
10. **`runtime` field** — session/lock JSON has no discriminator for which runtime created the session

## Shared Scripts (runtime-agnostic, live in `scripts/`)

- `scripts/kaola-workflow-claim.js` — all multi-session substrate: claim, release, heartbeat, ticker, sweep, status, patch-branch, watch-pr
- `scripts/kaola-workflow-sink-merge.js` — fast-forward merge sink
- `scripts/kaola-workflow-sink-pr.js` — GitHub PR sink
- `scripts/kaola-workflow-roadmap.js` — roadmap: init-issue, generate, validate
- `scripts/kaola-workflow-classifier.js` — parallel session safety verdicts (green/yellow/red)
- `scripts/kaola-workflow-repair-state.js` — Claude repair (uses `next_command`)
- `plugins/kaola-workflow/scripts/kaola-workflow-repair-state.js` — Codex repair (uses `next_skill`) — ONLY adapted copy

## Test Configuration

`package.json` v3.1.0 — test scripts already defined:
- `npm test` → `test:kaola-workflow:claude && test:kaola-workflow:codex`
- `test:kaola-workflow:claude` → `validate-workflow-contracts.js && simulate-workflow-walkthrough.js && claude plugin validate .`
- `test:kaola-workflow:codex` → `validate-kaola-workflow-contracts.js && plugins/.../simulate-kaola-workflow-walkthrough.js`

Both contract validators PASS today. Both simulators PASS today.

## Codex Simulator Current State

`plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` — 203 lines
- Tests: agent profile install (Case 1), repair-state on empty project (Case 2), repair-state phase progression through all 6 phases (Cases 3-4)
- No multi-session or cross-runtime tests
- Success string: `"Kaola-Workflow walkthrough simulation passed"`

## State Field Divergence

- Claude: `next_command: /kaola-workflow-phase{N} {project}`
- Codex: `next_skill: kaola-workflow-{phasename} {project}`
- Single `workflow-state.md` per project — two runtimes on same project need both fields

## Naming Conventions

- Codex phase skills use human-readable names: research, ideation, plan, execute, review, finalize
- Claude phase commands use numbers: phase1 through phase6
- Codex script lookup pattern: check `plugins/kaola-workflow/scripts/` first, then `$HOME/.codex/plugins/cache`

## Environment Variables

- `KAOLA_SESSION_ID` — UUID of current session; read by phase commands and pre-commit guard
- `KAOLA_SINK` — `merge` or `pr`; read by router and Phase 6 sink dispatch
- `KAOLA_WORKFLOW_OFFLINE` — `1` to disable all GitHub API calls (used in tests)
- `CLAUDE_PLUGIN_ROOT` — path to plugin root; used in Claude phase commands to locate `claim.js`

## Contract Validator Assertions (validate-kaola-workflow-contracts.js)

- 8 SKILL.md files must exist (currently met with the 8 existing skills)
- 9 agent TOML profiles must exist
- Repair script must handle `next_skill` and `next_command`
- No `model =` pin in any agent TOML

## Score: 10/10 — full codebase picture established
