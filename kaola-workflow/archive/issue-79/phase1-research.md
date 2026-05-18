# Phase 1 - Research / Discovery: issue-79

## Deliverable

Update all four `workflow-init` paths to produce a consistent workspace shape after every init run:
- `CLAUDE.md` — canonical source of truth (all behavioral rules, workflow facts, Non-Negotiable Rules)
- `AGENTS.md` — pure forced redirect pointing agents to read `CLAUDE.md`

Apply the same contract to this repo's own `CLAUDE.md` and `AGENTS.md` (dogfood).
Update validators to assert the new contract.

## Why

Today the three workflow-init paths (actually four — see below) produce different workspace shapes:
- Claude Code paths write `CLAUDE.md` only; no `AGENTS.md` created.
- Codex paths write `AGENTS.md` only with an explicit "Do not create or edit CLAUDE.md" rule.
- A Codex-initialized repo misses half the canonical behavioral rules.
- A repo with both files has two parallel sources of truth with no authoritative order.
- Agents reading only `AGENTS.md` (Codex default) and agents reading only `CLAUDE.md` (Claude default) operate under different rule sets in the same repo.

## Affected Area

Four init files (not three as the issue title says — the GitLab plugin has both a command and a skill):
1. `commands/workflow-init.md` — Claude Code, GitHub/combined
2. `plugins/kaola-workflow-gitlab/commands/workflow-init.md` — Claude Code, GitLab-only
3. `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md` — Codex, GitHub
4. `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md` — Codex, GitLab

Validator files:
- `scripts/validate-workflow-contracts.js` (+ mirror: `plugins/kaola-workflow/scripts/validate-workflow-contracts.js`)
- `scripts/validate-kaola-workflow-contracts.js` (+ mirror: `plugins/kaola-workflow/scripts/validate-kaola-workflow-contracts.js`)
- `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`

Dogfood files:
- `CLAUDE.md` — update Non-Negotiable Rules to canonical 5-bullet set
- `AGENTS.md` — create with pure redirect block (does not exist yet)

## Key Patterns Found

1. **Forge-substitution pattern** — Claude commands and Codex skills differ only by forge-specific tokens (GitHub→GitLab, `gh`→`glab`, `watch-pr`→`watch-mr`, `kaola-workflow-claim.js`→`kaola-gitlab-workflow-claim.js`). Each change applies symmetrically across all four files. `plugins/kaola-workflow/` (GitHub Codex) is NOT allowed to have a `commands/` dir.

2. **Validator assertConcept pattern** — `validate-kaola-workflow-contracts.js:183-190` asserts the GitHub Codex SKILL.md contains the 6 durable-state tokens (`kaola-workflow/.roadmap/issue-*.md`, `do not purge`, `kaola-workflow/{project}/`, `workflow-state.md`, `fast-summary.md`, `.cache/`). Currently these live in the AGENTS.md addendum. After the change they move to the CLAUDE.md template section in the SKILL — satisfying the validator unchanged.

3. **Shared-scripts mirror** — `scripts/validate-workflow-contracts.js` and `plugins/kaola-workflow/scripts/validate-workflow-contracts.js` must be byte-identical. Any change to one must be duplicated to the other.

4. **GitLab assertNoForbidden** — `validate-kaola-workflow-gitlab-contracts.js:43-57` hard-blocks GitHub terms (`gh`, `GitHub`, `github.com`, `PR URL`, etc.) from all GitLab skill/command files. AGENTS.md redirect body and CLAUDE.md template in the GitLab files must use only GitLab-neutral terminology.

5. **GitLab validator durable-state gap** — `validate-kaola-workflow-gitlab-contracts.js` currently has NO durable-state assertions for the GitLab init SKILL. Issue #79 asks to close this gap.

6. **Active folder lifecycle phrase** — `validate-kaola-workflow-contracts.js:89` asserts `'Active folder lifecycle'` in the GitHub Codex SKILL.md. Currently at SKILL line 76. After change: kept in the CLAUDE.md template section.

## Test Patterns

- Framework: hand-rolled assert (no test framework)
- Location: `scripts/simulate-workflow-walkthrough.js` (primary), `scripts/validate-workflow-contracts.js`, `scripts/validate-kaola-workflow-contracts.js`, `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`
- Structure: `assertIncludes`, `assertNotIncludes`, `assertConcept` (checks multiple tokens present in one section). No end-to-end execution of init markdown — all tests are file-content assertions.

## Config & Env

None. All changes are to markdown prose files and JS validator scripts. No env vars, feature flags, or config files involved.

## External Docs

None needed. Internal patterns sufficient.

## GitHub Issue

KaolaBrother/Kaola-Workflow#79

## Completeness Score

10/10

- Goal clarity: 3/3 — exact files, exact contract, exact Non-Negotiable Rules text specified
- Expected outcome: 3/3 — detailed AC in issue; pass/fail criteria enumerated
- Scope boundaries: 2/2 — four init files + validators + dogfood; runtime behavior explicitly out of scope
- Constraints: 2/2 — validator fixed constraints, shared-scripts mirror, assertNoForbidden rules all documented

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | Internal patterns sufficient; no external library/API behavior needed |

## Notes / Future Considerations

- The issue title says "three init paths" but there are actually four — the GitLab plugin has both `commands/workflow-init.md` and `skills/kaola-workflow-init/SKILL.md`. All four must be updated.
- After this change, the Codex SKILL.md will write `CLAUDE.md` — this removes the historic "Do not create or edit CLAUDE.md" restriction from both Codex skills, which is intentional per the issue spec.
- The validator for the GitHub Codex SKILL (assertConcept, lines 183-190) will continue to pass because the 6 durable-state tokens will be present in the CLAUDE.md template section of the SKILL.
- Re-running init on a conforming repo must be a no-op; the idempotent-update instructions must be explicit in all four init files.
- The "Preserve user changes" and "Verify with the relevant command" bullets currently in the Non-Negotiable Rules template are not part of the canonical 5-bullet set — they should be dropped from the template (but not from the repo's own CLAUDE.md if the user has kept them; the dogfood CLAUDE.md is what needs to match).
