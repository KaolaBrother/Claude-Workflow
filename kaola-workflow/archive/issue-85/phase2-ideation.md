# Phase 2 - Ideation: issue-85

## Approaches Evaluated

### Option A: Three Separate Test Functions
- Summary: `testE2EGitHubMergeFullChain`, `testE2EGitHubPrFullChain`,
  `testParallelIssueIndependence` — each exercises one acceptance criterion end-to-end.
- Pros: failure attribution is clear, each test is independently readable,
  matches existing test-naming convention in the file.
- Cons: some setup code repeated across functions (acceptable given no test
  framework abstraction layer).
- Risk: Low
- Complexity: Medium

### Option B: One Monolithic E2E Function
- Summary: single function that executes all three chains sequentially in one
  large try/finally block.
- Pros: less setup repetition.
- Cons: any failure masks which chain broke; failure attribution requires log
  reading; violates the single-responsibility pattern used by all 28 existing
  tests.
- Risk: Medium (masking regression signal)
- Complexity: Medium

### Option C: Parametric Helper + Three Thin Wrappers
- Summary: extract a `runFullChain(opts)` helper and call it with merge/pr/parallel
  variants.
- Pros: DRY.
- Cons: premature abstraction; Phase 1 patterns use inline setup everywhere;
  three tests are not enough repetition to justify a new helper contract.
- Risk: Medium (scope creep)
- Complexity: Large

## Advisor Findings

Advisor flagged one blocking issue on the PR path:

**Planner ordering for PR test was inverted from production.** Planner proposed
`finalize --keep-worktree → sink-pr`. Production order is `sink-pr → watch-pr
(when PR closes) → folder archived`. Phase 6 Step 8b explicitly preserves the
active folder for sink-pr.

**Resolution**: Use production-ordered chain for PR test:
```
startup (online, gh shim) →
worktree-finalize (cwd=main, mirrors artifacts to linked worktree) →
sink-pr (cwd=wtPath, OFFLINE) →
watch-pr (gh shim reports PR closed) →
assert archive + pr_url written + no active folder
```

Pattern for watch-pr with closed-PR gh shim already exists at
`testWatchPrArchivesClosedIssuePrFolder` (line 487).

All other planner findings confirmed correct. No missed approaches.

## Selected Approach

**Option A — Three separate test functions** with the advisor-corrected PR
ordering.

Rationale: clear per-criterion regression signal, matches all existing test
conventions in `simulate-workflow-walkthrough.js`, low risk. The PR ordering
correction ensures the test exercises the real production path (sink-pr before
archive, watch-pr closes the loop).

## Out of Scope (explicit)

- GitLab E2E: no `KAOLA_WORKFLOW_OFFLINE` support in `kaola-gitlab-workflow-claim.js`
  or GitLab sink scripts — hermetic testing impossible. Document in CHANGELOG.
- No new test framework or helper abstractions.
- No changes to Codex variant (`plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`).
- No new flags to `cmdFinalize`.
- No new version section in CHANGELOG — append under `[Unreleased]` only.
- No refactoring of existing test helpers — inline if needed.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
