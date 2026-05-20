# Phase 2 - Ideation: issue-104

## Approaches Evaluated

### Gap A — Path Intent (Step 0a-1)

#### Option A1: Single inline Step 0a-1 with full precedence rubric (SELECTED)
- Summary: One prose section between Step 0a (PR/MR Intent) and Step 0b (Startup Transaction). Agent applies precedence chain `KAOLA_PATH` env > prompt prose > issue rubric > default `full`. Append `Workflow path:` line to Required Output block at line 293.
- Pros: mirrors Step 0a precedent one-to-one; single audit point; precedence short-circuits avoid `gh`/`glab` calls when env or prompt match; OFFLINE/CLI-missing modes degrade cleanly.
- Cons: longest new prose block in the file.
- Risk: Low
- Complexity: Small

#### Option A2: Split into 0a-1 (prompt sniff) + 0a-2 (issue rubric)
- Summary: Two consecutive sections separating cheap (env/prompt) from network (issue fetch) paths.
- Pros: physically separates cheap vs network paths.
- Cons: splits one logical concern across two steps with no precedent; doubles GitLab `assertNoForbidden` surface; precedence chain in A1 already wins the network-savings.
- Risk: Low-Medium
- Complexity: Medium

#### Option A3: Fold into existing Step 0
- Summary: Path detection lives inside Step 0 issue selection.
- Pros: issue body already fetched in Step 0.
- Cons: conflates issue identity vs execution mode; Step 0 is most-edited block; merge-conflict surface grows; breaks Step 0a precedent of post-Step-0 prose detection.
- Risk: Medium
- Complexity: Medium

### Gap B — Subagent enforcement in fast mode

#### Option B1: Mirror full workflow exactly — planner → tdd-guide → code-reviewer (SELECTED)
- Summary: Rewrite Steps 1-3 of `commands/kaola-workflow-fast.md` to delegate sequentially. Each step gets canonical prelude (`step:`, `main_session_role: orchestrator`, `implementation_owner: <agent>`, `inline_emergency_fallback_authorized: no`). Raw outputs persisted to `.cache/planner.md`, `.cache/tdd-guide.md`, `.cache/code-reviewer.md`. `fast-summary.md` gains a Required Agent Compliance table.
- Pros: directly closes the cited gap (test-first discipline + review rigor in fast mode); one contract instead of two; reviewers already know compliance pattern; mid-flight escalation contract unchanged.
- Cons: three subagent round-trips per fast run; fast-mode ceremony grows; user-visible "fast" now means fewer phases (1 vs 6), not inline execution.
- Risk: Low for correctness; Medium for user perception (mitigate via explanatory prose in fast.md).
- Complexity: Medium

#### Option B2: Lightweight — only Step 2 delegates to tdd-guide
- Summary: Plan and Review stay inline; only Execute → tdd-guide.
- Pros: smaller patch.
- Cons: partial gap closure; two contracts to maintain; issue spec names all three subagents; inline planning still depends on conversation memory (breaks raw-output-persistence pattern).
- Risk: Medium
- Complexity: Small

#### Option B3: Two-tier — subagent default + inline fallback for ≤1 file no-test scope
- Summary: In-prose decision tree inside Step 1 that flips to inline execution under tight conditions.
- Pros: reclaims some speed.
- Cons: prose-encoded decision tree risks looking like script-side reasoning (issue #44 magnet); mid-flight escalation contract already provides safety valve in opposite direction; "no test changes needed" is precisely the precondition the issue says is wrong.
- Risk: High (contract violation); Medium (correctness).
- Complexity: Large

## Advisor Findings

A1 + B1 confirmed sound; locked in. Two Phase 3 resolutions deferred (verify `.cache/` creation in `claim.js startup`; decide `fast-summary.md` template overlap between Required Agent Compliance table and existing `## Implementation Evidence` / `## Review` sections — mirroring phase files suggests keep both). One implementation note: `planner` agent has Read/Grep/Glob tools only — Step 1 prose must state explicitly that the orchestrator (main session) writes the plan into `fast-summary.md`. Subagent model and 6-phase routing locked by prior user choices; do not re-litigate. Codex SKILL.md scope was flagged as user-owned — user has since elected to include both SKILL.md files, raising scope from 4 to 6 files.

## Selected Approach

**Gap A: Option A1** — Single inline Step 0a-1 with full precedence rubric.
**Gap B: Option B1** — Mirror full workflow (planner / tdd-guide / code-reviewer).

**Scope: 6 files**
1. `commands/workflow-next.md` — insert Step 0a-1; append `Workflow path:` to Required Output.
2. `plugins/kaola-workflow-gitlab/commands/workflow-next.md` — mirror with GitLab/MR/glab substitutions; honor `assertNoForbidden`.
3. `commands/kaola-workflow-fast.md` — rewrite Steps 1-3 with subagent delegations; update fast-summary template; update resume detection if needed.
4. `plugins/kaola-workflow-gitlab/commands/kaola-workflow-fast.md` — mirror (single GitHub→GitLab substitution).
5. `plugins/kaola-workflow/skills/kaola-workflow-fast/SKILL.md` — Codex runtime parity.
6. `plugins/kaola-workflow-gitlab/skills/kaola-workflow-fast/SKILL.md` — Codex runtime + GitLab parity.

## Rationale

- A1 mirrors the existing Step 0a precedent exactly, minimizing reviewer cognitive load.
- B1 matches the issue's explicit subagent enumeration and produces one workflow contract rather than two.
- Including the SKILL.md mirrors (per user election) preserves Codex/Claude Code runtime parity in a single PR rather than leaving a divergence window.
- Both options preserve issue #44 (agent owns reasoning, scripts own atomicity), the fast→full mid-flight escalation contract, and pass all validator assertions per Phase 1 breakage analysis.

## Out of Scope (explicit)

- Changes to `scripts/kaola-workflow-claim.js` or `scripts/kaola-workflow-classifier.js` (script-side path selection forbidden by #44).
- Changes to mid-flight escalation trigger list (preserve unchanged).
- New validator assertions on fast-mode prose (Phase 1 confirmed no prose checks exist; do not add).
- Changes to the precedence chain itself (env > prompt > rubric > full is spec-locked).
- Subagent compliance contract on the fast → Phase 6 handoff (scope is fast steps 1-3 + Step 0a-1; Phase 6 changes belong to a separate issue).

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
