# TDD Task 5 — Update plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md (Codex GitHub)

## RED evidence
- Line 25: `4. Do not create or edit CLAUDE.md.` was present
- `KW-CLAUDE-TEMPLATE-START` absent (0 results)
- `## AGENTS.md Addendum` present at line 59

## GREEN evidence
- `node scripts/validate-kaola-workflow-contracts.js` → exit 0 "Kaola-Workflow Codex contract validation passed"
- `grep "Do not create or edit CLAUDE.md"` → 0 results
- `grep "KW-CLAUDE-TEMPLATE-START"` → 1 result
- `grep "Active folder lifecycle"` → 1 result (in item 4 prose)
- `grep "MANDATORY"` → 3 results (in redirect block)
- CLAUDE.md template between KW markers byte-identical to `commands/workflow-init.md`

## Modified files
- `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md`

## Deviations
None.
