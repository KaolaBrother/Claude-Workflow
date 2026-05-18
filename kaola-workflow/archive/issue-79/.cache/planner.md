# Planner — Issue #79: Unify CLAUDE.md + AGENTS.md across workflow-init paths

## Orientation

- Four init files (not three): `commands/workflow-init.md`, `plugins/kaola-workflow-gitlab/commands/workflow-init.md`, `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md`, `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md`
- Claude commands write CLAUDE.md only; Codex skills write AGENTS.md only
- Validators assert specific tokens/phrases in the GitHub Codex SKILL.md (must keep)
- GitLab files must contain zero forbidden GitHub tokens
- shared-scripts mirror: validate-workflow-contracts.js root and plugin copy must be byte-identical

## Approaches

### Approach A — Inline prose templates (recommended)

Each of the four init files carries three things: (1) full CLAUDE.md template with forge-specific tokens, (2) AGENTS.md redirect template (forge-neutral, byte-identical across all four), (3) prose describing detect/create/migrate-and-prepend behavior. The CLAUDE.md template moves the workflow facts that today live in the AGENTS addendum into the CLAUDE template. The AGENTS section in each file becomes a small, fixed block.

**Pros**: Zero new files, zero new install.sh entries, zero new shared-scripts mirror entries. Same inspection shape as existing pattern. Validators can assertIncludes on a distinctive phrase. Matches forge-substitution mental model.

**Cons**: AGENTS redirect block (~15 lines) duplicated four times; requires byte-equality validator to prevent drift. Migration prose needs a worked example.

**Risks**: Drift between four redirect blocks if validator forgotten. Migration prose has interpretive latitude.

**Complexity**: Medium — four prose files restructured, two validators extended, root CLAUDE.md/AGENTS.md updated, shared mirror updated. Bounded scope.

### Approach B — Helper script for AGENTS.md materialization

Add a new `scripts/materialize-agents-md.js` (mirrored to plugin). Each init file calls the helper instead of carrying inline AGENTS handling.

**Pros**: Single source of truth for redirect body, deterministic migration logic.

**Cons**: Adds to shared-scripts byte-equality contract. Three copies needed (root + GitHub plugin + separate GitLab plugin script, because GitLab validator forbids cross-plugin script references). Fresh-install ordering complexity. Exceeds issue scope ("only init contract and file contents").

**Risks**: Three-way mirror divergence, helper-script availability ordering, scope creep.

**Complexity**: Medium-High.

### Approach C (dismissed) — Full codification

Single script generates both files. Inverts the init pattern (prose recipe → script invocation). Much larger refactor than needed.

## Recommendation: Approach A

Approach A keeps four init files inspectable end-to-end, avoids adding new shared-scripts mirror entries, and covers the drift risk cheaply with a five-line validator. Approach B would require three copies of a new script and fights three constraints simultaneously.

## Open Decisions for Phase 3

1. **AGENTS.md redirect body text** — planner noted the issue's `.roadmap/issue-79.md` summary file is only 5 lines and didn't include the full body. However, the full GitHub issue body (fetched in Phase 1) DOES specify the exact verbatim redirect block. It is locked. (See: issue body under "Design Contract" section.) No user sign-off needed.

2. **Non-canonical bullets in dogfood CLAUDE.md**: Recommend moving "Verify with the relevant command before claiming completion" into the existing `## Validation Policy` section (where it overlaps with simulate-walkthrough bullet). Drop "Preserve user changes; never revert unrelated work without explicit request." — it's implicit in the Surgical changes bullet.

3. **Validator additions** (enumerated):
   - `validate-kaola-workflow-contracts.js`: add `assertIncludes` on GitHub Codex SKILL for redirect phrase; add `assertNotIncludes` for `'Do not create or edit CLAUDE.md'`; existing Active folder lifecycle + 6-token assertConcept keep passing (tokens move to CLAUDE template section).
   - `validate-kaola-workflow-gitlab-contracts.js`: add missing `assertConcept` for 6 durable-state tokens on GitLab init SKILL; add same `assertIncludes` redirect phrase and `assertNotIncludes` "Do not create or edit CLAUDE.md" checks.
   - `validate-workflow-contracts.js`: add `assertIncludes` on `commands/workflow-init.md` for redirect phrase; add `assert(exists('AGENTS.md'))` and `assertIncludes('AGENTS.md', <redirect phrase>)` for dogfood; add byte-equality check for redirect block across all four init files.
   - Mirror update: `plugins/kaola-workflow/scripts/validate-workflow-contracts.js` must be byte-identical.

4. **Idempotency rule**: An existing AGENTS.md is conforming iff its first non-blank line matches the redirect block's first non-blank line. If conforming → no-op. If missing → write. If non-conforming → prepend redirect, add `---` divider, append original content with a single-line note.

5. **Section ordering in new init files**: Step 1 scan; Step 2 synthesize/update CLAUDE.md; Step 3 synthesize/update AGENTS.md (new for Claude commands); Step 4 scaffold + optional codex profiles; Step 5 git/roadmap summary. Codex SKILLs gain Step 2 (CLAUDE.md) for the first time; Claude commands gain Step 3 (AGENTS.md) for the first time.

## What NOT to Build

- No new scripts or shared-scripts mirror entries
- No runtime behavior changes
- No changes to claim.js, classifier.js, roadmap.js, or any runtime path
- Do not extend simulate-workflow-walkthrough.js to execute init markdown end-to-end
- Do not remove "Do not create or edit CLAUDE.md" silently — validators must assertNotIncludes it
- Do not touch kaola-workflow/.roadmap/ sources or any active project contents
- Do not introduce template inheritance / partials / shared redirect.md
- Do not change the GitHub Codex plugin's no-commands/ constraint
