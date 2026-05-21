# Phase 2 - Ideation: issue-136

## Approaches Evaluated

### Option A: Chokepoint in `archiveProjectDir`, gated on `statusValue === 'closed'`
- Summary: Add roadmap cleanup inside `archiveProjectDir` triggered only when `statusValue === 'closed'`. Extract issue_number from state file (already read at line 417), delete `.roadmap/issue-N.md`, then regenerate ROADMAP.md via require().
- Pros: Single chokepoint covers all current and future closure paths. Works offline. `cmdRelease` exclusion is automatic (it passes 'abandoned'). Satisfies AC #1, #3 atomically at write time.
- Cons: Cross-script concern (claim.js calling roadmap generation). Slightly broadens archiveProjectDir scope.
- Risk: Medium (cross-worktree placement, require coupling)
- Complexity: Small

### Option B: Explicit per-site cleanup helper
- Summary: Add `removeRoadmapSource(root, issueNumber)` helper, call from cmdFinalize and watch-pr MERGED explicitly.
- Pros: Keeps archiveProjectDir single-purpose, explicit policy visible at call sites.
- Cons: Two sites to maintain, reintroduces skippability in code for future closure paths.
- Risk: Low-Medium
- Complexity: Small

### Option C: `validate --remote` only (lazy reconciliation)
- Summary: Leave closures alone; add `--remote` flag to validate that calls issueIsClosed() per .roadmap/ file.
- Pros: Catches all drift including manual edits and offline closures.
- Cons: Does NOT satisfy AC #1/#3 at closure time. Cannot be primary fix.
- Complexity: Small (as complement only)

## Advisor Findings
- Approach A + thin C confirmed as correct. Timing insight (issue closes AFTER merge, so `issueIsClosed()` is false at finalize time) is the key correctness point.
- Closed decisions: use require() + module.exports (not shell-out); ship A + validate-remote together; include live data fix (delete .roadmap/issue-133.md + regenerate ROADMAP.md) in same commit.
- Required constraints: cross-worktree regression test; statusValue gate explicit; validate-remote must report "skipped: offline" not silently pass; cmdRelease exclusion must be documented.

## Selected Approach
**Approach A + validate-remote**, shipped as one PR.

### Implementation plan:
1. Add `module.exports` to `scripts/kaola-workflow-roadmap.js` (cmdGenerate, readRoadmapIssues, roadmapDir, buildRoadmapContent)
2. In `archiveProjectDir` (claim.js:411-440): when `statusValue === 'closed'`, extract issue_number from state file, delete `.roadmap/issue-N.md`, call `roadmapModule.cmdGenerate()`
3. Add `validate-remote` subcommand to `kaola-workflow-roadmap.js`: iterate .roadmap/ files with status:open, call issueIsClosed() for each, report/exit 1 on drift. Short-circuit when KAOLA_WORKFLOW_OFFLINE=1 with "skipped: offline" message.
4. Delete `kaola-workflow/.roadmap/issue-133.md` and regenerate ROADMAP.md as part of commit (live data fix)
5. Add regression test in simulate-workflow-walkthrough.js covering: finalize with stale .roadmap/issue-N.md → file deleted, ROADMAP.md clean. Include cross-worktree (keep-worktree) path.

### Key gate: `statusValue === 'closed'` NOT `issueIsClosed()`
- `issueIsClosed()` returns false at finalize time because the GitHub issue only closes after the branch merges to main, which is AFTER cmdFinalize runs.
- Gate on caller intent (`'closed'` passed to archiveProjectDir), not remote state.

### cmdRelease exclusion is intentional
`cmdRelease` passes `'abandoned'` to `archiveProjectDir`, so roadmap cleanup is skipped. This is correct: a released/discarded issue remains open on GitHub and represents legitimate future work. Do not add roadmap cleanup to the abandoned path.

## Out of Scope (explicit)
- Do NOT make `cmdRelease` / watch-pr-CLOSED delete `.roadmap/issue-N.md`
- Do NOT gate write-time cleanup on `issueIsClosed()`
- Do NOT make `generate` call GitHub (stays local rebuild)
- Do NOT split into two PRs
- Do NOT add daemon/cron polling

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
