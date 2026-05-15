# Phase 2 - Ideation: roadmap-open-issues

## Approaches Evaluated
### Option A: One workflow project per issue
Pros: strict isolation. Cons: repeated edits to the same shared files and harder final validation.

### Option B: One umbrella project for #14-#21
Pros: matches the shared implementation surface and allows one coherent acceptance audit. Cons: requires explicit per-issue evidence mapping.

### Option C: Documentation-only correction
Pros: small diff. Cons: leaves runtime regressions unresolved.

## Advisor Findings
The advisor gate recommended Option B, with runtime fixes first, regression coverage in existing validation scripts, and plugin-local script copies after root script changes.

## Selected Approach
Use one umbrella workflow project, `roadmap-open-issues`, and close all linked issues only after each issue's acceptance criteria is covered by concrete validation evidence.

## Out of Scope
- Rewriting the workflow architecture.
- Changing public CLI names.
- Creating follow-up issues unless final acceptance audit finds incomplete work.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | local fallback because no explicit subagent delegation was requested |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | local advisor gate |
