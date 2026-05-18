# Doc Updater — Issue #84

## Status: COMPLETED

## Files Checked

- `CHANGELOG.md` — already updated with issue #84 entry
- `README.md` — added "### Priority label configuration" section after "### Classifier configuration"
- `docs/api.md` — added `priority_top_tier_labels` key under project-local config section
- `docs/architecture.md` — no impact (internal function change)
- `.env.example` — no new env vars
- SKILL.md / workflow-init.md files — already correctly documented; they were the contract

## Changes Made

- `README.md` lines ~469-494: new "### Priority label configuration" section documenting `kaola-workflow/config.json` + `priority_top_tier_labels`, example config, default fallback behavior
- `docs/api.md` lines ~57-61: new `priority_top_tier_labels` key documentation in project-local config subsection

## Note

Doc-updater wrote to main worktree. Changes copied to linked worktree (`/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-84`) before Phase 6 commit.
