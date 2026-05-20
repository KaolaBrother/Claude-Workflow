# tdd-guide raw output — Group A (Tasks 1 + 2)

## Files Modified
- `commands/workflow-next.md` — 348 lines (was 309; +39 lines)
- `commands/kaola-workflow-fast.md` — 213 lines (was 143; +70 lines)

## Diff Summary

### Task 1 — workflow-next.md
- Inserted new `## Startup Step 0a-1 — Path Intent` section (38 lines) between end of Step 0a (`Keyword matching is agent-level prose detection, not a bash conditional.`) and `## Startup Step 0b - Startup Transaction`. Contains 5-point precedence rubric with embedded `gh issue view` bash fence and example output text fence.
- Inserted one line `Workflow path: {fast|full — from KAOLA_PATH or Step 0a-1 judgment}` inside Required Output fenced text block, after `Branch:` and before `Parallel decision:`.

### Task 2 — kaola-workflow-fast.md
- Preserved lines 1-55 (header through `## Mid-Flight Escalation`) and lines 137-144 (`## Continue to Phase 6`) verbatim.
- Replaced lines 56-135 with the supplied block:
  - `## Step 1 - Plan (planner)` with `mkdir -p` cache dir, full workflow-state.md field block (corrected `step: plan` from old `step: execute`), planner subagent invocation, `.cache/planner.md` output, escalation, orchestrator-stub-writes note.
  - `## Step 2 - Execute (tdd-guide)` with full workflow-state.md field block (`step: execute`, `implementation_owner: tdd-guide`), tdd-guide subagent invocation with four constraints, `.cache/tdd-guide.md` output, orchestrator owns in-flight escalation writes.
  - `## Step 3 - Review (code-reviewer)` with full workflow-state.md field block (`step: review`), code-reviewer subagent invocation with four checks, `.cache/code-reviewer.md` output, Trivial Inline Edit Exception with orchestrator-applies guidance.
  - `## Write fast-summary.md` template with NEW Required Agent Compliance table (planner / tdd-guide / code-reviewer rows).

## RED Evidence
N/A (doc-only task)

## GREEN Evidence

### Validator 1: `node scripts/validate-workflow-contracts.js`
Exit code: 0
Output: `Workflow contract validation passed`

### Validator 2: `node scripts/simulate-workflow-walkthrough.js`
Exit code: 0
Last 5 lines:
```
testReadPriorityConfig: PASSED
testE2EGitHubMergeFullChain: PASSED
testE2EGitHubPrFullChain: PASSED
testParallelIssueIndependence: PASSED
Workflow walkthrough simulation passed
```

## Deviations
None. Block applied verbatim; preserved blocks preserved verbatim.

## Write-Set Check
```
 M commands/kaola-workflow-fast.md
 M commands/workflow-next.md
```

## Process Note
Task 2 initially stopped due to missing verbatim source in `.cache/architect.md` (placeholder pointer rather than actual content). Orchestrator re-sent agent with inline verbatim block via SendMessage; agent then applied edit cleanly.
