# tdd-guide raw output — Group B (Tasks 3 + 4)

## Files Modified
- `plugins/kaola-workflow-gitlab/commands/workflow-next.md` — 349 lines (was 310; +39)
- `plugins/kaola-workflow-gitlab/commands/kaola-workflow-fast.md` — 213 lines (was 144; +69)

## Diff Summary

### Task 3 — GitLab workflow-next.md
- Inserted `## Startup Step 0a-1 — Path Intent` (lines 78-115) after Step 0a (MR Intent Capture). `gh issue view` replaced with `glab issue view`; both `commands/kaola-workflow-fast.md` refs replaced with `plugins/kaola-workflow-gitlab/commands/kaola-workflow-fast.md`.
- Added `Workflow path:` line in Required Output block after `Branch:`.

### Task 4 — GitLab kaola-workflow-fast.md
- Replaced Steps 1-3 + fast-summary template with GitHub canonical text. "linked GitHub issue body" → "linked GitLab issue body". Required Agent Compliance table added.
- Lines 1-55 (header through Mid-Flight Escalation) and `## Continue to Phase 6` preserved verbatim.

## RED Evidence
N/A (doc-only task)

## GREEN Evidence

### Validator 1: `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`
Exit code: 0
Output: `Kaola-Workflow GitLab contract validation passed`

### Validator 2: `node scripts/simulate-workflow-walkthrough.js`
Exit code: 0
Last 5 lines:
```
testReadPriorityConfig: PASSED
testE2EGitHubMergeFullChain: PASSED
testE2EGitHubPrFullChain: PASSED
testParallelIssueIndependence: PASSED
Workflow walkthrough simulation passed
```

## Forbidden-Token Check (GitLab assertNoForbidden)
Inserted Step 0a-1 prose (lines 78-115):
- `\bgh\b` — absent. Line 94 uses `glab issue view` (substitution correct).
- `GitHub` (case-insensitive) — absent.
- `pull request` (case-insensitive) — absent.
- `PR URL`, `PR number` (case-insensitive) — absent.
- `[a-z]+glab` — absent. `glab` appears bare on line 94 (whitespace-preceded); `gitlab` only in the path string on lines 97, 114 — suffix is `lab`, not `glab`.

All blocked patterns confirmed absent.

## Deviations
None.

## Write-Set Check
```
 M commands/kaola-workflow-fast.md
 M commands/workflow-next.md
 M plugins/kaola-workflow-gitlab/commands/kaola-workflow-fast.md
 M plugins/kaola-workflow-gitlab/commands/workflow-next.md
```
(First two are Group A's work; this session modified only the two GitLab plugin files.)
