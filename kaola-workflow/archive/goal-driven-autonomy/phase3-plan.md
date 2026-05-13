# Phase 3 - Plan: goal-driven-autonomy

## Blueprint

### Files to Create

| File | Purpose | Key Interfaces |
|------|---------|----------------|
| none | No new runtime files needed | N/A |

### Files to Modify

| File | Changes | Why |
|------|---------|-----|
| `README.md` | Document autonomous decision policy, goal-driven continuation, and authorization boundaries | User-facing behavior docs |
| `commands/workflow-init.md` | Add durable initialized-project guidance | New projects inherit the policy |
| `commands/workflow-next.md` | Add router-level goal continuation and autonomous issue/project selection | Entry point owns continuation and roadmap selection |
| `commands/kaola-workflow-phase1.md` | Replace project-name confirmation with deterministic collision-safe naming | Primary acceptance criterion |
| `commands/kaola-workflow-phase2.md` | Auto-select advisor-reviewed approach | Essential technical decisions should not bounce back to user |
| `commands/kaola-workflow-phase3.md` | Continue to Phase 4 after advisor-reviewed plan | Internal workflow mechanics should continue |
| `plugins/kaola-workflow/skills/kaola-workflow-*.md` | Add equivalent Codex goal/autonomy contract | Codex acceptance criteria |
| `scripts/validate-workflow-contracts.js` | Add Claude contract assertions | Prevent regression |
| `scripts/validate-kaola-workflow-contracts.js` | Add Codex contract assertions | Prevent regression |
| `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | Keep walkthrough language aligned | Preserve simulation evidence |

### Build Sequence

1. Patch Claude command and README/init surfaces.
2. Patch Codex skill surfaces.
3. Patch validators and simulations.
4. Run targeted validators and full `npm test`.

### Parallelization Plan

| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| serial | 1, 2, 3 | Wording and validator assertions depend on shared phrases |

### External Dependencies

None.

## Task List

### Task 1: Claude autonomy contract

- File: `README.md`, `commands/workflow-init.md`, `commands/workflow-next.md`, `commands/kaola-workflow-phase1.md`, `commands/kaola-workflow-phase2.md`, `commands/kaola-workflow-phase3.md`
- Test File: `scripts/validate-workflow-contracts.js`
- Write Set: listed files only
- Depends On: none
- Parallel Group: serial
- Action: MODIFY
- Implement: autonomous naming, internal advisor decisions, goal-driven continuation, and authorization boundaries.
- Mirror: existing command sections and README prose.
- Validate: `node scripts/validate-workflow-contracts.js`

### Task 2: Codex autonomy contract

- File: `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md`, `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md`, `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md`, `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md`, `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md`, `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md`, `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md`
- Test File: `scripts/validate-kaola-workflow-contracts.js`
- Write Set: listed files only
- Depends On: Task 1 wording.
- Parallel Group: serial
- Action: MODIFY
- Implement: equivalent Codex goal contract and autonomous decision policy.
- Mirror: existing compact SKILL.md style.
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 3: Contract tests and walkthrough

- File: `scripts/validate-workflow-contracts.js`, `scripts/validate-kaola-workflow-contracts.js`, `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- Test File: same files
- Write Set: listed files only
- Depends On: Tasks 1 and 2.
- Parallel Group: serial
- Action: MODIFY
- Implement: assertions for autonomous naming, collision-safe names, goal contract, internal expert decisions, and no generated-name confirmation.
- Mirror: existing `assertIncludes` pattern.
- Validate: `npm run test:kaola-workflow:codex`, `npm run test:kaola-workflow:claude`, `npm test`

## Advisor Notes

The advisor gate found the plan complete. It required explicit tests preventing the old generated-name confirmation from returning and preserving user authorization boundaries.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | .cache/advisor-plan.md | advisor found no gaps |
