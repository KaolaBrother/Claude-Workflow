# Planner Output — Issue #84

## Key Findings

The planner identified a **3-way mismatch** (not just code vs. docs):
- Implementation: `.kaola-workflow.json` + `top_tier_labels`
- Docs (4 files): `kaola-workflow/config.json` + `priority_top_tier_labels`  
- CHANGELOG #35 (authoritative contract): two-layer (`~/.config/kaola-workflow/config.json` UNION `kaola-workflow/config.json`) + `priority_top_tier_labels`, with tier-0 semantics and `priority_label: null` for override matches

Actual code (lines 81-82): override matches return `{ tier: 1, priority_label: <string> }` — CHANGELOG says tier 0 and `null`.

## Options Evaluated

### Option A — Update docs to match implementation (S)
- Pros: smallest diff, no code risk
- Cons: codifies `.kaola-workflow.json` pattern that fits no other repo convention; rewrites CHANGELOG history
- Fit: **Poor**

### Option B — Update implementation to match documented design (M) [RECOMMENDED]
- Fix `readPriorityConfig` to read `kaola-workflow/config.json` + `priority_top_tier_labels` (project-local layer)
- Also add global layer: `~/.config/kaola-workflow/config.json`
- Fix tier semantics: tier 0 and `priority_label: null` for override matches
- Update 4 docs files, add CHANGELOG entry (don't rewrite #35 entry), add AC3 regression test
- Apply byte-identically to both allowlisted copies
- Pros: honors #35 contract, fits existing patterns, fixes 3 bugs at once
- Fit: **Strong**

### Option C — Support both paths with precedence (L)
- Pros: zero breaking risk for `.kaola-workflow.json` users
- Cons: defends undocumented path, doubles test matrix, permanent complexity
- Fit: **Weak**

## Recommendation: Option B

Rationale: CHANGELOG #35 is the authoritative contract; code never fully implemented it. The `.kaola-workflow.json` path is undocumented, so no backward-compat obligation. Matches `~/.config/kaola-workflow/config.json` pattern already in README.

## NOT-build list

- No Option C dual-path fallback code
- No auto-migration of `.kaola-workflow.json` files
- Do not touch P-label parsing regex or tier math (only the override branch line 81)
- Do not retroactively edit CHANGELOG:306 — add new entry instead
- Do not expand to other config keys (`pr_auto_merge`, parallel-work)
- Do not add CLI subcommand to inspect merged priority config
- Do not edit GitLab claim script (no priority logic there)
- Do not refactor `listOpenIssues`

## Missing Facts

1. Whether current 62-70 is regression from earlier richer implementation (affects CHANGELOG framing only)
2. Whether `~/.config/kaola-workflow/config.json` schema is documented with `priority_top_tier_labels` key (affects README update scope)

## Key Constraint

`scripts/validate-script-sync.js`: `kaola-workflow-claim.js` must stay byte-identical between `scripts/` and `plugins/kaola-workflow/scripts/`. Both copies need the same edit.
