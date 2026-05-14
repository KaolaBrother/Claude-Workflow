# Code Explorer Output — multi-session-substrate

## Summary

Full codebase exploration for implementing the multi-session substrate (issue #3).

---

## Similar Implementations

- `scripts/kaola-workflow-repair-state.js` — primary structural mirror for claim.js:
  - Top-level `try { main() } catch` with `process.exitCode = 1`
  - `process.stdout.write(...)` (never console.log)
  - `assert(condition, message)` + `throw new Error(msg)` for invariants
  - `findWorkflowLocation(cwd)` pattern walking upward from cwd
  - `isSafeName(name)` validation (blocks path traversal)
  - `field(content, name)` regex extractor for `key: value` lines in markdown
- `scripts/kaola-workflow-compact-context.js` — soft-failure model (hook runners: stderr only, no exitCode)
- `scripts/simulate-workflow-walkthrough.js` — integration test model:
  - `fs.mkdtempSync` sandboxes with `try/finally` cleanup
  - `execFileSync(process.execPath, [scriptPath], { cwd, encoding: 'utf8' })`

## Naming and File Organization

- Scripts are FLAT in `scripts/` with prefix `kaola-workflow-{verb-noun}.js`
- Issue #3 spec says `scripts/kaola-workflow/claim.js` (nested) but convention is flat
- Recommendation: name it `scripts/kaola-workflow-claim.js` or make explicit nested-dir decision
- Codex mirror scripts in `plugins/kaola-workflow/scripts/` (same base name)
- Workflow state: `kaola-workflow/{project}/workflow-state.md`
- Phase artifacts: `kaola-workflow/{project}/phase{N}-{name}.md`
- Cache: `kaola-workflow/{project}/.cache/{agent}.md`
- New gitignored dirs: `kaola-workflow/.locks/`, `kaola-workflow/.sessions/`

## Error Handling Patterns

- Hard-failure (blocking): `try { main() } catch (error) { process.stderr.write(...); process.exitCode = 1; }`
- Soft-failure (hook runners): `process.stderr.write('[kaola-workflow X skipped] ' + error.message + '\n')` with no exitCode
- Internal: `assert(cond, msg)` → throws Error
- Graceful skip: `process.stdout.write('...: skipped - reason\n')` with no error

## Test Locations, Framework, and Structure

- **Framework**: Plain Node.js, NO Jest/tap
- **Contract tests**: `scripts/validate-workflow-contracts.js` (Claude-side), `scripts/validate-kaola-workflow-contracts.js` (Codex-side)
  - Assert required strings present/absent in repo files
  - Must add: claim.js existence checks, .gitignore entries, hook file
- **Simulation tests**: `scripts/simulate-workflow-walkthrough.js`, `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
  - Must extend with epic Case 1 (two sessions, distinct session_ids, distinct locks, distinct issues)
- **npm test**: `package.json` runs both validators, both simulations, `claude plugin validate` — all must stay green

## Config & Env

- No .env files, no feature flags
- `$CLAUDE_PLUGIN_ROOT` — env var injected by Claude Code plugin runtime (hooks.json)
- `$HOME` — used in install.sh for target dirs
- `~/.config/kaola-workflow/machine-id` — NOVEL to this codebase (no precedent for ~/.config/ writes)
- No npm dependencies in scripts (stdlib only)

## External API (gh CLI)

- `gh issue edit N --add-assignee @me --add-label workflow:in-progress`
- `gh issue comment N --body <template>`
- `gh label create workflow:in-progress --color FBCA04 ... || true`
- `gh api repos/.../issues/comments/{id} -X PATCH` for heartbeat edits
- `gh issue edit N --remove-label workflow:in-progress`

## workflow-state.md Structure (Existing)

Six sections: Project, Current Position, Pending Gates, Ownership Rules, Last Evidence, Last Updated.
New Sink + Lease blocks are net-new top-level sections. No existing precedent for additional sections.

## validate-kaola-workflow-contracts.js

Validates: Codex plugin JSON, marketplace JSON, skill SKILL.md files, Codex scripts, agent TOML files, agents.toml, cross-references, package.json test entries. Must add assertions for claim.js, hook, .gitignore.

## simulate-workflow-walkthrough.js

Tests: repair script behavior, compact hook output, phase command .md file structure. Must extend with epic Case 1 (claim.js integration).

## Critical Decisions Surfaced

1. **Script location**: Flat `scripts/kaola-workflow-claim.js` vs nested `scripts/kaola-workflow/claim.js` (spec says nested, convention says flat)
2. **~/.config/ writes**: Novel; uninstall.sh doesn't clean it up
3. **git pre-commit hook installation**: install.sh must be extended; hooks/ dir is NOT for git hooks
4. **Codex parity scope**: Issue #8 owns Codex parity; issue #3 is Claude-side only — confirm this boundary

## No O_EXCL Precedent

`wx` flag / `fs.openSync` with exclusive-create is wholly net-new in this codebase.
Use: `fs.openSync(lockPath, 'wx')` — throws EEXIST if file already exists (atomic on POSIX).

## Dependencies

- Node.js stdlib: fs, path, os, crypto (randomUUID), child_process (execFileSync)
- No npm packages
- gh CLI (runtime)
