---
name: kaola-workflow-research
description: Use when beginning Phase 1 of Kaola-Workflow for Codex, also called kaola-workflow, and gathering facts before strategy or implementation.
---

# Kaola-Workflow Research

Phase 1 discovers facts only. Do not choose a solution or edit implementation files.

## Steps

1. Parse the request:
   - deliverable
   - user value
   - affected area
   - success criteria
   - linked issue, or `none`
2. Create `kaola-workflow/_phase1-pending/` until the project name is confirmed.
3. Inspect relevant files, tests, config, docs, and issues. Use the `code-explorer` Codex agent role when subagents are available; otherwise perform the same read-only research in the current session.
4. Use the `docs-lookup` Codex agent role only when current external behavior matters; otherwise record why docs lookup is N/A.
5. Write raw notes to `.cache/code-explorer.md` and `.cache/docs-lookup.md` when used.
6. Score completeness from 0-10. Stop and ask if below 7.
7. Confirm a 2-4 word kebab-case project name.
8. Write `kaola-workflow/{project}/phase1-research.md` and update `workflow-state.md`.

## Phase File

```markdown
# Phase 1 - Research: {project}

## Deliverable
...

## Why
...

## Affected Area
...

## Key Patterns Found
1. path:line - fact

## Test Patterns
- Framework:
- Location:
- Structure:

## External Docs
links or none

## Completeness Score
X/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | invoked/N/A | .cache/docs-lookup.md or docs-impact check | reason if N/A |
```

State next pointer: `next_skill: kaola-workflow-ideation {project}`.
