# Phase 2 - Ideation: issue-35

## Approaches Evaluated

### Option A: Inline helpers in `claim.js` with two-layer config reader (SELECTED)
- **Summary**: Add `PRIORITY_TIER_BY_LABEL`, `parsePriorityTier()`, `readPriorityConfig()` helpers directly in `claim.js`. Extend `sortIssueRecords(issues, opts)` with priority tier between queued and number sort keys. Thread config from `cmdStartup`, emit additive `ranking` field in startup receipt. Config reads two layers: global `~/.config/kaola-workflow/config.json` then project-local `<repoRoot>/kaola-workflow/config.json` (project wins on `priority_top_tier_labels`).
- **Pros**: Matches established duplication pattern (classifier.js, sink-pr.js already duplicate config read). Smallest diff — one file changed for core logic. No new coupling between claim.js and classifier.js. Preserves queued-first semantics. Satisfies the per-project top-tier label requirement from the issue.
- **Cons**: Third site reading `~/.config/kaola-workflow/config.json` — future drift risk if config schema grows. Addressed by project-level config layer.
- **Risk**: Low. Offline path unchanged (labels=[] → all tier 4 → number ordering, no regression).
- **Complexity**: Small.

### Option B: Extract `scripts/priority.js` shared module
- **Summary**: New shared module exporting `tierFor()`, `comparePriority()`, `readKaolaConfig()`. Required from claim.js.
- **Pros**: Single canonical priority parser, eliminates future duplication.
- **Cons**: Violates YAGNI — no second in-process caller today. Pulls in refactor of classifier.js and sink-pr.js (not in scope). New file + new require edge.
- **Risk**: Medium — scope creep.
- **Complexity**: Medium.
- **Architectural fit**: Medium.

### Option C: Export helpers from `classifier.js`, require in `claim.js`
- **Summary**: Add `module.exports` to classifier.js, require from claim.js.
- **Pros**: Reuses existing config reader.
- **Cons**: Inverts the established subprocess relationship (claim.js calls classifier.js via execFileSync). Risk of side effects at require time. New compile-time dependency not previously present.
- **Risk**: Medium-High.
- **Complexity**: Medium.
- **Architectural fit**: Low.

## Advisor Findings
The advisor confirmed Option A as the right pick with one blocking concern: the plan originally only used global `~/.config/kaola-workflow/config.json`, but the bug came from a downstream repo needing its own top-tier label (`Engine Showcase Gap`). The fix is to add a two-layer config read (global then project-local `<repoRoot>/kaola-workflow/config.json`) so different repos can declare their own top-tier labels without conflicting. The advisor also flagged: filter empty strings from `priority_top_tier_labels`, consider `{ tier, priority_label, override_label }` in ranking entries for ambiguity clarity, and verify test harness isolation before writing file-based integration tests for top-tier config.

## Selected Approach
**Option A with project-level config layer.**

Rationale:
1. The codebase has already chosen "duplicate config read per script" (classifier.js:72, sink-pr.js). A third instance is lowest-surprise.
2. `claim.js` calls `classifier.js` via `execFileSync`; Option C would invert this relationship and risk side effects.
3. Option B's shared module is the right eventual refactor but has no second in-process caller yet; file as follow-up.
4. Adding the project-local `kaola-workflow/config.json` read satisfies the issue's per-repo top-tier label use case without violating the "one file" scope of Option A.

**Config merge rule**: Read global, then read project-local if it exists. `priority_top_tier_labels` is a union of both arrays (project labels supplement, not replace, global labels).

**Sort key order**: `workflow:queued` (0/1) → priority tier (0=P0, 1=P1, 2=P2, 3=P3, 4=unlabeled) → issue number ascending.

**Ranking receipt shape**: `{ issue: number, tier: 0-4, priority_label: "P0"|null, override_label: "hotfix"|null }` — unambiguous when both a P-label and a top-tier label are present.

## Out of Scope (explicit)
- No new CLI flags (`--priority`, `--min-tier`, `--top-tier-label`)
- No configurable priority regex (e.g. `priority/0..3` style) — hardcoded `P0..P3` is fine for v1; file follow-up
- No changes to `workflow:queued` semantics or its primacy
- No changes to `writeStartupReceipt` fields other than additive `ranking`
- No changes to `kaola-workflow-classifier.js` or `sink-pr.js`
- No shared config module refactor (`scripts/config.js`) — defer to follow-up issue
- No per-tier override labels — top-tier only
- No offline path label parsing from `.roadmap/issue-N.md` flat strings — note as known gap

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
