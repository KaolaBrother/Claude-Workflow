# TDD Task 3 Evidence: Create 9th skill + update validator (atomic)

## Modified Files
- `scripts/validate-kaola-workflow-contracts.js` (added kaola-workflow-next-pr to skills array + cmdBootstrap assertion)
- `plugins/kaola-workflow/skills/kaola-workflow-next-pr/SKILL.md` (created, new directory)

## RED Evidence
```
Error: plugins/kaola-workflow/skills/kaola-workflow-next-pr/SKILL.md is missing
```
Validator failed after adding skill to array, before SKILL.md existed.

## GREEN Evidence
```
Kaola-Workflow contract validation passed
```
Exit 0 after both files written.

## Deviations
SKILL.md includes `workflow-state.md` mention (required by validator's skill-loop assertion). Added: "Routing decisions are recorded in `kaola-workflow/{project}/workflow-state.md` via `kaola-workflow-next`." This was necessary to pass the existing validator assertion that all skills include `workflow-state.md`.

Heartbeat assertions (T5a-5f) deliberately omitted from T3 — those assertions are added by each T5 task when it adds its own heartbeat section.
