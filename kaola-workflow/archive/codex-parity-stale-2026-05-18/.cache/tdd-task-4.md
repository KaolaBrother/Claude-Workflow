# TDD Task 4 Evidence: Add bootstrap invocation to kaola-workflow-next SKILL.md

## Modified Files
- `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` (bootstrap block added before git commands)
- `scripts/validate-kaola-workflow-contracts.js` (2 assertions: bootstrap + --runtime codex)

## RED Evidence
```
Error: plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md must include: bootstrap
```

## GREEN Evidence
```
Kaola-Workflow contract validation passed
```

## What Changed
Bootstrap file-path lookup + `node "$claim_script" bootstrap --session "$KAOLA_SESSION_ID" --runtime codex $KAOLA_SINK_FLAG || true` inserted in Startup section before the git freshness commands. Uses file-path form matching repair_script pattern (lines 74-77).
