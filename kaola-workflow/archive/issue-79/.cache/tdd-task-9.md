# TDD Task 9 — Update plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js

## RED evidence
- `grep "assertIncludes"` → 0 results (function missing)
- `grep "assertNotIncludes"` → 0 results (function missing)
- `grep "extractClaudeTemplate"` → 0 results (function missing)
- `grep "MANDATORY — READ CLAUDE.md"` → 0 results in validator

## GREEN evidence
- `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` → exit 0 "Kaola-Workflow GitLab contract validation passed"
- `grep -c "assertIncludes"` → 3+ results (function def + calls)
- `grep -c "assertNotIncludes"` → 2+ results (function def + call)
- `grep -c "extractClaudeTemplate"` → 2 results (function def + call)
- `grep "MANDATORY — READ CLAUDE.md"` → 1 result in validator (assertIncludes call)
- `grep "Do not create or edit CLAUDE.md"` → 1 result (assertNotIncludes call)
- `grep "byte-identical within GitLab forge pair"` → 1 result
- assertConcept added and invoked for GitLab init durable state contract

## Modified files
- `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`

## Deviations
None.
