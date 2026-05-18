# Code Explorer Notes: issue-67

## Files Inspected

- `plugins/kaola-workflow/scripts/kaola-workflow-active-folders.js`
- `plugins/kaola-workflow/scripts/kaola-workflow-classifier.js`
- `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
- `plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js`
- `plugins/kaola-workflow/scripts/kaola-workflow-repair-state.js`
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- `scripts/validate-kaola-workflow-contracts.js`
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-forge.js`
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-forge-helpers.js`

## Findings

- The post-#63 core uses active local `kaola-workflow/<project>/workflow-state.md` folders plus remote closed issue state to decide activity.
- The claim script contains startup, pick-next, resume, finalize, worktree-status, worktree-finalize, and sink-fallback subcommands.
- The active-folder reader is the central shared primitive used by classifier and claim.
- GitHub classifier still treats remote claim labels/comments as blockers; #67 requires GitLab labels to remain advisory only, so the GitLab port should ignore stale advisory labels when no local active folder exists.
- Roadmap state is compact and file-backed under `kaola-workflow/.roadmap/`; GitLab refresh must normalize issue `iid`, labels, state, and URL.
- #72 added GitLab forge primitives with local `glab` execution, project discovery, issue helpers, note helpers, MR helpers, and label helpers.

