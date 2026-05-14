# Advisor Plan Gate: pr-sink

## Ruling

Blueprint is implementable. No architect revision required. Three items addressed in phase3-plan.md.

## Item 1 — Design Pivot from Phase 2

Phase 2 specified the wrapper would write `sink: pr` directly to `## Sink` block of workflow-state.md. Architect chose `KAOLA_SINK=pr` env var → `--sink` flag → claim writes Sink block at claim time. This is correct: on new work, workflow-state.md does not exist before claim runs. Phase 3 hard gate requires this be documented explicitly in phase3-plan.md as a "Design Adjustments from Phase 2" subsection.

## Item 2 — `commands/workflow-next.md` Missing from Phase 1 Affected Area

Phase 1 did not list `commands/workflow-next.md` in affected area, but T5 modifies it (watch-pr insertion + KAOLA_SINK_FLAG propagation). Add to Files-to-Modify in phase3-plan.md.

## Item 3 — `workflow-next.md` Line Cap Must Be Bumped

Current: 237 lines / 240 cap. T5 adds ~6 lines (estimated post-T5: ~243). T7 must bump cap assertion from 240 to 250 in `validate-workflow-contracts.js`.

## Minor Concerns (non-blocking)

1. T7 existing assertion: verify `'## Step 8 - Sink Merge'` exists in phase6.md before update
2. `cmdWatchPr` OFFLINE: add explicit `if (OFFLINE) return;` at top (cleaner than catch on JSON.parse)
3. T8 sub-test ordering: run 7G before 7A (7A requires lock with `sink:pr` already written by claim)
4. gh shim must parse `pr view <url>` as positional arg
5. T8 must assert Sink block pre-condition exists before non-OFFLINE sink-pr.js calls

## Phase 4 Task Notes

- T1 is a chokepoint: 6 internal changes to claim.js, single task unit
- After T1 completes, G2 (T2/T3/T6/T9) can run in parallel
- G4 (T7/T8) requires T1–T6 all merged

## Backward Compatibility Confirmed

- T1.3 buildSinkBlock: `(lockData.sink || 'merge')`
- T4 Phase 6 dispatch: `${SINK_KIND:-merge}`
- T5 KAOLA_SINK_FLAG: empty when unset → claim defaults to merge

## Date
2026-05-15
