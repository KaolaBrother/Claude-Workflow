# TDD Task 2 Evidence: Collapse workflow-next.md Startup Step 0 to bootstrap call

## Modified Files
- `commands/workflow-next.md`

## RED Evidence
Baseline: `node scripts/simulate-workflow-walkthrough.js` → "Workflow walkthrough simulation passed" (confirmed passing before change).

## GREEN Evidence
After change: `node scripts/simulate-workflow-walkthrough.js` → "Workflow walkthrough simulation passed"

## What Changed
- Removed `CLASSIFIER_JS=...` assignment
- Replaced the 29-line sweep→watch-pr→classify→claim shell chain with a 7-line bootstrap call
- Removed the Yellow Verdict Cache File explanation paragraph
- Updated introductory prose to mention bootstrap
- The new bash block captures `BOOTSTRAP_OUT=$(node "$CLAIM_JS" bootstrap --session "$KAOLA_SESSION_ID" --runtime claude $KAOLA_SINK_FLAG 2>/dev/null) || true`

## Deviations
None. Write set: `commands/workflow-next.md` only.
