Task 2 - Sink Merge Branch Safety

RED coverage added:
- Epic Case 3B invokes sink-merge while currently on main and proves the requested feature branch is rebased and merged.

GREEN implementation:
- scripts/kaola-workflow-sink-merge.js now requires a clean worktree and checks out the requested branch before merge-base and rebase logic.

Validation:
- node scripts/simulate-workflow-walkthrough.js: passed
- npm test: passed
