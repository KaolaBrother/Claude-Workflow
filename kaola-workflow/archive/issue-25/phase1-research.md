# Phase 1 - Research: issue-25

## Deliverable

Harden Kaola-Workflow handoff and phase entry so a session whose startup receipt did not acquire or own a project cannot take over active work unless local owner liveness checks prove the owner is gone or the user explicitly requests a force takeover.

## Why

The issue #16 incident showed startup worked correctly, but the losing session later used `handoff` to overwrite a live lock. The fix must move this decision into script-level guards so agents do not infer expiry or ownership from prose.

## Affected Area

- `scripts/kaola-workflow-claim.js`
- `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
- `commands/workflow-next.md`
- `commands/kaola-workflow-phase*.md`
- `plugins/kaola-workflow/skills/kaola-workflow-*/SKILL.md`
- `scripts/simulate-workflow-walkthrough.js`
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- root and packaged contract validators

## Key Patterns Found

1. `scripts/kaola-workflow-claim.js:273` - startup receipt path exists but has no verifier.
2. `scripts/kaola-workflow-claim.js:778` - startup writes `claim: "none"` when no work is available.
3. `scripts/kaola-workflow-claim.js:938` - `cmdHandoff` rewrites lock/session ownership unconditionally.
4. `scripts/kaola-workflow-claim.js:1139` - ticker pid files already provide local liveness evidence.
5. `commands/kaola-workflow-phase1.md` and packaged skills - startup receipt guard is prose, not a script-level authorization check.
6. `scripts/simulate-workflow-walkthrough.js` Case 8K and packaged Case 5g currently encode permissive handoff expectations.

## Test Patterns

- Framework: Node.js simulation scripts using `assert`, `execFileSync`, and temporary git/workflow folders.
- Location: root walkthrough and packaged Codex walkthrough simulations.
- Structure: scenario blocks create claims, locks, session files, and command invocations, then assert exit codes and file content.

## External Docs

none

## Completeness Score

9/10

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | current session fallback because subagent delegation was not explicitly requested |
| docs-lookup | N/A | .cache/docs-lookup.md | internal Node.js/script behavior only |
