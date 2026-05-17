# Phase 1 - Research / Discovery: issue-40

## Deliverable
Fix the complete worktree-native workflow contract: 11 specific flaws covering script sync drift, router exit-after-pick, startup receipt absence in native path, duplicated issue-selection logic, worktree-finalize root derivation bug, artifact-only resume detection, Codex skill native gap, ambiguous state placement, missing cleanup/archive mandate, incomplete orphan detection, and missing performance budget enforcement.

## Why
After issue-39 was merged, every active kaola-workflow session still lacks full guarantees that it:
- selects work through the same precise issue-claiming logic as startup
- enters an issue-specific branch and linked worktree before phase work starts
- keeps all phase commands and commits inside that branch/worktree
- resumes from durable workflow state instead of loose artifact presence
- finalizes and archives from either worktree without path confusion
- cleans up linked worktrees/branches/state after merge
- keeps scripts fast enough that ordinary routing does not interrupt with avoidable network work

The original incident (issue-38 branch leak) remains a systemic risk because the guard surface is incomplete.

## Affected Area

### Primary
- `scripts/kaola-workflow-claim.js` — `cmdPickNext` (2183), `cmdResume` (2283), `cmdWorktreeFinalize` (2397), `cmdStartup` (1211), `writeStartupReceipt` (529), `findMainWorktree` (2236), `fetchOpenIssueRecords`/`fetchOpenIssues`, `scanPhaseArtifacts` (2265)
- `scripts/validate-workflow-contracts.js` — root parity loop (318-342)
- `plugins/kaola-workflow/scripts/validate-workflow-contracts.js` — stale copy lacking parity loop
- `commands/workflow-next.md` — KAOLA_WORKTREE_NATIVE branch (line 63), `exit 0` after pick-next
- `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` — no worktree-native path
- `scripts/simulate-workflow-walkthrough.js` — Epic Case 17 (4822-5003), needs 17L and 17M

### Secondary
- `plugins/kaola-workflow/scripts/validate-kaola-workflow-contracts.js` — no pick-next/worktree-native assertions
- `scripts/validate-script-sync.js` — byte-equality drift guard (enforces sync)
- All six `commands/kaola-workflow-phase*.md` — phase guards require verify-startup

## Key Patterns Found

1. **Startup receipt pattern** (`scripts/kaola-workflow-claim.js:529`): `writeStartupReceipt(coordRoot, sessionId, data)` writes `{coordRoot}/kaola-workflow/.sessions/{sessionId}.startup.json` with fields `startup_completed: true`, `session`, `claim: "acquired"|"owned"`, `project`, `selected_project`, `issue`, `selected_issue`, `verdict`, `skipped[]`, `blocked[]`, `ranking[]`. Must be mirrored in `cmdPickNext` after `provisionWorktree`.

2. **`findMainWorktree()` pattern** (`scripts/kaola-workflow-claim.js:2236`): Parses `git worktree list --porcelain` to find main worktree from any worktree context. Already used by `commitWorktreeArtifacts` (line 2371). Must be used in `cmdWorktreeFinalize` in place of `getRoot()` (line 2402).

3. **`runStartupClaimFirstAvailable` pattern** (`scripts/kaola-workflow-claim.js:1190`): Authoritative classify-then-claim loop. `cmdPickNext` must call the same shared selector or use this loop, preserving `fetchOpenIssueRecords` + `sortIssueRecords` + `classifyIssueCandidate` semantics.

4. **Drift guard pattern** (`scripts/validate-script-sync.js:32-40`): 7 common scripts must be byte-identical between `scripts/` and `plugins/kaola-workflow/scripts/`. Immediately mirroring changed files is the enforced pattern. The two simulate files are intentionally excluded.

5. **`workflow-state.md` durable state** (`kaola-workflow/{project}/workflow-state.md`): Contains `step`, `next_command`, compliance rows, and phase position. `cmdResume` (`scanPhaseArtifacts`, line 2265) ignores this file entirely — must be read first before artifact existence fallback.

## Test Patterns
- Framework: hand-rolled `assert()` (throws on failure), `execFileSync` for subprocess tests
- Location: `scripts/simulate-workflow-walkthrough.js`
- Structure: numbered cases with setup → action → assertion; Epic Case 17 (lines 4822-5003) for worktree-native (17A-K)
- Missing test cases: 17L (verify-startup after pick-next → assert `authorized: true`), 17M (worktree-finalize from inside issue worktree → assert `verdict: 'finalized'`)
- Codex: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` (intentionally different, not synced)

## Config & Env
- `KAOLA_WORKTREE_NATIVE=1` — enables native pick-next path in router
- `KAOLA_SESSION_ID` — session identity
- `KAOLA_COORD_ROOT` — override for coord root
- `KAOLA_WORKFLOW_OFFLINE` — skip network calls
- `KAOLA_SINK` — sink type (merge|pr)
- `~/.config/kaola-workflow/config.json` + `kaola-workflow/config.json` — priority top-tier labels
- `KAOLA_ENFORCE_PLATFORM_SESSION` — enforces platform session check

## External Docs
None — all patterns are internal to kaola-workflow.

## GitHub Issue
KaolaBrother/kaola-workflow#40 (or equivalent repo)

## Completeness Score
10/10
- Goal clarity: 3/3 — 11 specific flaws with exact file:line references and acceptance checks
- Expected outcome: 3/3 — acceptance checks enumerate all repro scenarios and `npm test` gate
- Scope boundaries: 2/2 — explicit "not a broad rewrite first; minimum useful consolidation" constraint; simulate files intentionally not synced
- Constraints: 2/2 — performance budget (local routing stays local-first, network only during startup/sync/sweep), byte-identity for 7 scripts, Codex and Claude must reach same issue ordering

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | all patterns internal; no external library/API needed |

## Notes / Future Considerations
- The "minimum useful consolidation" constraint from issue #40 means: extract shared `selectAndClaimIssue` helper from `runStartupClaimFirstAvailable`, then wire `pick-next` to call it. Do NOT attempt a broad `claim.js` rewrite.
- `validate-workflow-contracts.js` sync fix (cp root → plugin) is independent and should be Task 1 since it unblocks `npm test` and everything else is verified against it.
- Codex SKILL.md and `validate-kaola-workflow-contracts.js` updates are lower-risk but required for complete contract coverage.
- Orphan detection gap (Flaw 11) is lower priority than the receipt/router/resume correctness flaws; it can be addressed in a focused sub-task.
