# Phase 2 - Ideation: issue-84

## Approaches Evaluated

### Option A: Update docs to match implementation (S)
- Summary: Change 4 docs files and CHANGELOG to say `.kaola-workflow.json` + `top_tier_labels`; add regression test.
- Pros: Smallest diff, no code risk.
- Cons: Codifies a path pattern that fits no other repo convention; rewrites CHANGELOG history; leaves documented two-layer design permanently unimplemented.
- Risk: Medium — erodes trust in CHANGELOG as a contract.
- Complexity: S

### Option B: Update implementation to match docs (M) — two sub-variants evaluated
- **Full B** (planner's recommendation): Restore complete #35 contract — two-layer global + project-local, `priority_top_tier_labels`, tier-0 semantics, `priority_label: null` for override matches.
  - Overscopes AC1-AC3. Tier semantics change is a latent bug fix outside issue scope.
- **Scoped B** (advisor's recommendation): Project-local layer only. Change `readPriorityConfig` to read `kaola-workflow/config.json` + `priority_top_tier_labels`. Leave `priorityTier` untouched, leave global layer out. Export `readPriorityConfig` for testing.
  - Pros: Honors docs contract, fits existing patterns, surgical change.
  - Risk: Low — docs are the contract, `.kaola-workflow.json` is undocumented behavior.
  - Complexity: S-M

### Option C: Support both paths with precedence (L)
- Pros: Zero risk to undocumented `.kaola-workflow.json` users.
- Cons: Permanent complexity defending an undocumented path; no evidence of users.
- Risk: Medium-high long-term.
- Complexity: L

## Advisor Findings

Advisor confirmed Scoped Option B is correct. Key points:
- AC1 says "single config path+key OR both with clear precedence" — two-layer UNION is a third path beyond the AC.
- Tier semantics (tier 1 vs 0, `''` vs `null`) is a separate latent bug — not bundled here.
- The 4 docs files are already correct; implementation is what's wrong.
- Export `readPriorityConfig` for direct test access.
- Test should assert sort order, not specific tier numbers.

## Selected Approach

**Scoped Option B**: Fix `readPriorityConfig` (both byte-identical copies) to read `kaola-workflow/config.json` + `priority_top_tier_labels`. Export `readPriorityConfig`. Add regression test. Add CHANGELOG entry.

Rationale: The docs are the contract. The implementation diverged without documentation. The fix is surgical — path+key only. Tier semantics and global layer are deferred as separate issues.

## Out of Scope (explicit)

- Global `~/.config/kaola-workflow/config.json` layer for priority labels
- `priorityTier` tier-0 semantics and `priority_label: null` for override matches
- Dual-path fallback (`kaola-workflow.json` backwards compat)
- Auto-migration of existing `.kaola-workflow.json` files
- Other config keys (`pr_auto_merge`, `parallel_mode`)
- CLI subcommand to inspect/dump priority config
- GitLab claim script (no priority logic there)
- Editing `CHANGELOG.md:306` (history — add new entry only)

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
