# TDD Task 2 Evidence - issue-102

Task: Strip duplicate-prone template stanza.

Implementation:
- Added managed-block stripping before external table detection.
- Added top-level `[features]` table detection.
- Removed only the template's top-level `[features]` stanza when the existing target config already owns `[features]` outside Kaola markers.

Validation:
- Command: `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- Result: passed with `Kaola-Workflow walkthrough simulation passed`.

Files:
- `plugins/kaola-workflow/scripts/install-codex-agent-profiles.js`
