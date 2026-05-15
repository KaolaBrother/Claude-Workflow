# TDD Task 3 — LOW-3 shim batch + corpus-grep verification

## Modified Files
- `scripts/simulate-workflow-walkthrough.js` — added corpus-grep verification block
- `commands/kaola-workflow-phase1.md` — line 31: liveness check added
- `commands/kaola-workflow-phase2.md` — line 35: liveness check added
- `commands/kaola-workflow-phase3.md` — line 33: liveness check added
- `commands/kaola-workflow-phase4.md` — line 23: liveness check added
- `commands/kaola-workflow-phase5.md` — line 37: liveness check added
- `commands/kaola-workflow-phase6.md` — line 38: liveness check added
- `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md` — line 29: liveness check added
- `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md` — line 21: liveness check added
- `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md` — line 21: liveness check added
- `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md` — line 21: liveness check added
- `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md` — line 21: liveness check added
- `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` — line 29: liveness check added

## Canonical form applied (verbatim)
`kill -0 "$(cat "$_TICKER_PID_FILE" 2>/dev/null)" 2>/dev/null`

In each shim:
```bash
if [ ! -f "$_TICKER_PID_FILE" ] || ! kill -0 "$(cat "$_TICKER_PID_FILE" 2>/dev/null)" 2>/dev/null; then
```

## RED Evidence
After adding corpus-grep block (before shim edits):
```
Error: LOW-3: missing liveness check in kaola-workflow-phase1.md
```
Exit code 1.

## GREEN Evidence
After editing all 12 shim files:
```
Workflow walkthrough simulation passed
exit code: 0
```
Command: `node scripts/simulate-workflow-walkthrough.js`

## Deviations
None. Only approved write-set files modified.
