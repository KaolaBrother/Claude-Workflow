# code-explorer output — issue-140

## agents/ Directory Structure

9 agent files at `agents/` top level; no `profiles/` subdirectory yet.

Current model assignments (from agent frontmatter):
- `model: sonnet` — code-architect.md:4, code-reviewer.md:4, security-reviewer.md:4, code-explorer.md:4, tdd-guide.md:4, build-error-resolver.md:4, docs-lookup.md:4
- `model: opus`   — planner.md:4 (only opus agent)
- `model: haiku`  — doc-updater.md:4

Frontmatter fields (exactly 4): `name`, `description`, `model`, `tools`

Attribution block immediately after closing `---`:
```
<!--
kaola-workflow-managed-agent: true
upstream: https://github.com/affaan-m/everything-claude-code/blob/922d2d8f8b64f4e50936e24465cb3bcac81ac0e1/agents/{file}.md
source-commit: 922d2d8f8b64f4e50936e24465cb3bcac81ac0e1
source-blob-sha: <40-char hex>
source-sha256: <64-char hex>
license: MIT License
copyright: Copyright (c) 2026 Affaan Mustafa
-->
```

## install.sh Mechanics

**Current flags** (lines 48–81):
- `-y`/`--yes` → `YES=1`
- `--forge=<value>` / `--forge <value>` → `FORGE`
- `--no-settings-merge` → `MERGE_SETTINGS=0`
- `-h`/`--help`

**Usage string** (line 44–46): `Usage: ./install.sh [--yes] [--forge=github|gitlab|gitea] [--no-settings-merge]`

**install_agent_files function** (lines 226–297):
- Iterates `REQUIRED_AGENTS` array (9 agents, line 39)
- Source: `$SCRIPT_DIR/agents/$agent.md`
- Dest: `$HOME/.claude/agents/$agent.md`
- Manifest: `$AGENTS_DIR/.kaola-workflow-agent-manifest` (tab-separated filename\tsha256)
- If dest exists and source==dest: skip with "already installed"
- If dest exists and source≠dest:
  - recorded_hash == actual_hash AND has managed marker → overwrite (managed update)
  - else → skip (user-owned/modified)
- Writes manifest with sha256 of installed file

**Key: manifest controls re-install behavior.** Override files must also update the manifest entries for their 3 agents, or switching back to `common` will fail (base install sees hash mismatch, treats as user-owned, skips).

## validate-vendored-agents.js critical constraints

- Line 39–47: `readdirSync('agents/')` filtered to `.md` files only — subdirectory `profiles/` not counted
- Checks EXACT match of 9 agents at top level → `agents/profiles/` subdirectory is SAFE
- Lines 49–66: Checks each base agent for: frontmatter, attribution block, upstream URL, source-commit, source-blob-sha, source-sha256, MIT license, copyright, name field
- Override files in `agents/profiles/higher/` are NOT validated by this script (not in expectedAgents loop)

## validate-workflow-contracts.js relevant checks

- line 126: `assertIncludes('install.sh', 'kaola-workflow-active-folders.js')` — must keep
- line 83: `assertIncludes('install.sh', '.kaola-workflow-agent-manifest')` — must keep
- No check for the --profile flag text specifically
- No check for usage string content

## npm test chain (package.json line 36)

```
node scripts/validate-script-sync.js &&
node scripts/validate-vendored-agents.js &&
bash -n install.sh uninstall.sh &&
node scripts/validate-workflow-contracts.js &&
node scripts/simulate-workflow-walkthrough.js
```

`bash -n` = syntax check only. No behavioral tests of install.sh.

## README.md relevant sections

- `## Vendored Claude Code agents` (~line 95): agent table with model assignments
- `## Installation > ### Claude Code` (~line 132): where --profile flag usage belongs

## CHANGELOG.md format

```markdown
## [Unreleased]

### Added
- **<bold title>** (issue #N): <description>
```

## Key constraints summary

1. `agents/profiles/higher/` subdirectory is safe — validator only reads top-level `.md` files
2. Override files must update the manifest (3 entries) so re-install and profile switching work correctly
3. Switching `common` → `higher` → `common` must restore sonnet agents
4. No changes to Codex TOMLs or `REQUIRED_AGENTS` array
5. `bash -n` syntax check must pass
