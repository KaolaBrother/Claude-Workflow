Task 3 - Codex Plugin Script Packaging

RED coverage added:
- validate-kaola-workflow-contracts.js asserts plugin-local shared scripts exist.
- Codex simulation invokes plugins/kaola-workflow/scripts/kaola-workflow-claim.js instead of ../../../scripts.

GREEN implementation:
- Copied shared parallel workflow scripts into plugins/kaola-workflow/scripts/.

Validation:
- node scripts/validate-kaola-workflow-contracts.js: passed
- node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js: passed
- npm test: passed
