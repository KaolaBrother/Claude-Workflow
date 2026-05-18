# TDD Task 2 — workflow-next.md doc subsections

## Modified Files
- `plugins/kaola-workflow-gitlab/commands/workflow-next.md`

## Changes Applied

### Subsection 1 — Git Freshness Block Recovery (line 142)
Inserted after Step 1 body (line 140), before `## Startup Step 2` (now line 162).
Uses `_KAOLA_PROJECT` and `_KAOLA_CLAIM` (inline-extracted from $STARTUP_OUT) — correct for GitLab since Step 0b only exports KAOLA_WORKTREE_PATH.

### Subsection 2 — Co-active Folders Advisory (line 208)
Inserted at end of Step 3 body (after `/kaola-workflow-phase1` code block at line 206), before `## Co-active Folders` (now line 214).

## RED Evidence
N/A — documentation file, no automated tests.

## GREEN Evidence
File structure verified: both subsections in correct positions, code fences balanced, heading hierarchy intact.

## Deviations
None.
