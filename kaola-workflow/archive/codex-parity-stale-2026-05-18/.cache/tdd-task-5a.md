# TDD Task 5a Evidence: Add heartbeat + init-issue + patch-branch to research SKILL.md

## Modified Files
- `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md`
- `scripts/validate-kaola-workflow-contracts.js` (1 assertion: ## Session Heartbeat)

## RED Evidence
```
Error: plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md must include: ## Session Heartbeat
```

## GREEN Evidence
```
Kaola-Workflow contract validation passed
```

## What Changed
1. ## Session Heartbeat section added between Goal Contract and Steps (file-path lookup + nohup ticker)
2. Step 8 (init-issue): roadmap_script derived from claim_script directory; calls init-issue with --issue, --title, --status, --workflow-project, --next-step
3. Step 9 (patch-branch): file-path lookup + patch-branch --session --project --branch
