# Planner Output — issue-77

## Approach A — Soft contract / typed-acknowledgement gate (recommended)

**Summary.** Rewrite the ungated fallback sentence in each required-role skill to require an explicit recorded status. Expand compliance ledger vocabulary from `invoked`/`invoked/N/A` to `subagent-invoked`/`local-fallback-explicit`/`local-fallback-tool-unavailable`/`N/A`. Make skill text require Evidence or Skip Reason for any non-`subagent-invoked` row. Add prose "Delegation Contract" section to `kaola-workflow-next/SKILL.md`. Extend both validators with paired `assertNotIncludes` (old prose) + `assertIncludes` (new vocab).

**Pros.** Directly closes bug. Reuses existing validator pattern. No state-schema changes. Small mirror burden.
**Cons.** Self-report — validator can't prove actual delegation occurred. `assertNotIncludes` is brittle to synonym drift (mitigated by paired positive assertion).
**Risks.** Low. Future synonym bypass is documented as residual risk.
**Complexity.** Small.
**Architectural fit.** High — mirrors existing `retired` token enforcement in validators.

---

## Approach B — Hard gate mirroring Phase 4 command

**Summary.** Require `inline_emergency_fallback_authorized: yes` in workflow-state for any local fallback. Add must/must-not bullets and default-state blocks to every skill.

**Pros.** Strongest behavioral signal. Aligns Codex skills with Claude-command model.
**Cons.** Large diff (7 skills × 2 editions × multiple insertions). Couples to workflow-state schema. Touches claim.js and docs. High friction for legitimate tool-unavailable sessions.
**Complexity.** Large.
**Architectural fit.** Medium.

---

## Approach C — Hybrid with `delegation_policy:` in workflow-state.md

**Summary.** Approach A plus a new machine-readable field startup writes into `workflow-state.md`.

**Pros.** Future-proof. Machine-checkable.
**Cons.** No Codex API to probe availability. Large scope. Phase 1 already flagged as follow-up.
**Complexity.** Large to XL.
**Architectural fit.** Medium-low for this issue.

---

## Recommendation: Approach A

Rationale:
1. Tightly scoped to the bug — makes bare `invoked` illegal, replaces with typed enum
2. Reuses existing validator `assertNotIncludes`/`assertIncludes` pattern
3. Smallest mirror burden (prose-only, 7 skills × 2 editions)
4. Composable — Approach C's machine-readable field layers on top later without rework

Resolution of tensions:
- **(a) strictness**: typed-acknowledgement gate, not hard block
- **(b) startup field**: prose-only delegation contract in kaola-workflow-next for this issue
- **(c) ledger vocab**: 4-token enum — validator asserts old prose absent AND new tokens present

**Critical validator implementation:**
- `assertNotIncludes(skill, 'when subagents are available')` + `assertNotIncludes(skill, 'otherwise perform the same')`
- `assertIncludes(skill, 'subagent-invoked')` + `assertIncludes(skill, 'local-fallback-explicit')`
- execute/SKILL.md uses different phrasing (`Use the current Codex session as the fallback executor`) — needs its own needle

---

## Explicit Non-Goals

- `kaola-workflow-fast/SKILL.md` — deliberate inline-only policy, out of scope
- `kaola-workflow-init/SKILL.md` — data-source "when available", not delegation
- Claude command files — already hard-gated, do not edit
- `validate-workflow-contracts.js` root + plugin copy — byte-sync invariant; no changes
- `workflow-state.md` `delegation_policy:` field — follow-up issue
- New env var for delegation policy
- Probe-based subagent-availability detection
- `simulate-kaola-workflow-walkthrough.js` test surface expansion

---

## Missing Facts / Open Questions

1. Row-status precedence: if Phase 4 uses `tdd-guide` but also applies a Trivial Inline Edit, row status = `subagent-invoked` (primary owner) with inline note in Evidence/Skip Reason cell.
2. Legitimate `local-fallback-tool-unavailable` frequency — does not change recommendation but affects real-world impact.
3. Planned Codex subagent-availability API — would inform Approach C timing if near-term.
4. No concurrent in-flight branches found touching skill files (planner confirmed via search).
