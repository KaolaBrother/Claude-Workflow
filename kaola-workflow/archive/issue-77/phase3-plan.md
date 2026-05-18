# Phase 3 - Plan: issue-77

## Blueprint Summary

Approach A — Typed-acknowledgement delegation gate. Replace ungated fallback prose in 6 phase SKILL.md files (GitHub + GitLab), add Delegation Contract to `kaola-workflow-next/SKILL.md`, update compliance ledger vocabulary, and add validator assertions to both the GitHub and GitLab contract validators.

Full implementation detail: `.cache/code-architect.md`
Advisor plan gate: `.cache/advisor-plan.md`

## Implementation Blueprint

### Files to Edit (16 total)

**Group 1 — GitHub phase SKILL.md edits (parallel, steps 1-6):**
1. `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md` — replace step 3 prose; update code-explorer compliance row vocab
2. `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md` — replace step 1 prose; update planner compliance row vocab
3. `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md` — replace blueprint paragraph prose; update code-architect compliance row vocab + fix path to `.cache/code-architect.md`
4. `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md` — replace opening paragraph (two coupled sentences); keep table row as `pending`
5. `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md` — replace step 2 + step 4 fallback clauses; update quality review, security review, review-fix rows
6. `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` — replace step 3 fallback clause; add `doc-updater` compliance row

**Group 2 — Delegation Contract (step 7):**
7. `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` — add "Delegation Contract" section between "Autonomy Policy" and "Agent Issue Selection"; section must instruct agent to ask user for delegation authorization at startup

**Group 3 — GitHub validator (step 8):**
8. `scripts/validate-kaola-workflow-contracts.js` — add 8 negative assertions (old prose) + loop asserting `subagent-invoked`, `local-fallback-explicit`, `local-fallback-tool-unavailable` present in all 7 skills

**Group 4 — GitLab mirrors (steps 9-15, parallel):**
9-14. `plugins/kaola-workflow-gitlab/skills/kaola-workflow-{research,ideation,plan,execute,review,finalize}/SKILL.md` — identical edits to GitHub counterparts
15. `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md` — Delegation Contract section (no PR/pull-request language)

**Group 5 — GitLab validator (step 16):**
16. `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` — add inline negative + positive assertions (follows existing `assert(!read(file).includes(...))` style)

### Key Prose Replacements

**research/SKILL.md step 3 OLD needle:** `'when subagents are available; otherwise perform the same read-only research'`
**ideation/SKILL.md step 1 OLD needle:** `'when subagents are available; otherwise perform the same strategy analysis'`
**plan/SKILL.md blueprint OLD needle:** `'when subagents are available; otherwise produce the same blueprint'`
**execute/SKILL.md OLD needles (2):** `'when subagents are available'` AND `'Use the current Codex session as the fallback executor'`
**review/SKILL.md step 2 OLD needle:** `'otherwise perform a review stance locally'`
**review/SKILL.md step 4 OLD needle:** `'or perform the same security review locally'`
**finalize/SKILL.md OLD needle:** `'subagents are available; otherwise update docs'`

**Replacement pattern (per skill):**
`"Use the <role> Codex agent role for this step. Record status as subagent-invoked in the compliance ledger if delegation occurred, local-fallback-explicit if the user explicitly authorized local execution, or local-fallback-tool-unavailable if the subagent tooling was unavailable."`

### Validator Assertion Details

**Negative (GitHub validator, 8 assertions):**
- research: `'when subagents are available; otherwise perform the same read-only research'`
- ideation: `'when subagents are available; otherwise perform the same strategy analysis'`
- plan: `'when subagents are available; otherwise produce the same blueprint'`
- execute (×2): `'when subagents are available'` + `'Use the current Codex session as the fallback executor'`
- review (×2): `'otherwise perform a review stance locally'` + `'or perform the same security review locally'`
- finalize: `'subagents are available; otherwise update docs'`

**Positive (GitHub validator, loop over 7 skills including next):**
- `assertIncludes(file, 'subagent-invoked')`
- `assertIncludes(file, 'local-fallback-explicit')`
- `assertIncludes(file, 'local-fallback-tool-unavailable')`

### Insert Point in `validate-kaola-workflow-contracts.js`
After the last existing `assertNotIncludes` / `assertIncludes` block (around line 95), before the `const sharedScripts = [...]` block.

### Delegation Contract Placement in `kaola-workflow-next/SKILL.md`
Between the `## Autonomy Policy` section and the `## Agent Issue Selection (Required Before Startup)` section. Must:
- Instruct agent to explicitly ask user for delegation policy at startup
- Present three options: `delegate`, `local-authorized`, `tool-unavailable`
- State write order: (1) ask user, (2) call startup, (3) append `delegation_policy:` to `workflow-state.md`
- Include "Skip if `delegation_policy:` already set in workflow-state.md"

### Advisor-Resolved Constraints

1. **execute table row stays `pending`** — Phase 4 per-task rows use `pending` as resume-detection signal; vocab update is in prose only
2. **code-architect compliance row path** — fix to `.cache/code-architect.md` (current template incorrectly says `.cache/architect.md`)
3. **delegation_policy re-entry safety confirmed** — `cmdStartup` short-circuits on `owned` without calling `writeState()`; the append is safe
4. **No global `assertNotIncludes(file, 'invoked')`** — `invoked` is substring of `subagent-invoked`; only prose-phrase needles used for negative assertions

## Out of Scope

- `kaola-workflow-fast/SKILL.md` — deliberate inline-only policy (grep confirmed clean)
- `kaola-workflow-init/SKILL.md` — data-source gating, not delegation
- `validate-workflow-contracts.js` (root + plugin copy) — byte-sync invariant; no changes
- `simulate-kaola-workflow-walkthrough.js` — test surface expansion is follow-up issue
- `workflow-state.md` `delegation_policy:` machine-readable field beyond the startup append — follow-up issue

## Test Requirements

After Phase 4 implementation:
1. `node scripts/validate-kaola-workflow-contracts.js` — must exit 0
2. `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` — must exit 0
3. `KAOLA_WORKFLOW_OFFLINE=1 node scripts/simulate-workflow-walkthrough.js` — must exit 0 (regression check)

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | subagent-invoked | .cache/code-architect.md | |
| advisor plan gate | subagent-invoked | .cache/advisor-plan.md | |
| blueprint revisions | N/A | — | no gaps found; plan is complete |
