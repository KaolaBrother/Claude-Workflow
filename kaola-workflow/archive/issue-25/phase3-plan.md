# Phase 3 - Plan: issue-25

## Implementation Tasks

| ID | Task | Owner | Status | Validation |
|----|------|-------|--------|------------|
| T1 | Add startup verifier, handoff decision, local owner liveness checks, and force takeover flag to `scripts/kaola-workflow-claim.js`; mirror to packaged Codex script. | current session | complete | syntax check, root and packaged simulations |
| T2 | Wire router, Claude phase commands, Codex router skill, and Codex phase skills to stop on unauthorized startup receipts and guarded handoff. | current session | complete | root and Codex contract validators |
| T3 | Add regressions for live-owner handoff rejection, forced takeover, receipt mismatch, and `claim:none`; bump release versions and changelog. | current session | complete | `npm test`, `git diff --check` |

## Dependencies

- T2 depends on T1 command names and exit semantics.
- T3 depends on T1/T2 being present in both root and packaged plugin surfaces.

## Advisor Findings

The advisor plan gate requires direct `handoff` coverage, `can-handoff`
coverage, verifier coverage for success/mismatch/`claim:none`, mirrored packaged
scripts, and version bumps.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
