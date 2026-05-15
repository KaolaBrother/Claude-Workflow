Task 4 - Phase 6 Commit Gate Contracts

RED coverage added:
- validate-workflow-contracts.js and validate-kaola-workflow-contracts.js assert the commit gate appears before sink dispatch.
- Epic Case 3C simulates uncommitted final changes, commits them before sink dispatch, and proves they land on main.
- Epic Case 11 checks commit-before-sink order in Claude and Codex finalization prompts.

GREEN implementation:
- commands/kaola-workflow-phase6.md now has Step 8 Commit Gate before Step 9 Sink.
- plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md now requires final commit before sink dispatch.

Validation:
- node scripts/validate-workflow-contracts.js: passed
- node scripts/validate-kaola-workflow-contracts.js: passed
- npm test: passed
