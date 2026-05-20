# Phase 1 - Research / Discovery: issue-124

## Deliverable
Extend `npm test` to include `test:kaola-workflow:gitlab` and `test:kaola-workflow:gitea`, and add contract assertions in `validate-kaola-workflow-contracts.js` so future changes cannot silently drop GitLab/Gitea from the release validation surface.

## Why
`npm test` currently only runs the Claude/GitHub and Codex paths. GitLab and Gitea parity tests exist as opt-in targets but are excluded from default release validation. A release can pass `npm test` while GitLab/Gitea workflows regress — increasingly risky now that Gitea/GitLab parity depends on separate sink, forge, command, skill, and walkthrough code.

## Affected Area
- `package.json` lines 34-35 — extend `test` script
- `scripts/validate-kaola-workflow-contracts.js` line 242 — add two `assertIncludes` guards
- `docs/agents-source.md` line 40 — review for redundancy (manual mention may become stale once gitlab is in default chain)
- `README.md` lines 381-388 — no change needed if `npm test` is extended directly

## Key Patterns Found
1. `assertIncludes('package.json', 'test:kaola-workflow:codex')` at `scripts/validate-kaola-workflow-contracts.js:242` — exact pattern to replicate for gitlab and gitea guards
2. `"test": "npm run test:kaola-workflow:claude && npm run test:kaola-workflow:codex"` at `package.json:35` — extend with `&& npm run test:kaola-workflow:gitlab && npm run test:kaola-workflow:gitea`
3. Each validate script is self-contained with its own `assert`/`assertIncludes` helpers — no shared module to import

## Test Patterns
- Framework: hand-rolled assert (no Jest/Mocha)
- Location: `scripts/simulate-workflow-walkthrough.js` (main), `scripts/validate-*.js` (contract guards)
- Structure: named test functions called from `main()` sequentially; `assertIncludes(file, substring)` for contract checks

## Config & Env
- No env vars needed
- No feature flags
- All scripts use Node.js built-ins only (`fs`, `path`, `child_process`)

## External Docs
None required — all internal patterns.

## GitHub Issue
KaolaBrother/Kaola-Workflow#124

## Completeness Score
10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | internal patterns sufficient; no external library/API behavior needed |

## Notes / Future Considerations
- Extending `test` directly (not adding a `test:all` target) is the simpler path and keeps README unchanged
- `docs/agents-source.md:40` currently documents `npm run test:kaola-workflow:gitlab` as a manual step for vendored-agent updates — once it's in the default chain, that line should be reviewed to avoid confusion
- The two new `assertIncludes` guards should be added immediately after the existing codex guard at line 242
