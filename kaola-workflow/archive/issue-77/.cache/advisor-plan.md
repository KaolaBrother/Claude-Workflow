# Advisor Gate — issue-77 plan

## Verdict
Approve to proceed to Phase 4. Three items checked and resolved before filing phase3-plan.md.

## Item 1 — Cache file path in code-architect compliance row
`kaola-workflow-plan/SKILL.md:59` currently shows `.cache/architect.md`. The correct convention (following `code-explorer` → `.cache/code-explorer.md`) is `.cache/code-architect.md`. Phase 4 must update the compliance table template row to `.cache/code-architect.md`. The blueprint as written in section 1c showed `.cache/architect.md` — Phase 4 corrects this.

**Resolution:** In Phase 4, when editing `kaola-workflow-plan/SKILL.md`, update compliance row to `.cache/code-architect.md`.

## Item 2 — `delegation_policy:` persistence under re-entry
Verified `scripts/kaola-workflow-claim.js:310`: when an active folder already exists, `cmdStartup` returns early with `{ status: 'owned' }` without calling `writeState()`. The `workflow-state.md` file is not rewritten on resume. The `delegation_policy:` append is safe.

**Resolution:** No change to Delegation Contract design. The write-order in section 1g is correct.

## Item 3 — execute/SKILL.md table row `pending` value
The `pending` value is the Phase 4 resume-detection signal. Replacing it with the delegation vocab template would break intra-phase resume. The blueprint prose update is sufficient for the positive validator assertions to pass (the prose contains the vocab tokens; the table is runtime-filled).

**Resolution:** Keep execute table template row as `pending`. Update only the prose paragraph (opening paragraph line 8). Positive assertions pass via prose.

## Additional Notes
- `simulate-kaola-workflow-walkthrough.js` legacy token checks are not at risk: the retired token list is `['invoked/pending', 'invoked/error']`-style values, not the word `invoked` itself. The new vocab tokens do not collide.
- This file satisfies the Phase 3 advisor gate requirement. Phase 4 may proceed.
