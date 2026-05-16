# Code Review — issue-35 Priority Label Ranking

## Files reviewed
- scripts/kaola-workflow-claim.js
- scripts/simulate-workflow-walkthrough.js
- scripts/validate-workflow-contracts.js
- CHANGELOG.md
- README.md

## Findings

### HIGH-1 — Mutation of issueFetch object in-place
File: scripts/kaola-workflow-claim.js, lines 1223-1225
`issueFetch.issues = sortIssueRecords(...)` mutates the returned object in-place, violating the project immutability rule. Works today (local var, no other live references) but is a maintenance trap if fetchOpenIssueRecords is ever refactored to cache/share its result.
Fix: use a local `sortedIssues` variable and pass it to all downstream references (syncIssuesToRoadmap, runStartupClaimFirstAvailable).

### HIGH-2 — Missing workflow:queued vs P0 test case
File: scripts/simulate-workflow-walkthrough.js, Epic Cases 14a/14b
The most important invariant — `workflow:queued` beats P0 — has no explicit test in the new cases. Case 14a tests P-label ordering; Case 14b tests override-vs-P0. Neither mixes queued with a P-labeled issue. If queued/priority sort keys were swapped, both cases would still pass.
Fix: Add issue with `workflow:queued` label to Case 14a (or a new 14c) and assert it wins over P0.

### MEDIUM-1 — Test case naming collision
New cases use "Epic Case 14a/14b" but original Epic Case 14 already uses 14A/14B/14C error labels. Causes ambiguity on failure. Rename new cases to 14d/14e or Epic Case 15.

### MEDIUM-2 — Double sort in fetchOpenIssueRecords → cmdStartup
fetchOpenIssueRecords sorts (tier=4 for all) then cmdStartup re-sorts with opts. Wasted work; also listOpenIssues callers get priority-blind order. Acceptable for now — deferred.

### LOW-1 — PRIORITY_TIER_BY_LABEL lacks prototype guard
`PRIORITY_TIER_BY_LABEL[labels[i]]` could match prototype properties ('constructor', etc). Neutralized by subsequent numeric comparison but fragile. Use hasOwnProperty or Object.create(null).

### LOW-2 — parsePriorityTier called twice per sort comparison
O(N log N) calls, each iterating labels. Pre-compute tiers before sort for efficiency.

### LOW-3 — Contract check for 'ranking' is file-wide string scan
Passes even if 'ranking' appears only in a comment.

## Summary
| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 2 |
| MEDIUM | 2 |
| LOW | 3 |

Verdict: WARNING — HIGH-1 and HIGH-2 must be resolved before merge.
