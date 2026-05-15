# Phase 2 - Ideation: issue-24

## Approaches Evaluated

### Option A: Prompt-only hardening

Strengthen router and phase wording so agents are told more explicitly to run bootstrap first.

- Pros: small patch.
- Cons: does not address the real failure mode; prompt text can still be skipped.
- Risk: leaves parallel sessions brittle.
- Complexity: low.

### Option B: Extend `bootstrap`

Put receipt writing and issue sync into the existing `bootstrap` command.

- Pros: reuses current command and tests.
- Cons: does not clearly separate the stronger startup contract from legacy bootstrap behavior.
- Risk: prompts may still treat startup as a loose block rather than a single invariant.
- Complexity: medium.

### Option C: Add a mandatory `startup` transaction

Add a `startup` command that performs issue sync, roadmap generation, sweep, watch-pr, owned-work detection, candidate ordering/classification, claim, receipt writing, and structured output.

- Pros: directly implements the design lock; gives router/phase prompts and tests a concrete invariant.
- Cons: larger script/test update.
- Risk: root and packaged Codex scripts must remain mirrored.
- Complexity: medium-high.

## Advisor Findings

See `.cache/advisor-ideation.md`. The advisor recommendation is Option C, with `bootstrap` retained for compatibility and the new prompts routed through `startup`.

## Selected Approach

Implement Option C.

## Out of Scope

- Full priority framework beyond `workflow:queued` plus stable issue number ordering.
- Removing offline support.
- Making `ROADMAP.md` the canonical selector when GitHub is available.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
