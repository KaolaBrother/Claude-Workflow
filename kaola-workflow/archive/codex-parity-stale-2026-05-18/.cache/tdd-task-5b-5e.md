# TDD Task 5b-5e Evidence: Add heartbeat to ideation, plan, execute, review SKILL.md files

## Modified Files
- `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md`
- `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md`
- `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md`
- `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md`
- `scripts/validate-kaola-workflow-contracts.js` (4 assertions, one per skill)

## RED Evidence
```
Error: plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md must include: ## Session Heartbeat
```

## GREEN Evidence
```
Kaola-Workflow contract validation passed
```

## What Changed
Each SKILL.md has ## Session Heartbeat section added before ## Goal Contract, containing file-path lookup for claim.js and nohup ticker bash block.
