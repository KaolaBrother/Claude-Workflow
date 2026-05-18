# TDD Task 7 — Update scripts/validate-workflow-contracts.js + mirror (GitHub validators)

## RED evidence
- `grep "AGENTS.md must exist"` → 0 results in both files
- `grep "MANDATORY — READ CLAUDE.md"` → 0 results in both files

## GREEN evidence
- `node scripts/validate-workflow-contracts.js` → exit 0 "Workflow contract validation passed"
- `grep "AGENTS.md must exist"` → 1 result in scripts/validate-workflow-contracts.js
- `grep "MANDATORY — READ CLAUDE.md"` → 1 result in scripts/validate-workflow-contracts.js
- `diff scripts/validate-workflow-contracts.js plugins/kaola-workflow/scripts/validate-workflow-contracts.js` → no output (FILES IDENTICAL)

## Modified files
- `scripts/validate-workflow-contracts.js`
- `plugins/kaola-workflow/scripts/validate-workflow-contracts.js`

## Deviations
None.
