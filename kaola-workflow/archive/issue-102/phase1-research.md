# Phase 1 - Research: issue-102

## Deliverable
Fix issue #102 so `install-codex-agent-profiles.js` does not inject a duplicate `[features]` table into an existing `.codex/config.toml`.

## Why
Duplicate TOML table headers make Codex fail to load `config.toml`, breaking workflow installation for users whose config already has a `[features]` section.

## Affected Area
Codex plugin installer path:
- `plugins/kaola-workflow/scripts/install-codex-agent-profiles.js`
- `plugins/kaola-workflow/config/agents.toml`
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`

## Key Patterns Found
1. `plugins/kaola-workflow/scripts/install-codex-agent-profiles.js:27` - `managedBlock()` reads the entire `config/agents.toml` template and wraps it in managed markers.
2. `plugins/kaola-workflow/config/agents.toml:1` - the template starts with `[features]`, so the managed block always contains a features table today.
3. `plugins/kaola-workflow/scripts/install-codex-agent-profiles.js:61` - `updateConfig()` reads the existing target config before constructing and upserting the managed block.
4. `plugins/kaola-workflow/scripts/install-codex-agent-profiles.js:32` - `upsertBlock()` replaces an existing managed block or appends a new one, but does not inspect TOML tables outside the managed block.
5. `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js:35` - the Codex simulation already creates temp fixtures and is the narrowest place for an installer regression test.
6. `package.json:37` - `npm run test:kaola-workflow:codex` runs the Codex contract validator and simulation.

## Test Patterns
- Framework: Node script with hand-rolled `assert`.
- Location: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`.
- Structure: create temp project, run installer script with `spawnSync`, inspect `.codex/config.toml`, assert managed block and table counts.

## External Docs
none - local TOML config generation behavior only.

## Completeness Score
9/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | local-fallback-tool-unavailable | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | Local script behavior; no external API or current docs impact. |
