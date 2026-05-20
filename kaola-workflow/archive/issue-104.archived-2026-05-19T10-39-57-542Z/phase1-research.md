# Phase 1 - Research / Discovery: issue-104

## Deliverable

Two bundled doc changes to the workflow tooling:

**Gap A — Path Intent (Step 0a-1)**
Add a new "Startup Step 0a-1" between Step 0a (PR/MR Intent Capture) and Step 0b (Startup Transaction) in `commands/workflow-next.md` and `plugins/kaola-workflow-gitlab/commands/workflow-next.md`. The agent (not the script) judges fast-vs-full mode using precedence: env `KAOLA_PATH` > prompt prose triggers > issue rubric (`gh issue view` / `glab issue view`) > default `full`. Append `Workflow path:` line to "Required Output Before Routing" block.

**Gap B — Subagent enforcement in fast mode**
Rewrite Steps 1-3 of `commands/kaola-workflow-fast.md` and its GitLab mirror to delegate work to named subagents instead of inline session execution:
- Step 1 (Plan) → `planner` agent (matches Phase 2 invocation pattern)
- Step 2 (Execute) → `tdd-guide` agent (matches Phase 4 per-task loop)
- Step 3 (Review) → `code-reviewer` agent (matches Phase 5)

Preserve mid-flight fast→full escalation contract unchanged.

## Why

- **Gap A**: Trivial issues today incur full 6-phase ceremony unless the user remembers `KAOLA_PATH=fast`. Agent-judged path selection at startup cuts ceremony for genuinely small changes while preserving the conservative full default.
- **Gap B**: Fast mode currently bypasses the same subagent isolation/TDD guarantees the full workflow's Phase 4 enforces. Inline execution skips test-first discipline and risks correctness on changes that would benefit from the same review rigor. Delegating to subagents brings fast mode under the same agent-compliance contract as full workflow.

Bundled because both changes touch the fast-path contract; splitting would force two PR reviews on the same conceptual surface.

## Affected Area

- `commands/workflow-next.md` (GitHub variant) — insertion site for Step 0a-1; edit to Required Output block.
- `plugins/kaola-workflow-gitlab/commands/workflow-next.md` (GitLab mirror) — same edits with GitLab/MR/glab substitutions.
- `commands/kaola-workflow-fast.md` (GitHub variant) — rewrite Steps 1-3 prose to use subagent delegations.
- `plugins/kaola-workflow-gitlab/commands/kaola-workflow-fast.md` (GitLab mirror) — same rewrite (single substitution: GitHub→GitLab issue body).
- Reference (read-only): `commands/kaola-workflow-phase2.md`, `commands/kaola-workflow-phase4.md`, `commands/kaola-workflow-phase5.md` for canonical subagent invocation patterns.
- (Open question for Phase 2): Codex SKILL.md mirrors at `plugins/kaola-workflow/skills/kaola-workflow-fast/SKILL.md` and `plugins/kaola-workflow-gitlab/skills/kaola-workflow-fast/SKILL.md` for runtime parity.

## Key Patterns Found

1. **Subagent invocation prelude** (`commands/kaola-workflow-phase4.md:233-253`): orchestrator updates `workflow-state.md` with `step:`, `main_session_role: orchestrator`, `implementation_owner: <agent>`, `inline_emergency_fallback_authorized: no` BEFORE invoking the subagent.
2. **Raw-output persistence** (`commands/kaola-workflow-phase2.md:61-89`, `phase5.md:130-143`): every subagent's raw output is persisted to `.cache/<agent-name>.md` for resume safety; orchestrator does not rely on conversation memory.
3. **Required Agent Compliance table** (`commands/kaola-workflow-phase1.md:186-191`): four-column table — Requirement, Status, Evidence, Skip Reason. Statuses: `invoked`, `invoked/N/A`, `pending`. Pending rows block phase advancement.
4. **Step 0a prose-detection precedent** (`commands/workflow-next.md:69-76`): the agent sniffs the user's initial prompt for keywords and exports an env var before calling startup. Step 0a-1 will follow this exact precedent.

## Test Patterns

- Framework: Hand-rolled `assert` from Node (no Jest/Mocha). See `scripts/simulate-workflow-walkthrough.js`.
- Location: `scripts/simulate-workflow-walkthrough.js` (single integration file).
- Structure: top-level `function testXxx()` blocks called from `main()`; final `console.log("Workflow walkthrough simulation passed")` on success.
- Fast-mode coverage: `testFastStartupState` at lines 461-474 asserts `claim.js` startup writes correct state when `KAOLA_PATH=fast`. No prose assertions on `commands/kaola-workflow-fast.md` content.
- Contract validators: `scripts/validate-workflow-contracts.js` and `scripts/validate-kaola-workflow-contracts.js` check file existence and a few string presence checks. Neither asserts fast-mode step prose. GitLab variant `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js:53-58` enforces `assertNoForbidden` blocking GitHub-specific tokens in GitLab files.

## Config & Env

- `KAOLA_PATH` env (`scripts/kaola-workflow-claim.js:332`): `args.workflowPath || process.env.KAOLA_PATH || 'full'` — controls `workflow_path` recorded in `workflow-state.md`. Step 0a-1 sets this env before Step 0b.
- `KAOLA_TARGET_ISSUE` env: set by Step 0; consumed by startup transaction and (in Step 0a-1) used to fetch the issue for rubric evaluation.
- `KAOLA_SINK` env: existing precedent for prose-detected env export (Step 0a PR Intent).
- `KAOLA_WORKFLOW_OFFLINE=1`: classifier honors offline mode; Step 0a-1 rubric must degrade to "default full" when gh/glab is unavailable.

## External Docs

N/A — internal tooling change. See `.cache/docs-lookup.md`.

## GitHub Issue

KaolaBrother/Kaola-Workflow#104

## Completeness Score

10/10
- Goal clarity: 3/3 (bundled change with clear A and B specs)
- Expected outcome: 3/3 (concrete acceptance criteria in issue body)
- Scope boundaries: 2/2 (named files; explicit out-of-scope list)
- Constraints: 2/2 (#44 contract preserved; escalation as safety net)

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | invoked/N/A | .cache/docs-lookup.md | internal tooling; no external library/API behavior involved |

## Notes / Future Considerations

- **Codex SKILL.md parity**: Two SKILL.md files at `plugins/kaola-workflow/skills/kaola-workflow-fast/SKILL.md` and `plugins/kaola-workflow-gitlab/skills/kaola-workflow-fast/SKILL.md` are byte-identical to the current fast command and describe Step 2 as inline. Phase 2 should decide whether to include them in scope. If included, total file count rises from 4 to 6.
- **Fast-mode `.cache/` directory**: Not currently used in fast mode. The subagent rewrite will introduce `.cache/planner.md`, `.cache/tdd-guide.md`, `.cache/code-reviewer.md` writes. The `fast-summary.md` should reference these via a Required Agent Compliance table mirroring phase files.
- **Path Intent rubric and GitLab assertNoForbidden**: The GitLab mirror of Step 0a-1 must avoid `\bgh\b`, `GitHub`, `pull request`, `PR URL`, `PR number`, and `[a-z]+glab` per the GitLab validator. Use `glab issue view "$KAOLA_TARGET_ISSUE" --output json` and "merge request" terminology.
- **`code-architect` vs `planner` correction**: Issue body description referenced "Phase 3 → planner" mapping; research clarifies Phase 3 uses `code-architect` and `planner` is Phase 2's agent. The plan/execute/review → planner/tdd-guide/code-reviewer mapping for fast mode is unchanged but the phase comparison should reference Phase 2 (not 3) for the planner pattern.
