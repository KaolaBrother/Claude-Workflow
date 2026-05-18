# TDD Task 6 — Update plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md (Codex GitLab)

## RED evidence
- `4. Do not create or edit CLAUDE.md.` was present (line 25)
- `KW-CLAUDE-TEMPLATE-START` absent (0 results)

## GREEN evidence
- `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` → exit 0 "Kaola-Workflow GitLab contract validation passed"
- `grep "Do not create or edit CLAUDE.md"` → 0 results
- `grep -c "KW-CLAUDE-TEMPLATE-START"` → 1 result
- `grep -c "MANDATORY"` → 3 results
- `grep -P "\bgh\b|GitHub|github\.com|PR URL|PR number|pull request"` → 0 results
- CLAUDE.md template between KW markers byte-identical to GitLab command template

## Modified files
- `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md`

## Deviations
None.
