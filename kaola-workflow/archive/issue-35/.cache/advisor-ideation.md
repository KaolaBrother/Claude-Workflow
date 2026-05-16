# Advisor Gate — issue-35 Ideation

## Overall Assessment
Plan is sound. Option A is the right pick. One blocking concern before locking in.

## Blocking Concern: Project-Level Config Gap

The issue text says: "allow the project to declare a top-tier label in `kaola-workflow/config.json`..."

The bug came from `vrpai-cli` wanting *its repo's* label (`Engine Showcase Gap`) honored. The plan uses only the global `~/.config/kaola-workflow/config.json`. That doesn't fit:
- Different downstream repos have different top-tier labels
- One user switching between projects can't keep retuning global config
- Kaola-workflow itself has no "Engine Showcase Gap" — it's downstream-specific by nature

**Recommendation**: Read `<repoRoot>/kaola-workflow/config.json` if present, merge `priority_top_tier_labels` array on top of global config (project wins, or union). Adds ~10 lines, satisfies the issue's actual intent. Option A's "single file" virtue stays — no changes to classifier.js or sink-pr.js.

## Smaller Gotchas

1. **Test isolation for Epic Case 14b**: Verify walkthrough harness isolates `HOME`/`XDG_CONFIG_HOME`. If not, unit-test `parsePriorityTier(issue, topTierLabels)` directly (pure function). Don't write to real user config from tests.

2. **Defensive parsing**: Also filter empty strings from `priority_top_tier_labels`: `.filter(s => typeof s === 'string' && s.length > 0)`.

3. **`ranking.label` ambiguity**: For an issue with `["P0", "hotfix"]` and `priority_top_tier_labels: ["hotfix"]`, emitting `{ tier: 0, label: "hotfix" }` loses P0 info. Consider `{ tier, priority_label, override_label }` for unambiguous diagnostics. Or document precedence in a comment.

## Acceptable to Defer

- **Configurable priority regex** (e.g. `priority/0..3` style) — hardcoded `P0..P3` is fine for v1; file follow-up
- **Offline path parsing** — `readLocalRoadmapIssueRecords` returning `labels: []` means offline falls back to number ordering (no regression); parsing flat label strings from `.roadmap/issue-N.md` is skippable for now

## Final Recommendation

Adopt Option A with project-level config addition (two-layer read: global + project `kaola-workflow/config.json`, merge). Put configurable regex + offline labels into deferred/out-of-scope.
