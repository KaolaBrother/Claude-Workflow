# Architect Blueprint

## Files To Modify

| File | Purpose |
|------|---------|
| `README.md` | Document autonomous decision policy, goal-driven continuation, and true user authorization boundaries. |
| `commands/workflow-init.md` | Seed initialized projects with the autonomy and goal policy. |
| `commands/workflow-next.md` | Make the Claude router goal-driven and autonomous for issue/project selection when safe. |
| `commands/kaola-workflow-phase1.md` | Replace project-name confirmation with deterministic collision-safe naming. |
| `commands/kaola-workflow-phase2.md` | Replace user strategy selection with internal advisor-backed selection. |
| `commands/kaola-workflow-phase3.md` | Replace Phase 4 user confirmation with autonomous continuation after advisor-reviewed plan. |
| `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` | Add Codex goal contract and autonomous selection rules. |
| `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md` | Add deterministic collision-safe naming and remove confirmation step. |
| `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md` | Add internal expert-backed selection. |
| `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md` | Continue to execution after plan self-review without user approval. |
| `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md` | Add phase goal contract. |
| `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md` | Add phase goal contract. |
| `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` | Add phase goal contract with final audit requirement. |
| `scripts/validate-workflow-contracts.js` | Enforce Claude command/docs acceptance text. |
| `scripts/validate-kaola-workflow-contracts.js` | Enforce Codex skill acceptance text. |
| `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | Update simulated Phase 2/3 artifact wording if needed. |

## Build Sequence

1. Patch command and skill instructions for autonomy and goal contracts.
2. Patch README and workflow-init so user-facing docs match behavior.
3. Patch validation scripts to assert the new contract.
4. Run targeted contract tests, then full `npm test` if available.

## Task List

### Task 1: Claude autonomy contract
- Files: `README.md`, `commands/workflow-init.md`, `commands/workflow-next.md`, `commands/kaola-workflow-phase1.md`, `commands/kaola-workflow-phase2.md`, `commands/kaola-workflow-phase3.md`
- Write Set: same as files
- Depends On: none
- Parallel Group: serial
- Action: MODIFY
- Implement: autonomous naming, internal advisor decisions, goal-driven continuation, authorization boundaries.
- Validate: `node scripts/validate-workflow-contracts.js`

### Task 2: Codex autonomy contract
- Files: `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md`, `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md`, `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md`, `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md`, `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md`, `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md`, `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md`
- Write Set: same as files
- Depends On: Task 1 for wording consistency
- Parallel Group: serial
- Action: MODIFY
- Implement: equivalent Codex goal contract and autonomous decision policy.
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 3: Contract tests and walkthrough
- Files: `scripts/validate-workflow-contracts.js`, `scripts/validate-kaola-workflow-contracts.js`, `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- Write Set: same as files
- Depends On: Tasks 1 and 2
- Parallel Group: serial
- Action: MODIFY
- Implement: assertions for no Phase 1 name confirmation, deterministic collision-safe naming, `/goal` or Stop-hook wording, Codex goal contract, and internal expert decisions.
- Validate: `npm run test:kaola-workflow:codex`, `npm run test:kaola-workflow:claude`, `npm test`
