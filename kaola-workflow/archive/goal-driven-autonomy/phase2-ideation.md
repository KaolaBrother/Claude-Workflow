# Phase 2 - Ideation: goal-driven-autonomy

## Approaches Evaluated

### Option A: Patch only Phase 1 naming

- Summary: Remove the generated folder-name prompt from Phase 1 command and Codex research skill.
- Pros: Smallest diff.
- Cons: Misses goal-driven continuation, internal advisor/expert decisions, and documentation criteria.
- Risk: High
- Complexity: Small

### Option B: Add a shared autonomy contract across workflow docs, commands, skills, and tests

- Summary: Add a durable decision policy and goal contract to router/phase surfaces, update Phase 1 naming to deterministic collision-safe creation, make Phase 2/3 internal advisor decisions autonomous, and enforce with contract tests.
- Pros: Covers both runtimes and every acceptance criterion.
- Cons: Requires coordinated wording across several instruction surfaces.
- Risk: Medium
- Complexity: Medium

### Option C: Implement a new runtime helper script for naming and policy

- Summary: Add a JS helper for deterministic project names and have docs/commands reference it.
- Pros: More executable naming behavior.
- Cons: Does not by itself change the instruction surfaces and adds maintenance overhead.
- Risk: Medium
- Complexity: Medium

## Advisor Findings

The advisor gate accepted Option B and specifically required preserving true user authorization boundaries while removing prompts for routine workflow mechanics.

## Selected Approach

Option B. It is the only option that maps directly to every issue acceptance criterion while staying within the repository's existing instruction-and-contract-test architecture.

## Out of Scope (explicit)

- Replacing the workflow runtime.
- Adding new package dependencies.
- Making destructive Git sync, issue reorganization, or unauthorized pushes automatic.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
