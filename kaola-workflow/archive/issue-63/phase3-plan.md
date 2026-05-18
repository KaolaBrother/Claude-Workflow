# Phase 3 - Plan: issue-63

## Implementation Plan

1. Keep the existing `workflow/issue-63` simplification patch.
2. Repair validation drift between root and plugin script mirrors.
3. Restore explicit `kaola-workflow/{project}/workflow-state.md` wording in the fast-path Codex skill without restoring removed legacy coordination language.
4. Run the full repo test suite.
5. Audit #63 acceptance criteria with direct commands.
6. Commit and fast-forward `origin/main` from the #63 worktree, leaving unrelated main-worktree #64 artifacts untouched.

## Files In Scope

- Workflow scripts under `scripts/` and `plugins/kaola-workflow/scripts/`
- Workflow commands under `commands/`
- Codex skills under `plugins/kaola-workflow/skills/`
- Hooks under `hooks/` and `plugins/kaola-workflow/hooks/`
- README and install guidance
- Workflow validators and simulators

## Explicitly Out Of Scope

- GitLab edition implementation.
- Editing `plugins/kaola-workflow-gitlab/`.
- Reusing the obsolete #54/#56-#59 migration track.
- Modifying unrelated #64 worktree state.
