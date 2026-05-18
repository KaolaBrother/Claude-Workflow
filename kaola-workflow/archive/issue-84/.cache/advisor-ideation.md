# Advisor Ideation Gate — Issue #84

## Verdict

Scope the fix to project-local layer only. The planner overscoped by including the global `~/.config/kaola-workflow/config.json` layer and tier semantics changes. Those are beyond AC1-AC3.

## Recommended Approach: Scoped Option B

1. Change `readPriorityConfig` (both byte-identical copies) to read `path.join(root, 'kaola-workflow', 'config.json')` and key `priority_top_tier_labels`. Keep `Array.isArray` guard, same `['P0','P1']` default, single-layer read.
2. Leave `priorityTier` untouched — tier-1-vs-tier-0 divergence is a separate latent bug, not in scope.
3. Leave the global `~/.config/kaola-workflow/config.json` layer out — that's a separate feature.
4. The 4 docs files already say the right thing — no docs edits needed for them.
5. Add `[Unreleased]` CHANGELOG entry for #84; do not rewrite line 306.
6. Export `readPriorityConfig` (add to module.exports) so the regression test can call it directly.
7. Add regression test: write fixture `kaola-workflow/config.json` with `{"priority_top_tier_labels": ["urgent"]}`, assert returns `["urgent"]`. Plus default-fallback case.

## Tier Semantics Note

The test should assert sort order (top-tier labels sort ahead of tier 99), NOT specific tier numbers, since line 81's tier-1 vs tier-0 semantics is a separate open question.

## Files Changed (minimal set)

- `scripts/kaola-workflow-claim.js` — readPriorityConfig body + module.exports
- `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` — byte-identical copy
- `scripts/simulate-workflow-walkthrough.js` — regression test
- `CHANGELOG.md` — new [Unreleased] entry
