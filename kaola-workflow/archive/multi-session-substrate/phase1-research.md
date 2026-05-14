# Phase 1 - Research / Discovery: multi-session-substrate

## Deliverable

`scripts/kaola-workflow-claim.js` — Node.js script with subcommands: `claim`, `release`, `heartbeat`, `sweep`, `status`. Plus: session identity files (`kaola-workflow/.sessions/{session-id}.json`), local lock files (`kaola-workflow/.locks/issue-{N}.lock`, O_EXCL), GitHub-side claim (assignee + label + sentinel comment), `hooks/kaola-workflow-pre-commit.sh` (blocks cross-session commits), `.gitignore` additions, `workflow-state.md` Sink + Lease blocks, `install.sh` extended to install git pre-commit hook. Validators and simulation extended for epic Case 1.

**Naming decision**: Issue spec says `scripts/kaola-workflow/claim.js` (nested subdirectory) but existing convention is flat `scripts/kaola-workflow-{verb}.js`. Adopt flat convention: `scripts/kaola-workflow-claim.js`. This avoids breaking `install.sh`, `validate-workflow-contracts.js`, and `package.json` `files` array.

## Why

Multiple Claude Code or Codex sessions opened manually by the user must be able to work on different GitHub issues simultaneously without conflict. The lease substrate is the foundation that all later stages (branch-per-issue, roadmap split, classifier, PR sink, Codex parity, cross-machine hardening) depend on.

## Affected Area

| Path | Change |
|------|--------|
| `scripts/kaola-workflow-claim.js` | NEW — claim/release/heartbeat/sweep/status |
| `hooks/kaola-workflow-pre-commit.sh` | NEW — blocks cross-session commits |
| `install.sh` | EXTEND — install pre-commit hook into .git/hooks/ or core.hooksPath |
| `.gitignore` | ADD — kaola-workflow/.locks/, kaola-workflow/.sessions/ |
| `scripts/validate-workflow-contracts.js` | EXTEND — assert new files + .gitignore entries |
| `scripts/simulate-workflow-walkthrough.js` | EXTEND — epic Case 1 (two sessions, distinct locks) |
| `kaola-workflow/{project}/workflow-state.md` (schema) | ADD — Sink + Lease blocks |
| `~/.config/kaola-workflow/machine-id` | NEW (runtime, not in repo) |

Codex-side parity (`plugins/kaola-workflow/scripts/`) is explicitly deferred to issue #8.

## Key Patterns Found

1. Hard-failure wrapper: `try { main() } catch (error) { process.stderr.write(msg); process.exitCode = 1; }` — `scripts/kaola-workflow-repair-state.js:360-365`
2. Output convention: `process.stdout.write(...)` never `console.log` — all four existing scripts
3. Internal assertion: `function assert(cond, msg) { if (!cond) throw new Error(msg); }` — all four scripts
4. Workflow-dir finder: `findWorkflowLocation(cwd)` walking upward from cwd — `scripts/kaola-workflow-repair-state.js`
5. Safe name check: `isSafeName(name)` blocking `/`, `\`, `.`, `..` — `scripts/kaola-workflow-repair-state.js`
6. State field extractor: `field(content, name)` regex for `key: value` lines — `scripts/kaola-workflow-repair-state.js`
7. Simulation sandbox: `fs.mkdtempSync` + `try/finally fs.rmSync(tmp, { recursive: true, force: true })` — `scripts/simulate-workflow-walkthrough.js`
8. Subprocess invocation: `execFileSync(process.execPath, [scriptPath], { cwd, encoding: 'utf8' })` — `scripts/simulate-workflow-walkthrough.js`

## Test Patterns

- **Framework**: Plain Node.js — no Jest, no tap
- **Location**: `scripts/validate-workflow-contracts.js` (static), `scripts/simulate-workflow-walkthrough.js` (dynamic)
- **Structure**: `assert(condition, message)` throws; dynamic tests use `fs.mkdtempSync` sandbox + `execFileSync`
- **npm test**: runs validators → simulations → `claude plugin validate` (all must stay green)
- **New test coverage needed**:
  - validate-workflow-contracts.js: assert `scripts/kaola-workflow-claim.js` exists, assert `.gitignore` entries, assert hook file exists
  - simulate-workflow-walkthrough.js: epic Case 1 — two sessions write distinct session files, second `claim` on same issue returns non-zero, sweep clears expired locks

## Config & Env

- `$CLAUDE_PLUGIN_ROOT` — Claude Code plugin runtime (hooks.json)
- `$HOME` — install.sh target dirs
- `~/.config/kaola-workflow/machine-id` — stable machine+user identifier (novel to codebase; uninstall.sh will not clean it up — acceptable for informational-only identity file)
- No npm dependencies — Node.js stdlib only: `fs`, `path`, `os`, `crypto`, `child_process`
- No .env files, no feature flags

## External Docs

None required. All implementation uses Node.js stdlib and well-known `gh` CLI commands.

## GitHub Issue

KaolaBrother/Kaola-Workflow#3

## Completeness Score

10/10

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | Internal patterns sufficient; Node.js stdlib + known gh CLI, no external API behavior needed |

## Notes / Future Considerations

- **Script naming**: Spec says `scripts/kaola-workflow/claim.js` but flat convention (`scripts/kaola-workflow-claim.js`) avoids touching install.sh/validator/package.json files array. Flat name chosen.
- **~/.config/ writes**: Novel to codebase. machine-id is informational only; acceptable risk.
- **Codex parity**: Deferred to issue #8. Claude-side only for issue #3.
- **Cross-machine race**: Deferred to issue #9. Single-machine O_EXCL is sufficient for this stage.
- **Heartbeat in-phase ticker**: Deferred to issue #9. Phase-boundary heartbeats only for now.
- **Pre-commit hook installation**: `install.sh` must write to `.git/hooks/pre-commit` or configure `core.hooksPath`. Files in `hooks/` are not auto-active git hooks.
- **workflow-state.md Sink/Lease blocks**: Net-new top-level `## Sink` and `## Lease` sections. Phase 1 does not cut branches yet — `branch: TBD` in Sink block.
