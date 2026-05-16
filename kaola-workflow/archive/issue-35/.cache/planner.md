# Planner Cache — issue-35

## Option A — Inline helpers in `claim.js` with duplicated config reader
- **Summary**: Add `PRIORITY_TIER_BY_LABEL`, `parsePriorityTier()`, `readPriorityConfig()` helpers in `claim.js`. Extend `sortIssueRecords(issues, opts)` with priority tier key between queued and number. Thread `topTierLabels` from `cmdStartup`, emit additive `ranking` in startup receipt.
- **Pros**: Matches established duplication pattern (classifier.js, sink-pr.js already duplicate config read). Smallest diff (one file). No new coupling. Preserves queued-first semantics.
- **Cons**: Third site reading `~/.config/kaola-workflow/config.json` — future drift risk.
- **Risk**: Low. Offline path unchanged (all labels=[]).
- **Complexity**: Small.
- **Architectural fit**: High. Mirrors how sink-pr.js handles same config file.

## Option B — Extract `scripts/priority.js` shared module
- **Summary**: New file exporting `tierFor()`, `comparePriority()`, `readKaolaConfig()`. require'd from claim.js.
- **Pros**: One canonical priority parser; eliminates third duplication site.
- **Cons**: Violates YAGNI — no second in-process caller today. New file + new require edge. Pulls in refactor of classifier.js and sink-pr.js not requested by this issue.
- **Risk**: Medium — scope creep.
- **Complexity**: Medium.
- **Architectural fit**: Medium. Cleaner in isolation but inconsistent unless all three sites migrate.

## Option C — Export helpers from `classifier.js` and require in `claim.js`
- **Summary**: Add `module.exports` to classifier.js, require from claim.js.
- **Pros**: Reuses existing config reader.
- **Cons**: classifier.js is a pure CLI script with no exports today. Creates new compile-time dependency. Risk of side effects at import time. Inverts the execFileSync relationship.
- **Risk**: Medium-High.
- **Complexity**: Medium.
- **Architectural fit**: Low.

## Recommendation: Option A

**Implementation Steps**:
1. Add `PRIORITY_TIER_BY_LABEL = { P0: 0, P1: 1, P2: 2, P3: 3 }` + `parsePriorityTier(issue, topTierLabels)` near claim.js:919
2. Add `readPriorityConfig()` — duplicate read-or-create pattern from classifier.js:72-81; return `{ topTierLabels }` from `priority_top_tier_labels` config key
3. Extend `sortIssueRecords(issues, opts={})` — map issues to `{ issue, queued, tier }` first (avoid per-comparator recompute), sort, return in order: queued → tier → number
4. Thread `topTierLabels` from `cmdStartup`; emit additive `ranking: [{ issue, tier, label }]` in all `writeStartupReceipt` calls
5. Add Epic Case 14a (mixed P-labels, assert ranking order + picked issue)
6. Add Epic Case 14b (top-tier override via `priority_top_tier_labels`)
7. Update README.md and CHANGELOG.md

## Explicitly NOT in Scope
- No new CLI flags
- No shared config module refactor
- No changes to workflow:queued primacy
- No writeStartupReceipt field changes (ranking is additive)
- No changes to classifier.js, sink-pr.js, or any other script
- No per-tier override labels (top-tier only)
