Local Phase 5 code review for roadmap-open-issues.

Changed files reviewed:
- scripts/kaola-workflow-claim.js
- scripts/kaola-workflow-classifier.js
- scripts/kaola-workflow-roadmap.js
- scripts/kaola-workflow-sink-merge.js
- scripts/kaola-workflow-sink-pr.js
- scripts/simulate-workflow-walkthrough.js
- scripts/validate-workflow-contracts.js
- scripts/validate-kaola-workflow-contracts.js
- commands/kaola-workflow-phase6.md
- commands/workflow-next.md
- plugins/kaola-workflow/scripts/*
- plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md
- roadmap/workflow artifacts

Findings:
- CRITICAL: none
- HIGH: none
- MEDIUM/LOW: none blocking

Review notes:
- Claim comment cleanup was added after review found that fresh old kw:claim comments could over-block future classifier selection.
- Remote issue metadata removal remains disabled only for tiebreaker-yield and ticker-late-yield; manual release still removes label/assignee.
- sink-merge branch checkout is guarded by safe branch validation and a clean-worktree check.
- Plugin-local copies are required by contract validation and Codex simulation now uses plugin-local claim script.

Validation reviewed:
- node scripts/validate-workflow-contracts.js: passed
- node scripts/validate-kaola-workflow-contracts.js: passed
- node scripts/simulate-workflow-walkthrough.js: passed
- npm test: passed
- git diff --check: passed
