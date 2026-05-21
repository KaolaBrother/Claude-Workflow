# Phase 1 - Research / Discovery: issue-136

## Deliverable
Three changes:
1. `archiveProjectDir` in `scripts/kaola-workflow-claim.js` deletes `.roadmap/issue-N.md` and regenerates `ROADMAP.md` during every closure path (finalize, release, watch-pr)
2. New `validate-remote` subcommand in `scripts/kaola-workflow-roadmap.js` that calls `gh issue view` for each `.roadmap/issue-N.md` with `status: open` and exits 1 if any are closed on GitHub
3. Regression test in `scripts/simulate-workflow-walkthrough.js` covering a closed issue with a stale active roadmap source

## Why
`ROADMAP.md` shows completed issues as still active because `.roadmap/issue-N.md` files are not removed during closure. The `validate` command only checks mirror consistency (local files vs ROADMAP.md) — it never checks GitHub. This makes closure state unreliable for agents and release checks.

## Affected Area
- `scripts/kaola-workflow-claim.js` — `archiveProjectDir` function (lines 411-440), optionally `cmdFinalize` (lines 442-467)
- `scripts/kaola-workflow-roadmap.js` — add `validate-remote` subcommand alongside existing `validate` (line 225)
- `scripts/simulate-workflow-walkthrough.js` — add `testRoadmapClosureCleanup` test using gh shim pattern
- `kaola-workflow/.roadmap/issue-133.md` — live drifted file to clean up

## Key Patterns Found
1. `archiveProjectDir` renames project folder but never touches `.roadmap/` — `scripts/kaola-workflow-claim.js:411-440`
2. `issueIsClosed()` already exported from `scripts/kaola-workflow-active-folders.js:118` — calls `gh issue view N --json state`
3. gh shim test pattern in `scripts/simulate-workflow-walkthrough.js:335-345` — creates `bin/gh` script in temp dir injected via PATH
4. `validate` only does in-memory string comparison, no GitHub call — `scripts/kaola-workflow-roadmap.js:225-239`
5. `init-issue` uses `wx` exclusive open flag to prevent races — `scripts/kaola-workflow-roadmap.js:241-266`
6. Phase 6 Step 7 has manual `rm -f` + `generate` instructions but they are agent-driven, not automated

## Test Patterns
- Framework: hand-rolled assert(), no test framework
- Location: `scripts/simulate-workflow-walkthrough.js`
- Structure: `testXxx()` functions called from `main()`, use `fs.mkdtempSync` for isolation, `spawnSync` for subprocess calls, gh shim injected via PATH

## Config & Env
- `KAOLA_WORKFLOW_OFFLINE=1` skips GitHub calls — `validate-remote` should short-circuit when set
- `.roadmap/issue-N.md` format: 5 colon-separated fields (issue, title, status, workflow_project, next_step)
- `readRoadmapIssues` filters entries where `issue` does not match `/^#\d+$/`

## External Docs
N/A — internal patterns sufficient

## GitHub Issue
KaolaBrother/Kaola-Workflow#136

## Completeness Score
10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | N/A - internal patterns sufficient | no external APIs/frameworks needed |

## Notes / Future Considerations
- `validate-remote` will be slow if there are many `.roadmap/` files (one gh call per file) — acceptable for now given small expected count
- `cmdRelease` (discard) could also benefit from roadmap cleanup but its semantics differ (issue stays open); could skip roadmap cleanup for releases
- The live drifted file `kaola-workflow/.roadmap/issue-133.md` should be deleted and ROADMAP.md regenerated as part of the fix commit
