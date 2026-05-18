# Phase 1 - Research / Discovery: issue-83

## Deliverable
Make GitLab sink scripts archive-aware: `finalValidationPassed` and `readProjectInfo` in
`sink-merge.js` must check the archive path when the active folder is missing; `cmdSinkFallback`
in `claim.js` must guard against archived projects; `sink-mr.js` must not recreate the active
folder directory on the fallback path.

## Why
On the GitLab merge path, `cmdFinalize` archives `kaola-workflow/{project}/` before Step 9
dispatches the sink scripts. This causes `finalValidationPassed` to return `false` (file moved),
the assertion to throw, and the merge to never happen. The issue closes no issue and leaves the
branch open. Fallback paths also risk corrupting the archive by recreating the live directory.

## Affected Area

### Primary (bugs)
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js` — `finalValidationPassed` + `readProjectInfo` read archived paths
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js` — `cmdSinkFallback` lacks `activeByProject` guard
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js` — `appendSummary` recreates archived dir on fallback

### Test files (new coverage needed)
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`
- `plugins/kaola-workflow-gitlab/scripts/simulate-gitlab-workflow-walkthrough.js`

## Key Patterns Found

1. **Archive-aware path lookup** — check active path first, then archive fallback:
   `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js:44-59`
   (currently broken; correct pattern is to try `kaola-workflow/{project}/` then `kaola-workflow/archive/{project}/`)

2. **`activeByProject` guard in GitHub** — `scripts/kaola-workflow-claim.js` `cmdSinkFallback`:
   checks `activeByProject(root, args.project)`; returns `{ updated: false, reason: 'project archived' }` if absent.
   Mirror this in `kaola-gitlab-workflow-claim.js:547-555`.

3. **GitHub sink-merge never reads active folder** — `scripts/kaola-workflow-sink-merge.js`:
   all info via CLI args only; no `finalValidationPassed` runtime check.
   GitLab should either remove the runtime check or make it archive-aware.

4. **`testSinkFallbackSkipsArchivedProject`** — `scripts/simulate-workflow-walkthrough.js:531-570`:
   test pattern to mirror in `simulate-gitlab-workflow-walkthrough.js`.

5. **`cmdFinalize` rename** — `kaola-gitlab-workflow-claim.js:390-432`:
   `fs.renameSync` is atomic; after it runs, `kaola-workflow/{project}/` is gone.

## Test Patterns
- Framework: hand-rolled assert (no external framework)
- Location: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`
- Structure: async `main()`, individual `testXxx()` functions, `assert()` helper
- Mode: offline via `KAOLA_WORKFLOW_OFFLINE=1` or `gitExec`/`skipPush` options
- Integration: `simulate-gitlab-workflow-walkthrough.js` for end-to-end scenarios

## Config & Env
- `KAOLA_WORKFLOW_OFFLINE=1` — disables real GitLab API calls in tests
- No feature flags relevant to this fix

## External Docs
N/A — internal patterns sufficient; no external API behavior changes needed.

## GitHub Issue
KaolaBrother/Kaola-Workflow#83

## Completeness Score
10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | — | No external library/API/framework behavior needed; all internal patterns |

## Notes / Future Considerations
- The phase6.md command protocol is already correct (captures metadata before Step 8b).
  Only the sink scripts and `cmdSinkFallback` need changes.
- For `sink: mr` path (no archive in Step 8b), `sink-mr.js` is safe by design.
  Only the fallback scenario (exit 3 from sink-merge after archive) creates risk.
