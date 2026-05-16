# Phase 4 - Execute: issue-25

## Tasks

| ID | Task | Status | Evidence |
|----|------|--------|----------|
| T1 | Add script-level startup verifier and guarded handoff. | complete | `scripts/kaola-workflow-claim.js`, `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` |
| T2 | Wire Claude and Codex router/phase surfaces to the executable guard. | complete | `commands/workflow-next.md`, `commands/kaola-workflow-phase*.md`, `plugins/kaola-workflow/skills/kaola-workflow-*/SKILL.md` |
| T3 | Add regressions and release version bump. | complete | root/plugin simulations, validators, `CHANGELOG.md`, package/plugin manifests |

## Failure Routing Ledger

| Failure | Routed To | Status | Notes |
|---------|-----------|--------|-------|
| Root router exceeded 250-line thin-router budget. | current session | fixed | Compressed startup and co-active lease wording; validator passed. |
| Root/plugin live Claude JSONL fixture used symlinked temp path. | current session | fixed | Fixture now uses `fs.realpathSync(...)` to match script project encoding. |

## Validation

| Command | Result |
|---------|--------|
| `node --check scripts/kaola-workflow-claim.js` | pass |
| `node --check plugins/kaola-workflow/scripts/kaola-workflow-claim.js` | pass |
| `node --check scripts/simulate-workflow-walkthrough.js` | pass |
| `node --check plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | pass |
| `node scripts/validate-workflow-contracts.js` | pass |
| `node scripts/validate-kaola-workflow-contracts.js` | pass |
| `node scripts/simulate-workflow-walkthrough.js` | pass |
| `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | pass |
| `npm test` | pass |
| `git diff --check` | pass |

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| tdd-guide | invoked | .cache/tdd-task-1.md | current session fallback because subagent delegation was not explicitly requested |
| build-error-resolver | invoked | phase4-progress.md Failure Routing Ledger | current session fallback; failures were local validation regressions |
