# Phase 4 Task 1 Evidence

Task: Claude autonomy contract

## Changes

- Updated `README.md` with the autonomy and goal contract.
- Updated `commands/workflow-init.md` so initialized projects inherit the policy.
- Updated `commands/workflow-next.md` with goal-driven autonomy and unambiguous issue selection.
- Updated `commands/kaola-workflow-phase1.md` to choose deterministic collision-safe project names without confirmation.
- Updated `commands/kaola-workflow-phase2.md` to use internal advisor-backed strategy selection.
- Updated `commands/kaola-workflow-phase3.md` to continue to Phase 4 after advisor-reviewed planning.

## Validation

- Command: `node scripts/validate-workflow-contracts.js`
- Result: passed
