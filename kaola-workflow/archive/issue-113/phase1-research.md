# Phase 1 - Research / Discovery: issue-113

## Deliverable
Six workflow scripts ported to Gitea edition under `plugins/kaola-workflow-gitea/scripts/`:
1. `kaola-gitea-workflow-claim.js` — mirror `kaola-workflow-claim.js` (639 LOC)
2. `kaola-gitea-workflow-classifier.js` — mirror `kaola-workflow-classifier.js` (387 LOC)
3. `kaola-gitea-workflow-roadmap.js` — mirror `kaola-workflow-roadmap.js` (311 LOC)
4. `kaola-gitea-workflow-active-folders.js` — mirror `kaola-workflow-active-folders.js` (124 LOC)
5. `kaola-gitea-workflow-compact-context.js` — mirror `kaola-workflow-compact-context.js` (112 LOC)
6. `kaola-gitea-workflow-repair-state.js` — mirror `kaola-workflow-repair-state.js` (558 LOC)

## Why
Completes the Gitea edition's core workflow engine. Without these scripts, the kaola-workflow skill cannot run on Gitea — it has the forge adapter and sink scripts (issues #111-#112) but no claim/classifier/roadmap orchestration layer.

## Affected Area
- `plugins/kaola-workflow-gitea/scripts/` — 6 new files
- `scripts/simulate-workflow-walkthrough.js` — existing integration test that already sets KAOLA_WORKFLOW_OFFLINE=1 (should still pass after changes)

## Key Patterns Found

1. **OFFLINE guard** (`kaola-workflow-claim.js:~60`): `const OFFLINE = process.env.KAOLA_WORKFLOW_OFFLINE === '1';` — every ghExec/teaExec call skipped when set. Load-bearing for walkthrough tests.
2. **Claim comment marker** (`kaola-workflow-claim.js:~198`): `<!-- kw:claim project=X -->` — forge-agnostic string used in both GitHub and Gitea editions; classifier detects it in `comment.body`.
3. **Forge call wrapping** (`kaola-workflow-claim.js:~202`): All label/comment calls in `postAdvisoryClaim` and `clearAdvisoryClaim` are fire-and-forget wrapped in `try/catch`.
4. **`project` object pattern** (`kaola-gitea-workflow-sink-merge.js:~57`): Gitea requires `{ full_name, html_url }` for comment/label/merge API calls; read from `workflow-state.md ## Sink` block via `readProjectInfo`, fallback to `forge.discoverProject()`.
5. **`claimExplicitTarget` contract** (`kaola-workflow-claim.js:~350`): `cmdStartup` requires `--target-issue N`, validated by `claimExplicitTarget()`. Scripts refuse to auto-pick (issue #44 contract).
6. **Normalized fields** (`kaola-gitea-forge.js:~70`): `normalizeIssue` maps Gitea API response to `{ number, state, labels: string[], updated_at, ... }` — same field names used by classifier.

## Test Patterns
- Framework: hand-rolled assert (no external framework)
- Location: `plugins/kaola-workflow-gitea/scripts/test-gitea-*.js`
- Structure: `let passed = 0, failed = 0; function assert(cond, msg) {...}` with final pass/fail count
- OFFLINE tests: set `process.env.KAOLA_WORKFLOW_OFFLINE = '1'`
- Walkthrough integration test: `scripts/simulate-workflow-walkthrough.js`

## Config & Env
- `KAOLA_WORKFLOW_OFFLINE=1` — disables all forge/git calls in tests
- `KAOLA_TARGET_ISSUE=N` — explicit target issue number for startup/pick-next
- `KAOLA_WORKFLOW_OFFLINE` — also respected in classifier, active-folders, claim

## External Docs
- Gitea forge adapter: `kaola-gitea-forge.js` is the authoritative Gitea API interface
- No external library docs needed — all forge calls go through existing adapter

## GitHub Issue
KaolaBrother/kaola-workflow#113

## Completeness Score
10/10

## ghExec → forge.* Replacement Map

| Script | GitHub call | Gitea forge call | Notes |
|--------|-------------|-----------------|-------|
| claim.js | `gh issue list --state open --limit 100 --json ...` | `forge.listIssues({ state: 'open', perPage: 100 })` | |
| claim.js | `gh label create workflow:in-progress ...` | `forge.ensureLabel(project, { name, color, description })` | needs project obj |
| claim.js | `gh issue edit <N> --add-label workflow:in-progress` | `forge.updateIssueLabels(project, N, { add: [...] })` | needs project obj |
| claim.js | `gh issue edit <N> --remove-label workflow:in-progress` | `forge.updateIssueLabels(project, N, { remove: [...] })` | needs project obj |
| claim.js | `gh issue comment <N> --body '...'` | `forge.createIssueComment(project, N, body)` | needs project obj |
| claim.js | `gh pr view <url> --json state,number` | `forge.viewPullRequest(prNumber)` | extract prNumber from pr_url |
| classifier.js | `gh repo view --json owner,name` | `forge.discoverProject()` | returns full_name too |
| classifier.js | `gh api repos/<owner>/<name>/issues/<N>/comments` | `forge.listIssueComments(project, N)` | same field names |
| classifier.js | `gh issue view <depN> --json state,closedAt` | `forge.viewIssue(depN)` | |
| classifier.js | `gh issue view <N> --json number,title,body,labels,state` | `forge.viewIssue(N)` | |
| active-folders.js | `gh issue view <N> --json state` | `forge.viewIssue(N)` then check .state | |

## Scripts With No forge Changes Required
- `kaola-gitea-workflow-roadmap.js` — no ghExec calls; copy as-is with renamed filename
- `kaola-gitea-workflow-compact-context.js` — no ghExec calls; copy as-is
- `kaola-gitea-workflow-repair-state.js` — no ghExec calls; copy as-is

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | internal patterns sufficient — all API calls go through kaola-gitea-forge.js adapter | |

## Notes / Future Considerations
- Issue #116 (integration test suite) will exercise these scripts; basic unit tests for the forge-adapted functions should be included in this issue's test file.
- `pr_url` parsing in `cmdWatchPr`: GitHub uses full URL; Gitea PR URL format is `https://gitea.example/owner/repo/pulls/42` — extract prNumber with URL parsing or regex.
- `postAdvisoryClaim` needs `project` object: call `forge.discoverProject()` at start, wrap in try/catch, continue with advisory label/comment even if discover fails.
