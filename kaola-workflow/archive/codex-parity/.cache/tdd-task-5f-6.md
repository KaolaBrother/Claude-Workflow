# TDD Task 5f + 6 Evidence

## Modified Files
- `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md`
- `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md`
- `scripts/validate-kaola-workflow-contracts.js` (3 assertions)

## RED Evidence
Validator failed with 0 occurrences for: ## Session Heartbeat (finalize), kaola-workflow-sink-pr.js, Session lifecycle.

## GREEN Evidence
```
Kaola-Workflow contract validation passed
```

## What Changed
### Task 5f (finalize)
1. ## Session Heartbeat added between Goal Contract and Guardrails
2. Sink dispatch block added under Required Steps item 8: reads SINK_KIND from workflow-state.md; dispatches to sink-pr.js or sink-merge.js via file-path lookup

### Task 6 (init)
Session lifecycle bullet added to AGENTS.md Addendum: claim/release/sweep/ticker lifecycle description.
