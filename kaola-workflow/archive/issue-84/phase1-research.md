# Phase 1 - Research / Discovery: issue-84

## Deliverable

Align config documentation with the live implementation for the top-priority label feature:
- correct file path: `.kaola-workflow.json` (repo root, dot-prefixed)
- correct key: `top_tier_labels`
- add a regression test proving non-default labels are loaded from the documented location

## Why

Users following the setup guide will create `kaola-workflow/config.json` with `priority_top_tier_labels` — which the implementation silently ignores, falling back to `['P0', 'P1']`. The feature appears broken to users with non-standard label names.

## Affected Area

**Implementation (correct — do not change):**
- `scripts/kaola-workflow-claim.js:62-70` — `readPriorityConfig(root)` reads `.kaola-workflow.json` + `top_tier_labels`
- `plugins/kaola-workflow/scripts/kaola-workflow-claim.js:62-70` — vendored copy, identical

**Docs to fix:**
- `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md:83`
- `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md:83`
- `commands/workflow-init.md:136`
- `plugins/kaola-workflow-gitlab/commands/workflow-init.md:136`
- `CHANGELOG.md:306`

**Test to add:**
- `scripts/simulate-workflow-walkthrough.js` — new test function covering `readPriorityConfig`

## Key Patterns Found

1. `readPriorityConfig(root)` — `scripts/kaola-workflow-claim.js:62-70` — single-layer JSON read with array type guard and fallback default `['P0', 'P1']`
2. Docs line pattern — `SKILL.md:83`, `commands/workflow-init.md:136` — all four files share identical wrong text; can be fixed with exact string replacement
3. Test pattern — `simulate-workflow-walkthrough.js` — `spawnSync` against claim subcommands in a tmpdir, `assert.strictEqual` on stdout JSON fields

## Test Patterns

- Framework: hand-rolled `assert` (no test framework)
- Location: `scripts/simulate-workflow-walkthrough.js`
- Structure: `function test*() { tmpdir + arrange + spawnSync + JSON.parse(stdout) + assert }`, then called at end of file
- No existing test for `readPriorityConfig` / `top_tier_labels`

## Config & Env

- `KAOLA_WORKFLOW_OFFLINE=1` — used in tests to skip network calls
- `.kaola-workflow.json` at repo root — only file for priority label config
- `~/.config/kaola-workflow/config.json` — classifier only (`parallel_mode`, `pr_auto_merge`), unrelated

## External Docs

None — internal behavior only.

## GitHub Issue

kaola-workflow#84

## Completeness Score

9/10

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | internal patterns sufficient; no external APIs or frameworks involved | |

## Notes / Future Considerations

- `README.md` does not document the priority label sorting feature at all. Out of scope for this issue (AC only covers SKILL.md and commands docs).
- `docs/api.md` also silent on this feature. Deferred.
- `docs/investigations/` files reference old design; they are investigation artifacts and do not need correction.
