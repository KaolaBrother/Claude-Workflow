# Advisor: Phase 3 Plan Gate — Issue #83

## Verdict: Approve with Refinements

Build sequence is dependency-safe, write sets disjoint, Bug 1/2/3 fixes correctly mapped to files. No architect revision needed — these are implementer-level adjustments.

## Finding 1: `readProjectInfo` export is a Phase-2-undiscussed API expansion

The architect added `readProjectInfo` to `module.exports` of `sink-merge.js` solely to support `testReadProjectInfoArchived`. Phase 2 emphasized "private helpers, no surface expansion."

Two resolutions:
- **(a)** Keep the export; call it out in `phase3-plan.md` under "Out-of-Scope side-effects / testability expansion only" so Phase 5 review doesn't flag it as scope creep
- **(b)** Drop direct test; test `readProjectInfo` indirectly via `runDirectMerge` (already exported) which calls both `readProjectInfo` and `finalValidationPassed`. Saves one test and avoids API expansion.

**Decision: Option (b)** — minimal surface diff, matches Phase 2 "private helpers, no surface expansion" constraint.

## Finding 2: `testSinkFallbackUnsafeName` assertion is too permissive

`status !== 0 || stderr.includes('unsafe') || stdout.includes('unsafe')` lets a silent pass through. Must tighten to AND-style:
```js
assert.notStrictEqual(result.status, 0, 'expected non-zero exit for unsafe name');
assert(result.stderr.includes('unsafe project name'), `expected unsafe-name message; got: ${result.stderr}`);
```

## Finding 3: Integration test name vs. coverage mismatch

`testFallbackAfterArchive` exercises `cmdSinkFallback` + `appendSummary` post-archive but does NOT subprocess-spawn `kaola-gitlab-workflow-sink-merge.js`. Bug 1's `testRunDirectMergeAfterArchive` covers that at the function level.

Combined coverage is adequate; the issue is naming.

**Decision**: Rename integration test to `testFallbackGuardsAfterArchive` to accurately reflect scope.

## Finding 4: Verify-before-edit checklist for Group A

Before A2 executes, implementer must confirm in current `claim.js`:
- `projectDir(root, project)` returns `path.join(root, 'kaola-workflow', project)` (architect cited line 112)
- `output`, `isSafeName`, `assert` are all in-scope at `cmdSinkFallback`
- Line numbers (547–556) match current file state — may have shifted since Phase 1 research

Before A3 executes:
- Confirm original `appendSummary` body and that `path` is imported in `sink-mr.js`

## Recommended Actions

1. Pick option (b) for finding #1 — drop `testReadProjectInfoArchived`; test `readProjectInfo` indirectly via existing `testRunDirectMergeAfterArchive`
2. Tighten `testSinkFallbackUnsafeName` assertions per finding #2
3. Rename integration test to `testFallbackGuardsAfterArchive`
4. Add verify-before-edit checklist to Group A task instructions
5. Write `phase3-plan.md` incorporating findings directly into Task entries
6. Route to Phase 4 — no architect revision needed
