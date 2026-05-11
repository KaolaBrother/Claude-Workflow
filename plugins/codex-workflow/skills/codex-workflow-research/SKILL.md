---
name: codex-workflow-research
description: Use when beginning Phase 1 of Claude-Workflow for Codex, also called claude-workflow, and gathering facts before strategy or implementation.
---

# Codex Workflow Research

Phase 1 discovers facts only. Do not choose a solution or edit implementation files.

## Steps

1. Parse the request:
   - deliverable
   - user value
   - affected area
   - success criteria
   - linked issue, or `none`
2. Create `codex-workflow/_phase1-pending/` until the project name is confirmed.
3. Inspect relevant files, tests, config, docs, and issues. Use official docs only when current external behavior matters.
4. Write raw notes to `.cache/research-notes.md` and `.cache/docs-notes.md` when external docs are used.
5. Score completeness from 0-10. Stop and ask if below 7.
6. Confirm a 2-4 word kebab-case project name.
7. Write `codex-workflow/{project}/phase1-research.md` and update `workflow-state.md`.

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
| research evidence | invoked | .cache/research-notes.md | |
| docs lookup | invoked/N/A | .cache/docs-notes.md or docs-impact check | reason if N/A |
```

State next pointer: `next_skill: codex-workflow-ideation {project}`.
