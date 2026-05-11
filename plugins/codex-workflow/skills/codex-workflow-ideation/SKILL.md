---
name: codex-workflow-ideation
description: Use when Phase 1 facts exist and the private Codex workflow needs approach comparison and user strategy selection.
---

# Codex Workflow Ideation

Phase 2 compares strategies. It does not write implementation code or reopen broad research unless Phase 1 has a specific gap.

## Prerequisite

Read:

```text
codex-workflow/{project}/workflow-state.md
codex-workflow/{project}/phase1-research.md
codex-workflow/{project}/.cache/research-notes.md
```

## Steps

1. Evaluate 2-3 grounded approaches from Phase 1 facts.
2. For each option, record summary, pros, cons, risk, complexity, and what not to build.
3. Perform a self-review gate: check for missing approaches, hidden risks, and overbuilt scope. Save it to `.cache/advisor-ideation.md`.
4. Present options and wait for user selection.
5. Write `phase2-ideation.md` only after selection.

## Phase File

```markdown
# Phase 2 - Ideation: {project}

## Approaches Evaluated
### Option A: ...

## Advisor Findings
summary of .cache/advisor-ideation.md

## Selected Approach
...

## Out of Scope
...

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| approach analysis | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
```

Update `workflow-state.md` with `next_skill: codex-workflow-plan {project}`.
