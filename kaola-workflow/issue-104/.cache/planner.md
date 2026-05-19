# planner raw output — issue-104

## Gap A — Path Intent (Step 0a-1)

### Option A1 — Single inline Step 0a-1 with full precedence rubric (RECOMMENDED)
- Insert between Step 0a and Step 0b in `commands/workflow-next.md`.
- Precedence: `KAOLA_PATH` env > prompt prose > issue rubric (`gh issue view` / `glab issue view`) > default `full`.
- Append `Workflow path:` line at line 293 of Required Output block.
- Pros: mirrors Step 0a exactly; one section = one audit point; precedence short-circuits avoid network calls; OFFLINE degrades cleanly.
- Cons: longest new prose block in the file.
- Risk: low. Complexity: low.

### Option A2 — Split: 0a-1 (prompt sniff) + 0a-2 (issue rubric)
- Pros: cheap-path vs network-path separation.
- Cons: splits one logical concern; no precedent in file; doubles GitLab forbidden-token surface; precedence short-circuit in A1 already wins the network-savings.
- Risk: low-medium. Complexity: low-medium.

### Option A3 — Fold into existing Step 0
- Pros: issue is already fetched in Step 0.
- Cons: conflates issue identity vs execution mode; Step 0 is most-edited; merge-conflict surface grows.
- Risk: medium. Complexity: medium.

## Gap B — Subagent enforcement in fast mode

### Option B1 — Mirror full workflow exactly (planner → tdd-guide → code-reviewer) (RECOMMENDED)
- Rewrite Steps 1-3 to delegate sequentially.
- Each step gets canonical prelude (`step:`, `main_session_role: orchestrator`, `implementation_owner: <agent>`, `inline_emergency_fallback_authorized: no`).
- Raw output persisted to `.cache/<agent>.md`.
- `fast-summary.md` gains a Required Agent Compliance table.
- Pros: directly addresses the gap; one contract instead of two; resume detection extends naturally; reviewers already know the compliance pattern.
- Cons: three subagent round-trips per fast run; fast-mode ceremony grows.
- Risk: low for correctness; medium for user perception (mitigate via prose explaining "fast = fewer phases, not inline execution").
- Complexity: medium.

### Option B2 — Lightweight (only Step 2 → tdd-guide)
- Pros: smaller patch; targets cited bug directly.
- Cons: partial closure; two contracts to maintain; issue spec names all three subagents.
- Risk: medium. Complexity: low.

### Option B3 — Two-tier (subagent default + inline fallback for ≤1 file no-test-change)
- Pros: reclaims some speed.
- Cons: in-prose decision tree risks looking like script-side reasoning (issue #44 magnet); mid-flight escalation contract already provides safety valve in the other direction.
- Risk: high contract-violation; medium correctness. Complexity: high.

## Recommendation
- Gap A: Option A1.
- Gap B: Option B1.

## Out of scope (carved off)
- Codex SKILL.md mirrors at `plugins/kaola-workflow/skills/kaola-workflow-fast/SKILL.md` and `plugins/kaola-workflow-gitlab/skills/kaola-workflow-fast/SKILL.md` — RECOMMEND INCLUDING (else Codex parity silently breaks).
- Changes to `claim.js` workflow_path handling.
- New validator assertions on fast-mode prose.
- Changes to mid-flight escalation trigger list.
- Subagent compliance on the fast→Phase 6 handoff.
- Changes to the precedence chain itself.

## Blind spots surfaced

1. **Resume detection in subagent-mode fast**: keep `fast-summary.md` status as sole resume signal; treat orphan `.cache/` files as advisory.
2. **`.cache/` directory creation timing**: verify `claim.js startup` creates it; if not, fast.md Step 1 owns `mkdir -p`.
3. **`fast-summary.md` Required Agent Compliance table**: must be added with rows for planner / tdd-guide / code-reviewer.
4. **Mid-flight escalation during in-flight subagent**: orchestrator owns escalation writes after subagent returns; clarify in rewritten Step 2 prose.
5. **Canonical prelude per step**: each of the three steps needs `main_session_role: orchestrator`, `implementation_owner: <agent>`, `inline_emergency_fallback_authorized: no` written explicitly.
6. **"Trivial Inline Edit" exemption** (current Step 3 line 109): with code-reviewer being Read-only, the main session must apply the fix as orchestrator. Either drop exemption or keep with explicit "orchestrator applies trivial fix" prose. RECOMMEND KEEP with orchestrator-applies prose.
7. **Codex SKILL.md mirrors**: see Out of Scope.
8. **GitLab Step 0a-1 prose constraints**: avoid `\bgh\b`, `GitHub`, `pull request`, `PR URL`, `PR number`, `[a-z]+glab` per assertNoForbidden.
9. **Precedence env > prompt rationale**: add one sentence explaining `KAOLA_PATH` is explicit user-set override vs inferred intent.
10. **Offline mode for issue rubric**: degrade to default full on any fetch failure (offline, missing CLI, auth, network).

## Missing Phase 1 facts (resolve during Phase 3)
- Verify `claim.js startup` creates `.cache/` (quick grep).
- User decision on Codex SKILL.md inclusion (not blocking — recommend include).

## File paths
- `commands/workflow-next.md` — Step 0a-1 insertion between lines 76-78; Required Output edit line 293.
- `plugins/kaola-workflow-gitlab/commands/workflow-next.md` — GitLab mirror.
- `commands/kaola-workflow-fast.md` — Steps 1-3 (lines 56-111) + resume block (lines 22-35) + fast-summary template (lines 113-135).
- `plugins/kaola-workflow-gitlab/commands/kaola-workflow-fast.md` — GitLab mirror.
- `plugins/kaola-workflow/skills/kaola-workflow-fast/SKILL.md` — Codex parity.
- `plugins/kaola-workflow-gitlab/skills/kaola-workflow-fast/SKILL.md` — Codex parity.
