# Doc Updater — Issue #128

## Changed Files
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js` — 2-line guard added
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js` — new test block
- `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js` — 2-line guard added
- `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js` — new test block (Test 21)
- `CHANGELOG.md` — entry added under [Unreleased] ### Fixed

## Documentation Checklist Review

| Document | Status | Reason |
|----------|--------|--------|
| README.md | no change needed | Internal behavior change; no new install steps, usage, or env vars |
| API docs (docs/api.md) | no change needed | No new exported functions, CLI flags, or external contracts |
| CHANGELOG.md | updated ✓ | Entry added: "Add clean-worktree guard before branch checkout in GitLab and Gitea runDirectMerge pipelines..." |
| Architecture docs (docs/architecture.md) | no change needed | No structural change; guard is inline in existing function |
| .env.example | no change needed | No new environment variables |
| Inline comments | no change needed | Guard lines are self-explanatory; no non-obvious invariant |

## Result
All required documentation updated. No gaps found.
