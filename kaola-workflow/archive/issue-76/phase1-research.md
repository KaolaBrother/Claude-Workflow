# Phase 1 - Research: issue-76

## Deliverable

Vendor the 9 Claude Code agent files needed by Kaola-Workflow, install them through `install.sh`, clean them through `uninstall.sh`, and remove ECC as an external install prerequisite.

## Why

The current installer blocks no-stdin installs on a missing ECC prompt before Kaola commands/support files are copied. Users should be able to run the documented `curl | bash` install path without pre-installing ECC.

## Affected Area

- `install.sh`
- `uninstall.sh`
- `README.md`
- `package.json`
- `agents/*.md`
- `docs/agents-source.md`
- `scripts/validate-vendored-agents.js`
- `kaola-workflow/issue-76/*` workflow artifacts

## Key Patterns Found

1. `install.sh` performs plugin safety checks, stale cleanup, command copy, support script copy, hooks copy, and verification in a single Bash flow.
2. `install.sh` currently checks ECC agent presence before command installation, which is the no-stdin failure point.
3. `uninstall.sh` uses explicit paths and glob patterns; agent cleanup should use explicit required names plus a Kaola marker check.
4. Validators are plain Node scripts with `assert` helpers and are wired through `package.json` scripts.
5. Package publication is controlled by `package.json.files`; new root assets must be added there explicitly.

## Test Patterns

- Framework: Bash smoke checks and Node assertion validators.
- Location: `scripts/*.js`, `package.json` scripts.
- Structure: deterministic scripts that exit nonzero with actionable messages.

## External Docs

- Upstream source and license checked via GitHub for `affaan-m/everything-claude-code`.
- Pinned source commit: `922d2d8f8b64f4e50936e24465cb3bcac81ac0e1`.

## Completeness Score

9/10

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | `.cache/code-explorer.md` | Performed in current Codex session |
| docs-lookup | invoked | `.cache/docs-lookup.md` | Performed in current Codex session |
