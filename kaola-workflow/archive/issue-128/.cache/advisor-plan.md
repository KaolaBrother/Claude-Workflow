# Advisor Plan Gate — Issue #128

## Advisor Verdict
Plan is sound. Proceed with Option B as architected.

## Key Findings

1. **Bake the Phase 6 worktree-commit requirement into each tdd-guide task prompt** — not just a note in the plan. Each task instruction must include verbatim: "After validation passes, run from inside the worktree: `git add <impl files> <test files> && git commit -m "fix: ..."`. Do NOT skip this. cmdFinalize commits only archive files; uncommitted implementation is lost when the worktree is deleted." A `pending` compliance row called "implementation commit from worktree" per task makes this a hard gate.

2. **Status variable shadowing**: `status` only appears in the helper function body (different scope from `runDirectMerge`). No shadowing — use plain `status` in the inline guard (drop `_cwStatus` prefix).

3. **Final validation command**: Use `npm test` for Phase 6 (full suite); per-task validation (`node plugins/.../test-{forge}-sinks.js`) is correct for Phase 4. Full suite catches validate-script-sync issues.

## Risks Confirmed Accurate
None that change the plan. Test setup verified (README.md tracked, kaola-workflow/ untracked, `--untracked-files=no` excludes stub but catches dirty README). Guard ordering correct (removeWorktree → fetch-skipped → guard → checkout). Disjoint write sets A/B/C parallel-safe. Message string `'direct merge sink runs'` matches existing helper; tests assert common prefix `'Worktree must be clean'`.

## Blueprint Gaps
None.
