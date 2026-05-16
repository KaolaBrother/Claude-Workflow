# Documentation Docking — issue-35

## Changed files reviewed
- scripts/kaola-workflow-claim.js (+62 lines): PRIORITY_TIER_BY_LABEL, readPriorityConfig, parsePriorityTier, sortIssueRecords extended, cmdStartup wired with topTierLabels + sortedIssues + ranking; immutability fix (sortedIssues); opts comment
- scripts/simulate-workflow-walkthrough.js (+117 lines): Epic Cases 14a (5-issue P-label + queued-vs-P0) and 14b (hotfix top-tier override)
- scripts/validate-workflow-contracts.js (+7 lines): 6 assertIncludes for new symbols
- CHANGELOG.md (+6 lines): Added section for issue #35
- README.md (+24 lines): Startup Issue Priority Ranking subsection

## Phase 1 success criteria check
Issue #35: startup must rank open issues by P0/P1/P2/P3 priority labels; allow project to declare top-tier labels in kaola-workflow/config.json.
✓ P0-P3 tier ranking implemented in sortIssueRecords
✓ Two-layer config (global + project-local) implemented in readPriorityConfig
✓ ranking array in startup receipt
✓ workflow:queued primacy preserved

## Documents checked

| Document | Changed? | Gap? | Verdict |
|----------|----------|------|---------|
| README.md | yes | no | DOCKED — new Startup Issue Priority Ranking subsection accurately describes sort order, ranking receipt, top-tier override, and config example |
| CHANGELOG.md | yes | no | DOCKED — Added section lists all three changes (P-label ranking, two-layer config, sort key order) |
| API docs | N/A | — | No REST API; startup receipt is internal/operator; no API doc file maintained |
| Architecture docs | N/A | — | No structural change; helpers added within existing claim.js |
| .env.example | N/A | — | No new env vars |
| Inline comments | fixed | was missing | DOCKED — opts comment added via Trivial Inline Edit Exception |

## Gaps found and fixed
1. sortIssueRecords opts comment — added via Trivial Inline Edit Exception; walkthrough still passes

## Explicit no-impact reasons
- API docs: no REST API; startup receipt format is internal operator JSON
- Architecture docs: feature added entirely within existing claim.js; no new files, no structural change to module relationships
- .env.example: feature reads from config files, not env vars

## Final verdict: DOCKED
All public behaviors (priority sort, two-layer config, ranking receipt field) are reflected in README.md and CHANGELOG.md. No gaps remaining.
