# TDD Task 1 — Dogfood: update CLAUDE.md Non-Negotiable Rules

## RED evidence
- Line 57: `- Preserve user changes; never revert unrelated work without explicit request.` — PRESENT
- Line 58: `- Verify with the relevant command before claiming completion.` — PRESENT
- "Goal-driven execution" — ABSENT

## GREEN evidence
- Validator: `Workflow contract validation passed` (exit 0)
- Line count: 80 lines (under 200)
- "Goal-driven execution" is present; "Preserve user changes" and "Verify with the relevant command" are removed

## Modified files
- `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-79/CLAUDE.md`

## Deviations
None. Only CLAUDE.md was touched.
