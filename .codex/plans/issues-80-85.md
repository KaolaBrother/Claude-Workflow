# Task: Finish Kaola-Workflow Issues 80-85

## Acceptance Criteria
- [ ] Issue 80: `workflow-next` releases a just-claimed project and linked worktree if Git freshness blocks after startup, with regression coverage.
- [ ] Issue 81: startup uses one clear contract; explicit targets are required and no-target startup is covered for zero, one, and multiple active folders.
- [ ] Issue 82: PR and MR sinks capture metadata without leaving tracked workflow artifacts dirty after final commit, with clean-worktree regression coverage.
- [ ] Issue 83: GitLab direct merge and MR fallback are archive-aware after finalization, with merge success and fallback coverage.
- [ ] Issue 84: top-priority label configuration docs and implementation agree, with a regression proving the documented config location is loaded.
- [ ] Issue 85: add offline end-to-end coverage for GitHub merge/PR fallback, GitLab direct/MR fallback, parallel two-issue isolation, final archive/worktree cleanup, and clean Git status.

## Tasks
1. Startup contract and config alignment - `commands/workflow-next.md`, `scripts/kaola-workflow-claim.js`, plugin mirror scripts/docs - M
2. Sink metadata/archive behavior - GitHub and GitLab sink/claim scripts and Phase 6 command docs - L
3. Regression simulations - root and GitLab simulation/test scripts - L
4. Validation and completion audit - `npm test`, `npm run test:kaola-workflow:gitlab`, targeted scripts - M

## Dependencies
- Sink/archive tests depend on code behavior changes.
- Full validation depends on script sync staying intact between root and Codex plugin copies.

## Risks
- `kaola-workflow/issue-79/` is an existing untracked active folder and must remain untouched.
- Common GitHub scripts must stay byte-identical between `scripts/` and `plugins/kaola-workflow/scripts/`.
