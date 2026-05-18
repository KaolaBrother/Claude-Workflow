# TDD Task B — Fix commands/workflow-next.md

## Result: GREEN

## File Modified
- `commands/workflow-next.md`

## Edits
- B1: Lines 93-94 — added KAOLA_PROJECT and KAOLA_CLAIM extraction after KAOLA_WORKTREE_PATH
- B2: Line 151 — replaced "resolve manually before retrying" with guarded release call + stop instruction

## Guard pattern
`[ "$KAOLA_CLAIM" = "acquired" ] && [ -n "$KAOLA_PROJECT" ] && node "$CLAIM_JS" release --project "$KAOLA_PROJECT" --reason git-freshness-block`

## GREEN Evidence
`node scripts/simulate-workflow-walkthrough.js` → "Workflow walkthrough simulation passed" (exit 0)

## Deviations
None.
