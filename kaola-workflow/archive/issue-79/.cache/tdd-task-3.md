# TDD Task 3 — Update commands/workflow-init.md (GitHub Claude command)

## RED evidence
- `KW-CLAUDE-TEMPLATE-START` absent (0 matches)
- `Goal-driven execution` in template absent (0 matches)
- `## Step 3 — Create AGENTS.md` absent (0 matches)
- `grep -c "## Step"` → 4 (Steps 1-4 before change)

## GREEN evidence
- `node scripts/validate-workflow-contracts.js` → exit 0 "Workflow contract validation passed"
- `grep -c "## Step" commands/workflow-init.md` → 5 (Steps 1-5)
- `grep -c "KW-CLAUDE-TEMPLATE-START"` → 1
- `grep -c "KW-CLAUDE-TEMPLATE-END"` → 1
- `grep "AGENTS.md"` → 10 matches including redirect block
- NNR: exactly 5 bullets (Goal-driven execution present; Preserve user changes absent)
- `## Step 3 — Create AGENTS.md` present; contains ```text and ```markdown fenced blocks

## Modified files
- `commands/workflow-init.md`

## Deviations
None.
