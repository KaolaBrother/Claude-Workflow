# Phase 6 - Summary: issue-120

## Delivered
Port `assertNoLiveWorkflowFolder` guard from the GitHub direct-merge sink to both Gitea and GitLab direct-merge sinks. Both sinks now refuse to merge a feature branch whose HEAD still has `kaola-workflow/{project}/workflow-state.md` committed (archive-before-merge invariant enforcement). One subprocess test added per plugin verifying guard fires with exit 1 and correct stderr.

## Files Changed
- `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js` — added `assertNoLiveWorkflowFolder` function and call site after checkout
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js` — same
- `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js` — added `setupRepoWithLiveFolderOnBranch` helper + Test 20
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js` — same
- `CHANGELOG.md` — added Fixed entry for issue #120
- `docs/api.md` — updated Merge Sink section: Gitea script added, live-folder guard subsection, "all three editions" references

## Final Validation

- `node plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js`: pass
- `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`: pass
- `npm test`: pass
- `node scripts/simulate-workflow-walkthrough.js`: pass
- Code review: APPROVE (0 critical/high/medium/low findings)

## GitHub Issue
KaolaBrother/Kaola-Workflow#120
