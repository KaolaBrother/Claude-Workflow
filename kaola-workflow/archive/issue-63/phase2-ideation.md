# Phase 2 - Ideation: issue-63

## Selected Direction

Use the full simplification patch in `workflow/issue-63` and leave #64's separate active worktree untouched. This is the direct path to unblock #65 because #66 requires #63 to be closed before GitLab work begins.

## Decision Rationale

- The patch already introduces `kaola-workflow-active-folders.js` as the shared reader.
- The legacy coordination layer is removed rather than adapted.
- The patch updates commands, hooks, skills, validators, simulators, README, and installer surfaces together.
- The implementation keeps the current sibling GitLab skeleton untouched while unblocking the new post-#63 GitLab track.

## Risk Controls

- Preserve unrelated main-worktree #64 artifacts.
- Do not reuse or overwrite the active #64 worktree.
- Validate with `npm test`, direct Codex contract validation, retired-token grep, and line-count checks.
