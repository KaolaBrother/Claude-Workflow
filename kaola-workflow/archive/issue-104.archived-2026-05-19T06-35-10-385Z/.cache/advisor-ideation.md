# advisor-ideation raw output — issue-104

## Verdict
A1 + B1 confirmed sound. Lock them in.

## Scope flag (user-owned)
Codex SKILL.md mirrors at `plugins/kaola-workflow/skills/kaola-workflow-fast/SKILL.md` and `plugins/kaola-workflow-gitlab/skills/kaola-workflow-fast/SKILL.md` would expand scope from 4 files (as named in issue #104) to 6 files. This crosses the materiality line — Phase 2 hard gate says ask user. User has consistently asked for "simpler" in prior turns; default is 4 files + follow-up issue for SKILL.md parity unless user explicitly opts in.

## Phase 3 resolutions (defer)
1. Verify `claim.js startup` creates `kaola-workflow/{project}/.cache/`. Quick grep `mkdir.*cache` in `scripts/kaola-workflow-claim.js` settles it. If yes, fast.md Step 1 just writes; if no, fast.md needs explicit `mkdir -p`.
2. `fast-summary.md` template overlap: current `## Implementation Evidence` and `## Review` sections semantically overlap the new Required Agent Compliance table. Phase 3 should decide: (a) replace those sections with the table, or (b) keep both — table = authoritative compliance, prose sections = human-readable summary of `.cache/` files. Mirroring phase files (which keep both) suggests (b).

## Implementation note for Phase 3 author
`planner` agent's tools are `Read, Grep, Glob` only — no Write. Rewritten Step 1 must explicitly state the orchestrator (main session) writes the captured plan into `fast-summary.md`, not the planner itself.

## Locked decisions (do not re-litigate)
- Subagent model: planner / tdd-guide / code-reviewer (user-chosen via AskUserQuestion).
- 6-phase routing for #104 (user-chosen via AskUserQuestion).
- Fast-mode ceremony cost: real but acknowledged and accepted.

## Next gate
Step 3 (internal selection) + Step 4 (write phase2-ideation.md) with A1 + B1 + scope = 4 or 6 files (pending user answer).
