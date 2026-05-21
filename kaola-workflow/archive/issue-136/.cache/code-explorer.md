# Code Explorer Output — Issue #136

## scripts/kaola-workflow-roadmap.js

Commands: generate, migrate, validate, init-issue, project-name

**validate** (lines 225-239): Rebuilds ROADMAP.md content in memory from .roadmap/ source files, compares to disk. Does NOT query GitHub. Never catches closed-issue drift.

**generate** (lines 187-196): Reads all .roadmap/issue-N.md, atomically replaces ROADMAP.md via temp-file rename.

**init-issue** (lines 241-266): Creates .roadmap/issue-N.md exclusively (wx flag). Fields: issue, title, status, workflow_project, next_step.

**.roadmap/issue-N.md format**:
```
issue: #133
title: Fix GitLab/Gitea Codex init agent profile installer drift
status: open
workflow_project: issue-133
next_step: ready
```

## scripts/kaola-workflow-claim.js

**cmdFinalize** (lines 442-467): Calls archiveProjectDir, removes worktree, clears advisory claim. Does NOT touch .roadmap/ files.

**archiveProjectDir** (lines 411-440): Updates workflow-state.md (status: closed), then renames project folder to archive/. Does NOT touch .roadmap/ files or call roadmap script. This is the gap.

**cmdRelease** (lines 475-485): Calls archiveProjectDir with 'abandoned' suffix. Also does not touch .roadmap/.

## scripts/kaola-workflow-active-folders.js

**issueIsClosed()** (line 41): Calls `gh issue view N --json state` — already exported (line 118). Reusable for validate-remote.

## Phase 6 (commands/kaola-workflow-phase6.md)

**Step 7** (lines 388-442): Agent instructions to:
- `rm -f kaola-workflow/.roadmap/issue-N.md`
- `node "$ROADMAP_JS" generate`
- `git add kaola-workflow/.roadmap/issue-N.md kaola-workflow/ROADMAP.md`

This is manual agent-driven — NOT automated. Can be skipped if agent takes a different path (watch-pr auto-archive, release, etc.).

## scripts/kaola-workflow-sink-merge.js

**line 204**: Closes GitHub issue on merge but does NOT remove .roadmap/issue-N.md.

## simulate-workflow-walkthrough.js

Framework: hand-rolled assert(), spawnSync for subprocess calls, fs.mkdtempSync for isolation.

Existing roadmap tests: testRoadmapGenerateMissingSourceGuard, testRoadmapGenerateAtomicReplace, testRoadmapInitIssueConcurrentExclusive.

gh shim pattern (lines 335-345, 896-903): Create bin/gh Node script in temp dir, inject into PATH, return controlled JSON.

**Gap**: No test verifies .roadmap/issue-N.md is removed during closure.

## Fix Points

1. **archiveProjectDir in kaola-workflow-claim.js**: Read issue_number from workflow-state.md, delete .roadmap/issue-N.md, call roadmap generate. All closure paths (finalize, watch-pr, release) get it for free.
2. **validate-remote subcommand in kaola-workflow-roadmap.js**: Iterate .roadmap/ files, call gh issue view for each with status:open, flag drift. Exit 1 on drift.
3. **Regression test in simulate-workflow-walkthrough.js**: Create .roadmap/issue-N.md, run cmdFinalize (with gh shim returning closed state), assert file is gone and ROADMAP.md clean.

## Live Drifted File
kaola-workflow/.roadmap/issue-133.md — status: open, but issue #133 is closed on GitHub.
