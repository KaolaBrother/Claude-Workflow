# Advisor Gate — Phase 3 Blueprint Review

## Verdict: Blueprint is sound — two concrete gaps to close before Phase 4

The architect produced an executable plan with correct task ordering, write sets, and dependency graph. Two specific issues need an architect revision (small) before Phase 4 starts.

---

## Gap 1 (BLOCKING): Redirect-block extraction will collide with the worked migration example

The architect's `extractRedirectBlock` matches the first ` ```markdown ` fenced block containing `# AGENTS.md`. **The worked migration example also starts with `# AGENTS.md`** (placeholder text).

If an init file has example-first/canonical-second, the byte-equality check picks the wrong block.

**Resolution (option a — recommended)**: Require the fenced block to contain both `# AGENTS.md` AND `> **MANDATORY — READ CLAUDE.md` — the worked example uses placeholder text and won't match the sentinel.

**Option (b)**: Use ` ```text ` for the worked example fence (weaker — relies on humans picking correct labels).

Recommend option (a).

## Gap 2 (NOTABLE): CLAUDE.md template byte-equality within forge pair was dropped

Ideation advisor note #2 required byte-equality for the CLAUDE.md template within each forge pair. The architect added byte-equality only for the AGENTS.md redirect.

This means drift between `commands/workflow-init.md` and `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md` (and the GitLab pair) is invisible without this check.

**Resolution**: Add HTML comment markers `<!-- KW-CLAUDE-TEMPLATE-START -->` / `<!-- KW-CLAUDE-TEMPLATE-END -->` around the CLAUDE.md template section in all four init files. Extractor reads between markers. Add byte-equality assertions:
- Task 8: GitHub pair (`commands/workflow-init.md` vs GitHub SKILL.md)
- Task 9: GitLab pair (`plugins/kaola-workflow-gitlab/commands/workflow-init.md` vs GitLab SKILL.md)

---

## Minor verifications for architect revision

- **`gitlabSkillsBase` variable**: Verify it already exists in `validate-kaola-workflow-gitlab-contracts.js` before using it in Task 9.
- **`assertConcept` is case-insensitive**: Tokens survive lowercase comparison fine.
- **Worked-example fence in Tasks 5/6**: Architect revision must explicitly state the worked example uses the same fence convention as the main redirect block (option a makes this moot since the sentinel won't match).

## Risks already correctly handled

- Forge substitution table locked and explicit.
- `assertNoForbidden` coverage of redirect block content is correct (zero forge tokens).
- Existing `assertConcept` at lines 183–190 keeps passing after token migration.
- Shared-scripts mirror identity check pattern is correct.
- Build sequence dependencies are dependency-safe.

## Recommendation

Run one architect-revision round addressing Gaps 1 and 2, write to `.cache/architect-revision-1.md`, then proceed to write `phase3-plan.md`.
