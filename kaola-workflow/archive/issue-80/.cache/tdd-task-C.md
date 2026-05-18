# TDD Task C — Fix GitLab SKILL

## Result: GREEN

## File Modified
- `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md`

## Edits
- C1: Line 116 — added KAOLA_CLAIM extraction after PICK_NEXT_PROJECT extraction
- C2: Lines 147-163 — inserted `### Git Freshness Block Recovery` subsection (with ff-retry + guarded release + stop instruction) before "If GitLab is available"

## Guard pattern
`[ "$KAOLA_CLAIM" = "acquired" ] && [ -n "$PICK_NEXT_PROJECT" ] && node "$claim_script" release --project "$PICK_NEXT_PROJECT" --reason git-freshness-block`

## GREEN Evidence
`node scripts/simulate-workflow-walkthrough.js` → "Workflow walkthrough simulation passed" (exit 0)

## Deviations
None.
