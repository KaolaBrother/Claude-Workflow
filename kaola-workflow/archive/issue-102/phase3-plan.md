# Phase 3 - Plan: issue-102

## Files To Modify

| File | Purpose | Key Interfaces |
|------|---------|----------------|
| `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | Regression coverage for Codex installer config generation | `spawnSync`, temp project fixture, config content assertions |
| `plugins/kaola-workflow/scripts/install-codex-agent-profiles.js` | Prevent duplicate `[features]` injection | `managedBlock(existing)`, `upsertBlock(existing, block)`, `updateConfig()` |
| `CHANGELOG.md` | Release note for user-visible installer bug fix | `[Unreleased]` entry |

## Ordered Build Sequence

### Task 1: Add Codex installer regression
- File: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- Test File: same
- Write Set: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- Depends On: none
- Parallel Group: serial
- Action: MODIFY
- Implement: add helper to run the installer in a temp project; assert fresh configs get the managed `[features]` stanza; assert configs with external `[features]` have exactly one `[features]` after two installer runs.
- Mirror: existing temp-dir and hand-rolled `assert` style in the same simulation file.
- Validate: `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` should fail before Task 2 and pass after Task 2.

### Task 2: Strip duplicate-prone template stanza
- File: `plugins/kaola-workflow/scripts/install-codex-agent-profiles.js`
- Test File: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- Write Set: `plugins/kaola-workflow/scripts/install-codex-agent-profiles.js`
- Depends On: Task 1
- Parallel Group: serial
- Action: MODIFY
- Implement: detect external top-level `[features]` outside the managed block; when present, remove the top-level `[features]` stanza from the injected template before wrapping it with managed markers.
- Mirror: current dependency-free Node script style and marker-scoped text operations.
- Validate: `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`.

### Task 3: Release note
- File: `CHANGELOG.md`
- Test File: N/A
- Write Set: `CHANGELOG.md`
- Depends On: Task 2
- Parallel Group: serial
- Action: MODIFY
- Implement: add concise `[Unreleased]` bug-fix entry for issue #102.
- Mirror: existing changelog issue entries.
- Validate: `rg -n "issue #102|issue-102|102" CHANGELOG.md`.

### Task 4: Full validation
- File: N/A
- Test File: N/A
- Write Set: N/A
- Depends On: Tasks 1-3
- Parallel Group: serial
- Action: VALIDATE
- Implement: run focused and full workflow tests.
- Mirror: `CLAUDE.md` and package scripts.
- Validate:
  - `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
  - `npm run test:kaola-workflow:codex`
  - `node scripts/simulate-workflow-walkthrough.js`
  - `npm test`

## Safe Parallel Groups
None. The regression and implementation are intentionally serial because Task 1 should define the failing behavior before Task 2 changes it.

## Explicit Out Of Scope
- Full TOML parser dependency.
- Editing user-owned `[features]` tables.
- Changing `plugins/kaola-workflow/config/agents.toml`.
- GitLab installer changes unless an equivalent script is found.
- README, API, architecture, or `.env.example` updates.

## Required Agent Compliance

Plain `invoked` is intentional for non-Codex-role workflow gates such as
advisor plan review; delegation vocabulary applies only to Codex role rows like
`code-architect`.

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | local-fallback-tool-unavailable | .cache/code-architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| blueprint revisions | N/A | .cache/advisor-plan.md | Advisor found no required revisions. |
