# Phase 1 - Research: issue-55

## Deliverable

Create the GitLab sibling-plugin skeleton, add Claude and Codex manifests, and wire manual install/uninstall plus package script placeholders without implementing production `glab` workflow logic.

## Why

Issue #55 unblocks the dependent GitLab migration work (#56 scripts, #57 commands/skills/hooks, #58 tests). The skeleton must establish correct layout and manifest plumbing first so later issues can work in isolated paths without touching `plugins/kaola-workflow/`.

## Affected Area

- `plugins/kaola-workflow-gitlab/` new sibling plugin tree
- `.claude-plugin/marketplace.json`
- `.agents/plugins/marketplace.json`
- `install.sh`
- `uninstall.sh`
- `package.json`
- validation coverage for manifest parsing

## Key Patterns Found

1. `install.sh:19` - manual commands install target is `$HOME/.claude/commands`.
2. `install.sh:20-25` - support paths are hard-coded to `$HOME/.claude/kaola-workflow`, root `commands/`, root `scripts/`, and root `hooks/`.
3. `install.sh:36-49` - argument parser only supports `--yes` and `--help`.
4. `install.sh:113-190` - installer verifies every expected command/script/hook, so GitLab skeleton mode needs an explicit empty-source allowance until #56/#57 populate files.
5. `uninstall.sh:7-36` - uninstall removes current command names and `$HOME/.claude/kaola-workflow` only; no forge selector exists.
6. `package.json:35-37` - test scripts have no `test:kaola-workflow:gitlab` placeholder.
7. `.claude-plugin/marketplace.json:8-12` - Claude marketplace currently exposes only `kaola-workflow`.
8. `.agents/plugins/marketplace.json:6-17` - Codex marketplace currently exposes only `kaola-workflow`.
9. `.claude-plugin/plugin.json:3` - Claude manifest version source is `3.6.1`.
10. `plugins/kaola-workflow/.codex-plugin/plugin.json:3` - Codex manifest version source is `1.3.1`.

## Test Patterns

- Framework: shell syntax checks, Node JSON parsing, existing package scripts, Claude plugin validator.
- Location: `package.json` scripts; direct commands from issue #55 acceptance criteria.
- Structure:
  - `bash -n install.sh uninstall.sh`
  - isolated `HOME=$(mktemp -d)` installer/uninstaller smoke tests
  - `node -e` JSON parse checks for package and plugin manifests
  - `claude plugin validate .`
  - `npm test` or documented pre-existing failure evidence

## External Docs

None required. The work is local scaffolding and installer routing. `.cache/docs-lookup.md` records the skip rationale.

## Completeness Score

8/10

Remaining uncertainty is implementation-level behavior of `claude plugin validate .` after adding a second local plugin source, but the existing root marketplace structure and local CLI gate are enough to proceed.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | `.cache/code-explorer.md` | |
| docs-lookup | N/A | `.cache/docs-lookup.md` | External behavior is not needed for this local skeleton issue |
