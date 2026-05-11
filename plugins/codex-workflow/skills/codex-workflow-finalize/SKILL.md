---
name: codex-workflow-finalize
description: Use when reviewed private Codex workflow work needs final validation, documentation docking, issue or roadmap closure, archiving, and Git finalization.
---

# Codex Workflow Finalize

Phase 6 proves the work is complete and records closure metadata.

## Guardrails

- Run or cite fresh final validation before claiming completion.
- Do not close issues until acceptance criteria pass.
- Do not archive incomplete workflow folders.
- Do not stage unrelated user changes.
- Commit And Push happens after docs, issues, roadmap, archive, and metadata are complete.

## Required Steps

1. Final validation: run the full relevant project commands once against the final candidate state. Save output to `.cache/final-validation.md`.
2. Acceptance check: verify Phase 1 success criteria, Phase 3 tasks, tests, review status, and absence of debug artifacts.
3. Documentation update: update docs only when behavior, API, setup, architecture, env, roadmap, or user-facing workflow changed. Save output to `.cache/doc-updater.md` or write a no-impact reason.
4. Documentation Docking: compare changed files with `README.md`, API docs, architecture docs, changelog, `.env.example`, roadmap, and issue comments when relevant. Save `.cache/doc-docking.md` with verdict `DOCKED` or `BLOCKED`.
5. Closure decision: scan all phase files for deferred items or user decisions. Ask before reorganizing issues or roadmap.
6. Refresh `codex-workflow/ROADMAP.md`.
7. Archive `codex-workflow/{project}/` to `codex-workflow/archive/{project}/`.
8. Commit and push only approved files.

## Summary File

```markdown
# Phase 6 - Summary: {project}

## Delivered
...

## Final Validation Evidence
command, result, evidence path

## Documentation Docking
DOCKED, .cache/doc-docking.md

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| final validation | invoked | .cache/final-validation.md | |
| documentation docking | invoked | .cache/doc-docking.md | |
| roadmap refresh | invoked | codex-workflow/ROADMAP.md | |
| archive completed folder | invoked | codex-workflow/archive/{project} | |
| final commit and push | invoked | git status --short --branch | clean and synced |
```

State remains in `workflow-state.md` until archive is complete.
