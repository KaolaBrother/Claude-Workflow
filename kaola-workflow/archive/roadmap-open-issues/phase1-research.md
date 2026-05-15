# Phase 1 - Research: roadmap-open-issues

## Deliverable
Finish GitHub issues #14 through #21 from the roadmap by implementing runtime fixes, plugin packaging fixes, contract checks, regression simulations, and roadmap state refresh.

## Why
The open roadmap issues describe critical and high-risk regressions in multi-session coordination, finalization, and installed Codex plugin behavior.

## Affected Area
- scripts/kaola-workflow-claim.js
- scripts/kaola-workflow-classifier.js
- scripts/kaola-workflow-sink-merge.js
- scripts/simulate-workflow-walkthrough.js
- scripts/validate-workflow-contracts.js
- scripts/validate-kaola-workflow-contracts.js
- commands/kaola-workflow-phase6.md
- plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md
- plugins/kaola-workflow/scripts/
- kaola-workflow/.roadmap/ and kaola-workflow/ROADMAP.md

## Key Patterns Found
1. scripts/kaola-workflow-claim.js owns claim, heartbeat, tiebreaker, release, sweep, watch-pr, and bootstrap behavior.
2. scripts/kaola-workflow-classifier.js already classifies issue candidates before bootstrap claim.
3. scripts/kaola-workflow-sink-merge.js has OFFLINE and FORCE_FF_FAIL support for deterministic integration tests.
4. scripts/simulate-workflow-walkthrough.js contains broad multi-session regression fixtures.
5. Codex installed plugin support lives under plugins/kaola-workflow/scripts/ and must not depend on the source repo root.

## Test Patterns
- Framework: Node assert-style integration and contract scripts.
- Location: scripts/simulate-workflow-walkthrough.js, scripts/validate-workflow-contracts.js, scripts/validate-kaola-workflow-contracts.js, plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js.
- Structure: temporary git repositories, fake gh executables, direct file assertions, command exit-code assertions.

## External Docs
none

## Completeness Score
10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | local fallback because no explicit subagent delegation was requested |
| docs-lookup | N/A | .cache/docs-lookup.md | internal behavior only |
