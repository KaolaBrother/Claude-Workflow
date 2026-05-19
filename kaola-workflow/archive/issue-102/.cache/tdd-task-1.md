# TDD Task 1 Evidence - issue-102

Task: Add Codex installer regression.

RED:
- Command: `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- Result: failed as expected.
- Failure: `Error: existing config must contain exactly one [features] table`.

GREEN:
- Implemented in Task 2.
- Command: `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- Result: passed with `Kaola-Workflow walkthrough simulation passed`.

Files:
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
