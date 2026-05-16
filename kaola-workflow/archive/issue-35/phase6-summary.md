# Phase 6 - Summary: issue-35

## Delivered
`startup` now ranks open GitHub issues by P0/P1/P2/P3 priority labels before claiming. A `ranking` array (listing tier, priority_label, override_label for every candidate) is included in every startup receipt. Two-layer config (`~/.config/kaola-workflow/config.json` + `<repo>/kaola-workflow/config.json`) allows projects to declare top-tier override labels that force any matching label to tier 0. Sort key order: `workflow:queued` → priority tier → issue number ascending.

## Files Changed
- `scripts/kaola-workflow-claim.js` — PRIORITY_TIER_BY_LABEL constant; readPriorityConfig, parsePriorityTier helpers; sortIssueRecords extended with opts; cmdStartup wired with topTierLabels + sortedIssues (immutable) + ranking; opts comment
- `scripts/simulate-workflow-walkthrough.js` — Epic Cases 14a (P-label ordering + queued-vs-P0) and 14b (hotfix top-tier override)
- `scripts/validate-workflow-contracts.js` — 6 assertIncludes for new symbols
- `CHANGELOG.md` — Added section for issue #35 priority ranking feature
- `README.md` — Startup Issue Priority Ranking subsection added

## Test Coverage
Hand-rolled assert framework (no % metric). New Epic Cases 14a and 14b cover: P0 claimed over P1/P2/P3, workflow:queued beats P0, hotfix top-tier override beats P0, ranking array shape and tier/label fields. Full suite passes.

## Final Validation Evidence
- `node scripts/simulate-workflow-walkthrough.js` → exit 0, "Workflow walkthrough simulation passed"
- Confirmed post-fix (HIGH-1 immutability, HIGH-2 queued-vs-P0 test) and post-Trivial Inline Edit Exception (opts comment)

## Documentation Docking
DOCKED — evidence: .cache/doc-docking.md

## Final Validation Failure Ledger
| Failing Command | Classification | Routed To | Evidence | Status |
|-----------------|----------------|-----------|----------|--------|
| (none) | — | — | — | — |

## Follow-Up Items
(from Phase 5 and closure scan — all MEDIUM/LOW, no blockers)
- MEDIUM: Rename Epic Cases 14a/14b to 14d/14e or Epic Case 15 to avoid label collision with original 14A/14B/14C sub-labels
- MEDIUM: Pass opts through fetchOpenIssueRecords to eliminate double sort
- LOW: Add prototype guard to PRIORITY_TIER_BY_LABEL lookup (hasOwnProperty or Object.create(null))
- LOW: Pre-compute parsePriorityTier results before sort call
- Security LOW: Log non-ENOENT errors to stderr in safeReadLabels

## Closure Decision
No deferred items require user decision. All follow-ups are quality improvements that do not affect correctness or public behavior. Implementation complete as specified by issue #35.

## Commit And Push
pending final Git gate

## GitHub Issue
pending close (issue #35)

## Roadmap
pending regeneration (kaola-workflow/.roadmap/issue-35.md deletion + ROADMAP.md regenerate)

## Archive
pending (cmdFinalize will archive kaola-workflow/issue-35/ → kaola-workflow/archive/issue-35/)

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| doc-updater | invoked | .cache/doc-updater.md | |
| documentation docking | invoked | .cache/doc-docking.md | |
| closure advisor gate | N/A | closure scan found only MEDIUM/LOW deferred items; no user decisions required | |
| final-validation fix executors | N/A | final validation passed on first run; no fixes needed | |
| roadmap refresh | ready | kaola-workflow/.roadmap/issue-35.md + ROADMAP.md | staged in final commit |
| archive completed folder | ready | cmdFinalize will archive via Step 8b | |
| final commit and push | ready | git status/git diff/upstream check | final gate runs after this file is committed |

## Status
READY FOR FINAL GIT GATE
