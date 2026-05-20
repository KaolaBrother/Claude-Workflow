# Planner Output — issue-120

## Recommendation: Option A — Verbatim Copy

Option A selected. Rationale: this is a "port" operation. Option B (shared module) crosses plugin install boundaries and is out of scope. Option C (smaller message) gives worse UX for no gain.

## Key Implementation Notes

1. **No `assertCleanWorktree`** — do not add it to either Gitea/GitLab sink (GitHub-only, intentional omission).
2. **Verbatim error message** — copy byte-for-byte including `<worktree>` and `<claim.js>` generic placeholders.
3. **GitLab test convention**: pass `--root root` explicitly (consistent with lines 410, 423, 444 of test-gitlab-sinks.js); Gitea test does NOT pass `--root`.
4. **Live folder must be on branch HEAD**: `setupRepoWithLiveFolderOnBranch` checks out feature branch, commits `workflow-state.md`, returns to main.
5. **Dual assertion**: assert both `status === 1` AND stderr substring — exit-code-only would pass for any unrelated failure.

## Parallelization
All 4 file edits are independent. Can be made in parallel.

## Validation Commands
- `npm run test:kaola-workflow:gitea`
- `npm run test:kaola-workflow:gitlab`
- `node scripts/simulate-workflow-walkthrough.js`
- `npm test`

## Out of Scope
- `assertCleanWorktree` in Gitea/GitLab sinks
- Issue #113 (gitea claim script)
- Shared module extraction
- GitHub plugin changes
