# Phase 3 - Plan: issue-22

## Task List

### Task 1: Add claim helper ownership contract
- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/kaola-workflow-claim.js`, `scripts/simulate-workflow-walkthrough.js`
- Depends On: none
- Parallel Group: serial
- Action: MODIFY
- Implement: current-session resolution, validating `session --project`, owned-project bootstrap return, clear no-work message, explicit `handoff`.
- Mirror: existing claim/heartbeat/lock/state helpers from `phase1-research.md`.
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task 2: Make repair-state ownership-aware
- File: `scripts/kaola-workflow-repair-state.js`
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/kaola-workflow-repair-state.js`, `scripts/simulate-workflow-walkthrough.js`
- Depends On: Task 1
- Parallel Group: serial
- Action: MODIFY
- Implement: filter/validate active projects by current session id and preserve Sink/Lease when repairing state.
- Mirror: existing conservative route reconstruction.
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task 3: Update Claude/Codex startup surfaces
- File: `commands/workflow-next.md`, `hooks/hooks.json`, `scripts/kaola-workflow-session-env.js`, `install.sh`, `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md`
- Test File: `scripts/validate-workflow-contracts.js`, `scripts/validate-kaola-workflow-contracts.js`
- Write Set: command docs, hook config, new hook helper, installer, validators
- Depends On: Task 1
- Parallel Group: serial
- Action: CREATE/MODIFY
- Implement: Claude hook persists SessionStart `session_id`; Codex skill startup derives `CODEX_THREAD_ID`; router docs describe owned-project bootstrap.
- Mirror: existing compact hook and bootstrap snippets.
- Validate: `node scripts/validate-workflow-contracts.js && node scripts/validate-kaola-workflow-contracts.js`

### Task 4: Replace phase heartbeat adoption snippets
- File: `commands/kaola-workflow-phase*.md`, `plugins/kaola-workflow/skills/kaola-workflow-{research,ideation,plan,execute,review,finalize}/SKILL.md`
- Test File: `scripts/simulate-workflow-walkthrough.js`, `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- Write Set: phase command docs and Codex phase skills
- Depends On: Task 1
- Parallel Group: serial
- Action: MODIFY
- Implement: derive current id with `claim.js session`; validate project ownership with `session --project --session`; remove silent owner rehydration.
- Mirror: current heartbeat ticker pattern.
- Validate: simulations and contract validators.

### Task 5: Mirror shared scripts and update Codex simulation
- File: `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`, `plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js`, `plugins/kaola-workflow/scripts/kaola-workflow-repair-state.js`, `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- Test File: `scripts/validate-kaola-workflow-contracts.js`, `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- Write Set: plugin script mirrors and Codex simulation
- Depends On: Tasks 1-2
- Parallel Group: serial
- Action: MODIFY
- Implement: keep root/plugin shared scripts byte-identical where validator requires it.
- Mirror: validator's shared script list.
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 6: Document lifecycle, recovery, and roadmap order
- File: `README.md`, `scripts/kaola-workflow-roadmap.js`, `plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js`, `kaola-workflow/ROADMAP.md`
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: docs, roadmap generator, generated roadmap
- Depends On: Task 1
- Parallel Group: serial
- Action: MODIFY
- Implement: document `KAOLA_SESSION_ID`, Claude/Codex refresh/resume behavior, explicit handoff; sort roadmap issue rows ascending so #23 appears after #22.
- Mirror: user instruction to put #23 after #22.
- Validate: roadmap generate/validate tests.

## Safe Parallel Groups

None. The write sets are coupled through snippets, shared script mirrors, and simulations, so serial execution is safer.

## Exact Validation Commands

- `node scripts/validate-workflow-contracts.js`
- `node scripts/simulate-workflow-walkthrough.js`
- `node scripts/validate-kaola-workflow-contracts.js`
- `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- `npm run test:kaola-workflow:claude`
- `npm run test:kaola-workflow:codex`
- `node scripts/kaola-workflow-roadmap.js generate && node scripts/kaola-workflow-roadmap.js validate`

## Out of Scope

- No default `/workflow-start` command.
- No implicit recovery.
- No exact-path classifier implementation; issue #23 tracks that work.
- No broad release/version bump.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | performed in main session because delegated subagents were not explicitly requested |
| advisor plan gate | invoked | .cache/advisor-plan.md | performed in main session |
| blueprint revisions | invoked | .cache/advisor-plan.md | advisor coverage points incorporated into task plan |
