# code-explorer raw output — issue-104

## 1. Subagent delegation pattern (model to mirror)

| Subagent | Phase | Cache path | Compliance row |
|---|---|---|---|
| `planner` | Phase 2 (`commands/kaola-workflow-phase2.md:61-89`) | `.cache/planner.md` | `\| planner \| invoked \| .cache/planner.md \| \|` |
| `tdd-guide` | Phase 4 per-task loop (`commands/kaola-workflow-phase4.md:233-253`) | `.cache/tdd-task-{n}.md` | `\| tdd-guide executor task N \| invoked \| .cache/tdd-task-N.md \| \|` |
| `code-reviewer` | Phase 5 (`commands/kaola-workflow-phase5.md:130-143`) | `.cache/code-reviewer.md` | `\| code-reviewer \| invoked \| .cache/code-reviewer.md \| \|` |

Pre-invoke state updates: `step:`, `main_session_role: orchestrator`, `implementation_owner: <agent>`, `inline_emergency_fallback_authorized: no`. Post-invoke: orchestrator validates output, updates compliance row to `invoked`, persists raw output to `.cache/`.

**Note**: Original issue body said "Step 1 Plan → planner" mapping to Phase 3, but research clarifies Phase 3 uses `code-architect`. `planner` lives in Phase 2. The mapping plan/execute/review → planner/tdd-guide/code-reviewer for fast mode is internally consistent with full workflow.

## 2. Current fast-mode contract

`commands/kaola-workflow-fast.md`:
- Step 1 Plan (lines 56-79): inline, derives scope from issue body or phase1/2 artifacts, writes fast-summary.md stub IN_PROGRESS.
- Step 2 Execute (lines 81-97): "No Claude Code implementation agent is spawned for fast-path; the main session implements inline." Updates fast-summary status to REVIEW.
- Step 3 Review (lines 99-111): lightweight self-review, updates fast-summary to PASSED.
- Escalation (lines 38-54): triggers = >2 files, test_thrash, security/architecture/breaking, in-flight dependency, new external package.
- `fast-summary.md` status sequence: IN_PROGRESS → REVIEW → PASSED (or ESCALATED at any point).
- `.cache/` directory is NOT used in fast mode today. Will need to be added for subagent outputs.

## 3. Current workflow-next.md structure

Step 0a (lines 69-76):
```
## Startup Step 0a — PR Intent Capture

Before the startup transaction, check the user's initial prompt for PR sink intent.
If it contains "open a PR", "create a PR", "pull request", "sink=pr", "KAOLA_SINK=pr",
or "PR sink" (case-insensitive), export `KAOLA_SINK=pr` before the startup call.
The `${KAOLA_SINK:+--sink $KAOLA_SINK}` pass-through in Startup Step 0 propagates it.
Keyword matching is agent-level prose detection, not a bash conditional.
```

Step 0b header at line 78. Step 1 at line 119.

Required Output block (lines 284-296) — byte-identical between GitHub and GitLab variants. Insertion line: after `Branch:` (line 293).

## 4. Required Agent Compliance pattern

Canonical example from `commands/kaola-workflow-phase1.md:186-191`:
```
## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | invoked/N/A | .cache/docs-lookup.md or docs impact check | [reason if N/A] |
```

Four columns: Requirement, Status, Evidence, Skip Reason. Statuses: invoked / invoked/N/A / pending.

## 5. Validators — breakage assessment

- `scripts/simulate-workflow-walkthrough.js`: `testFastStartupState` at lines 461-474 asserts ONLY claim.js behavior (writes `workflow_path: fast`, `phase: fast`, `next_command: /kaola-workflow-fast issue-503`, `next_skill: kaola-workflow-fast issue-503`). Zero assertions on command prose. **Safe to modify both files.**
- `scripts/validate-workflow-contracts.js`: line 64 asserts `commands/kaola-workflow-fast.md` exists; line 97-98 check claim.js internals. Lines 73-80 check `workflow-next.md` for `'thin router'`, `'active folders'`, `'watch-pr'`, `'--target-issue'`, `'## Co-active Folders'` — all preserved by our edits. **Safe.**
- `scripts/validate-kaola-workflow-contracts.js`: line 74 enforces `plugins/kaola-workflow/skills/kaola-workflow-fast/SKILL.md` existence. delegationPolicyCompliance fixtures (lines 172-186) are pure JS unit tests, not prose checks. **Safe.**
- `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` lines 53-58: `assertNoForbidden` on GitLab files blocks `\bgh\b`, `GitHub`, `PR URL`, `PR number`, `pull request`, `[a-z]+glab`. **Step 0a-1 GitLab mirror must avoid these.**

## 6. GitLab mirror divergence

`commands/kaola-workflow-fast.md` vs GitLab variant: single substitution at line 59 — `GitHub issue body` → `GitLab issue body`. No other divergence; no CLI commands, scripts, or sink terminology in fast.md.

`commands/workflow-next.md` vs GitLab variant: comprehensive substitutions — see table in research notes. Required Output block IS byte-identical between variants (same edit applies).

## 7. Subagent registry

All three subagents exist as Claude Code agents at `/Users/ylpromax5/.claude/agents/`:
- `planner.md` — model: opus, tools: Read/Grep/Glob, `kaola-workflow-managed-agent: true`
- `tdd-guide.md` — model: sonnet, tools: Read/Write/Edit/Bash/Grep, `kaola-workflow-managed-agent: true`
- `code-reviewer.md` — model: sonnet, tools: Read/Grep/Glob/Bash, `kaola-workflow-managed-agent: true`

None defined inside this repo.

## 8. Adjacent — Codex SKILL.md mirrors (out of stated scope)

Two Codex-runtime SKILL.md files parallel the fast command and are currently byte-identical:
- `plugins/kaola-workflow/skills/kaola-workflow-fast/SKILL.md`
- `plugins/kaola-workflow-gitlab/skills/kaola-workflow-fast/SKILL.md`

Both describe Step 2 as inline. Their existence is enforced by validator line 74 but no prose checks. **Open question for Phase 2**: whether to include them in scope for parity with the command rewrite.

## Key file list

- `commands/workflow-next.md` — Step 0a-1 insertion site (critical)
- `plugins/kaola-workflow-gitlab/commands/workflow-next.md` — GitLab mirror (critical)
- `commands/kaola-workflow-fast.md` — Steps 1/2/3 rewrite (critical)
- `plugins/kaola-workflow-gitlab/commands/kaola-workflow-fast.md` — GitLab mirror (critical)
- `commands/kaola-workflow-phase2.md` — canonical planner pattern (reference)
- `commands/kaola-workflow-phase4.md` — canonical tdd-guide pattern (reference)
- `commands/kaola-workflow-phase5.md` — canonical code-reviewer pattern (reference)
- `scripts/simulate-workflow-walkthrough.js:461-474` — only fast-mode test (safe)
- `plugins/kaola-workflow/skills/kaola-workflow-fast/SKILL.md` — Codex parity (awareness)
- `plugins/kaola-workflow-gitlab/skills/kaola-workflow-fast/SKILL.md` — Codex parity (awareness)
