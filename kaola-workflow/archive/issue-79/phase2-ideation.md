# Phase 2 - Ideation: issue-79

## Approaches Evaluated

### Option A: Inline Prose Templates (selected)
- Summary: Each of the four init files carries three things inline: (1) full CLAUDE.md template with forge-specific tokens, (2) AGENTS.md redirect template (forge-neutral, byte-identical across all four), (3) prose describing detect/create/migrate-and-prepend behavior. CLAUDE.md template absorbs the workflow facts currently in the AGENTS addendum. AGENTS section becomes a small, fixed redirect block.
- Pros: Zero new files, zero new install.sh entries, zero new shared-scripts mirror entries. Same inspection shape as existing forge-substitution pattern. Validators can assertIncludes on a distinctive phrase.
- Cons: AGENTS redirect block (~15 lines) duplicated four times; requires byte-equality validator to prevent drift. Migration prose needs a worked example.
- Risk: Medium — drift between four redirect blocks if validator forgotten; mitigated by byte-equality check.
- Complexity: Medium — four prose files restructured, two validators extended, root CLAUDE.md/AGENTS.md updated, shared mirror updated. Bounded scope.

### Option B: Helper Script for AGENTS.md Materialization
- Summary: Add `scripts/materialize-agents-md.js` (mirrored to plugin). Each init file delegates AGENTS handling to the helper.
- Pros: Single source of truth for redirect body, deterministic migration logic.
- Cons: Three copies needed (root + GitHub plugin + GitLab plugin). Fresh-install ordering complexity. Exceeds issue scope.
- Risk: High — three-way mirror divergence, helper availability ordering, scope creep.
- Complexity: Medium-High.

### Option C: Full Codification (dismissed)
- Summary: Single script generates both files. Inverts the init pattern.
- Risk: Very High — far exceeds issue scope.
- Complexity: XL.

## Advisor Findings

Advisor confirmed Approach A with five key additions:

1. **AGENTS.md body is locked** — the verbatim redirect block is specified in the GitHub issue body under "Design Contract". No user sign-off needed.

2. **Byte-identical CLAUDE.md within a forge pair** — stronger requirement than initially noted: the CLAUDE.md template in the Claude command and the Codex skill within the same forge must be byte-identical after forge-token substitution. Validator must add byte-equality check across forge pairs.

3. **`.codex/agents/` bullet stays in CLAUDE.md** — move this bullet unconditionally to the CLAUDE.md template (option a). Claude Code users seeing it is harmless.

4. **Migration shape has two `---` dividers** — the canonical AGENTS.md body itself contains a `---` divider + footer. Migration adds another. Each init file must include a worked example showing the two-divider final shape.

5. **Idempotency detection signal** — use the second non-blank line `> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**` as the conformance test (more distinctive than first-line `# AGENTS.md`).

## Selected Approach

**Approach A: Inline Prose Templates**

Rationale: Keeps all four init files inspectable end-to-end, avoids adding new shared-scripts mirror entries, and covers drift risk cheaply with a five-line validator. Approach B fights three constraints simultaneously (three-way mirror, ordering, scope).

## Out of Scope (explicit)

- No new scripts or shared-scripts mirror entries
- No E2E execution of init markdown in test suite
- No changes to claim.js, classifier.js, roadmap.js, or any runtime path
- Do not extend simulate-workflow-walkthrough.js to execute init markdown end-to-end
- Do not touch kaola-workflow/config.json (#41)
- Do not introduce template inheritance / partials / shared redirect.md
- Do not change the GitHub Codex plugin's no-commands/ constraint

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
