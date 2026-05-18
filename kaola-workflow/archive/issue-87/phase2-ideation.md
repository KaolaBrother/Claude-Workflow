# Phase 2 - Ideation: issue-87

## Approaches Evaluated

### Option A: Minimal GitHub Helper Port

- Summary: Port the GitHub roadmap hardening helpers into the GitLab roadmap script and adjust only terminology/header checks.
- Pros: Directly matches the issue's source-of-truth behavior; low conceptual risk; easy to test against existing GitHub regression patterns.
- Cons: Some helper duplication remains between GitHub and GitLab scripts.
- Risk: Low.
- Complexity: Small.
- What not to build: no shared library extraction, no new config flag, no behavior change outside roadmap generation and explicit `init-issue`.

### Option B: Patch `cmdInitIssue()` Only

- Summary: Use exclusive creation only for GitLab `init-issue`, leaving generated roadmap writes as direct `writeFileSync()`.
- Pros: Very small patch.
- Cons: Fails the missing-source guard and atomic `ROADMAP.md` acceptance criteria.
- Risk: Medium because tests could pass for duplicate init while the larger issue remains.
- Complexity: Very small.
- What not to build: this cannot be the full fix.

### Option C: General Roadmap Persistence Refactor

- Summary: Create a more general write layer for GitLab roadmap source and generated files.
- Pros: Could make future write policies explicit.
- Cons: Larger churn than needed; no cross-script reuse unless GitHub is also refactored, which is out of scope.
- Risk: Medium.
- Complexity: Medium.
- What not to build: no shared persistence abstraction.

## Advisor Findings

The advisor gate recommends Option A. The key watchpoint is preserving `refreshFromGitLab()` update semantics for existing remote issue records while making user/agent-directed `init-issue` exclusive and accurately reported.

## Selected Approach

Option A: minimal GitHub helper port.

Rationale: it satisfies every acceptance criterion with the least behavioral surface. GitLab gets the same guard and atomic output path as GitHub, while remote refresh remains an update path and explicit `init-issue` becomes exclusive.

## Out of Scope

- Refactoring GitHub and GitLab roadmap scripts into a shared module.
- Changing GitLab issue fetching or priority behavior.
- Cleaning stale local roadmap records unrelated to issue #87.
- Changing the generated roadmap table schema.

## Required Agent Compliance

Plain `invoked` is intentional for non-Codex-role workflow gates such as advisor review; delegation vocabulary applies only to Codex role rows like `planner`.

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | local-fallback-explicit | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
