# Phase 3 - Plan: roadmap-open-issues

## Task List

### Task 1: Claim And Bootstrap Runtime Fixes
- File: scripts/kaola-workflow-claim.js, scripts/kaola-workflow-classifier.js
- Test File: scripts/simulate-workflow-walkthrough.js
- Write Set: scripts/kaola-workflow-claim.js, scripts/kaola-workflow-classifier.js, scripts/simulate-workflow-walkthrough.js
- Depends On: none
- Parallel Group: serial
- Action: MODIFY
- Implement: durable Sink/Lease state creation for new claims, heartbeat body preserving claim sentinel, tiebreaker local-only cleanup, remote-claim-aware classifier/bootstrap selection.
- Mirror: existing Epic Case 8/9 claim fixtures.
- Validate: node scripts/simulate-workflow-walkthrough.js

### Task 2: Sink Merge Branch Safety
- File: scripts/kaola-workflow-sink-merge.js
- Test File: scripts/simulate-workflow-walkthrough.js
- Write Set: scripts/kaola-workflow-sink-merge.js, scripts/simulate-workflow-walkthrough.js
- Depends On: none
- Parallel Group: serial
- Action: MODIFY
- Implement: clean-worktree guard and checkout of requested branch before merge-base/rebase logic.
- Mirror: existing Epic Case 2-4 sink-merge fixtures.
- Validate: node scripts/simulate-workflow-walkthrough.js

### Task 3: Codex Plugin Script Packaging
- File: plugins/kaola-workflow/scripts/*
- Test File: scripts/validate-kaola-workflow-contracts.js, plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js
- Write Set: plugins/kaola-workflow/scripts/*, scripts/validate-kaola-workflow-contracts.js, plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js
- Depends On: Task 1 and Task 2
- Parallel Group: serial
- Action: MODIFY
- Implement: include plugin-local copies of shared scripts and make Codex simulation invoke them.
- Mirror: existing plugin-local repair and simulation script pattern.
- Validate: npm run test:kaola-workflow:codex

### Task 4: Phase 6 Commit Gate Contracts
- File: commands/kaola-workflow-phase6.md, plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md
- Test File: scripts/validate-workflow-contracts.js, scripts/validate-kaola-workflow-contracts.js, scripts/simulate-workflow-walkthrough.js
- Write Set: commands/kaola-workflow-phase6.md, plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md, scripts/validate-workflow-contracts.js, scripts/validate-kaola-workflow-contracts.js, scripts/simulate-workflow-walkthrough.js
- Depends On: Task 2
- Parallel Group: serial
- Action: MODIFY
- Implement: explicit commit-before-sink gate and order assertions.
- Mirror: existing Phase 6 final Git gate text.
- Validate: npm run test:kaola-workflow:claude && npm run test:kaola-workflow:codex

### Task 5: Final Validation And Roadmap Evidence
- File: kaola-workflow/roadmap-open-issues/*, kaola-workflow/.roadmap/*, kaola-workflow/ROADMAP.md
- Test File: package.json scripts
- Write Set: workflow artifacts and roadmap files
- Depends On: Tasks 1-4
- Parallel Group: serial
- Action: MODIFY
- Implement: run full validation, record evidence, review, and final acceptance audit.
- Mirror: Phase 5 and Phase 6 skill contracts.
- Validate: npm test

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | local fallback because no explicit subagent delegation was requested |
| advisor plan gate | invoked | .cache/advisor-plan.md | local advisor gate |
| blueprint revisions | N/A | .cache/advisor-plan.md | advisor found no blocking gaps after revisions above |
