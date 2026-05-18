# Phase 2 - Ideation: issue-77

## Approaches Evaluated

### Option A: Soft contract / typed-acknowledgement gate (recommended)
- **Summary:** Rewrite ungated fallback sentences in each required-role skill to require an explicit typed status. Expand compliance ledger vocabulary from binary `invoked`/`invoked/N/A` to `subagent-invoked` / `local-fallback-explicit` / `local-fallback-tool-unavailable` / `N/A`. Require Evidence or Skip Reason for any non-`subagent-invoked` row. Add "Delegation Contract" section to `kaola-workflow-next/SKILL.md` that instructs the agent to ask the user for delegation authorization at startup. Extend `validate-kaola-workflow-contracts.js` and `validate-kaola-workflow-gitlab-contracts.js` with paired `assertNotIncludes` (old prose) + `assertIncludes` (new vocab) assertions.
- **Pros:** Directly closes the bug; reuses existing validator pattern; no state-schema changes; small mirror burden
- **Cons:** Self-report — validator cannot prove actual delegation occurred; `assertNotIncludes` is brittle to synonym drift (mitigated by paired positive assertion)
- **Risk:** Low — future synonym bypass is documented as residual risk
- **Complexity:** Small

### Option B: Hard gate mirroring Phase 4 command
- **Summary:** Require `inline_emergency_fallback_authorized: yes` in workflow-state for any local fallback; add must/must-not bullets and default-state blocks to every skill.
- **Pros:** Strongest behavioral signal; aligns Codex skills with Claude-command model
- **Cons:** Large diff (7 skills × 2 editions × multiple insertions); couples to workflow-state schema; high friction for legitimate tool-unavailable sessions
- **Risk:** Medium
- **Complexity:** Large

### Option C: Hybrid with `delegation_policy:` in workflow-state.md
- **Summary:** Approach A plus a new machine-readable field startup writes into `workflow-state.md`.
- **Pros:** Future-proof; machine-checkable
- **Cons:** No Codex API to probe availability; large scope; already flagged as follow-up in Phase 1
- **Risk:** Medium
- **Complexity:** Large to XL

## Advisor Findings

Advisor confirmed Approach A. Three implementation constraints identified for Phase 3:

1. **AC #1 requires explicit user-ask in kaola-workflow-next startup.** The new `kaola-workflow-next/SKILL.md` delegation contract section must explicitly instruct the agent to ASK the user for delegation authorization at startup — not merely state the policy. Phase 3 must lock the exact instruction language.

2. **Validator needle trap: `invoked` is a substring of `subagent-invoked`.** `assertNotIncludes(skill, 'invoked')` cannot work. Use positive assertions for new vocab tokens (`assertIncludes(skill, 'subagent-invoked')` + `assertIncludes(skill, 'local-fallback-explicit')`) and negative assertions ONLY for the prose phrases (`assertNotIncludes(skill, 'when subagents are available')`, `assertNotIncludes(skill, 'otherwise perform the same')`).

3. **execute-skill phrasing is the odd one out.** `kaola-workflow-execute/SKILL.md:8` uses a different phrase: `"Use the current Codex session as the fallback executor when session policy, availability, or user direction prevents delegation"`. Phase 3 must explicitly enumerate its replacement prose and its own negative needle.

4. **Self-report limitation acknowledged.** Any token in the new vocabulary is still self-reported. Approach A's value is typed-acknowledgement enforcement, not behavioral verification. Documented as acknowledged limitation, not a hidden one.

## Selected Approach

**Approach A — Soft contract / typed-acknowledgement gate**

Rationale:
1. Tightly scoped to the bug — makes bare `invoked` illegal, replaces with typed enum
2. Reuses existing validator `assertNotIncludes`/`assertIncludes` pattern
3. Smallest mirror burden (prose-only, 7 skills × 2 editions)
4. Composable — Approach C's machine-readable field layers on top later without rework

## Out of Scope (explicit)

- `kaola-workflow-fast/SKILL.md` — deliberate inline-only policy, not a conditional fallback
- `kaola-workflow-init/SKILL.md` — its "when available" references data sources, not subagent delegation
- Claude Code command files (`commands/kaola-workflow-phase*.md`) — already hard-gated
- `validate-workflow-contracts.js` root + plugin copy — byte-sync invariant; no changes
- `workflow-state.md` `delegation_policy:` field — follow-up issue
- New env var for delegation policy
- Probe-based subagent-availability detection
- `simulate-kaola-workflow-walkthrough.js` test surface expansion

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | subagent-invoked | .cache/planner.md | |
| advisor ideation gate | subagent-invoked | .cache/advisor-ideation.md | |
