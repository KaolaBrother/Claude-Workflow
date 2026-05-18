# TDD Task 8 — Update scripts/validate-kaola-workflow-contracts.js (Codex GitHub validator)

## RED evidence
- `grep "extractRedirectBlock"` → 0 results
- `grep "extractClaudeTemplate"` → 0 results
- `grep "byte-identical"` → 0 results

## GREEN evidence
- `node scripts/validate-kaola-workflow-contracts.js` → exit 0 "Kaola-Workflow Codex contract validation passed"
- `grep -c "extractRedirectBlock"` → 1 result
- `grep -c "extractClaudeTemplate"` → 1 result
- `grep "byte-identical within GitHub forge pair"` → 1 result
- `grep "byte-identical within GitLab forge pair"` → 1 result
- Redirect block byte-equality: all 4 initFiles compared against commands/workflow-init.md reference
- CLAUDE.md template byte-equality: GitHub cmd vs GitHub skill confirmed; GitLab cmd vs GitLab skill confirmed

## Modified files
- `scripts/validate-kaola-workflow-contracts.js`

## Deviations
None.
