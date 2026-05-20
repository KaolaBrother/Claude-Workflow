# Advisor Ideation Gate — Issue #128

## Advisor Verdict
Option B (inline check) confirmed. No missed approaches. Risks are accurate.

## Key Findings

1. **Option B is the right call.** The existing helper's `gitExec`-function signature is coherent with `fastForwardMain`'s cwd-relative injectable model — it is not a mistake and should not be changed. Touching `fastForwardMain` (exported public API) is out of scope.

2. **Verification items for Phase 3:**
   - Re-verify exact insertion line numbers directly from the worktree files before locking in the plan, since line numbers can shift.
   - Confirm `setupRealRepo` commits a tracked file (README.md) — VERIFIED: README.md is committed on `main` in the test repo setup, so modifying it without committing triggers `--porcelain --untracked-files=no`.

3. **Error message wording:** Mild preference to use the existing helper's message `'Worktree must be clean before direct merge sink runs'` in the inline guard (keeps the two forges consistent with each other). Tests assert on common prefix `'Worktree must be clean'` so either string satisfies the test assertion.

4. **Phase 6 critical reminder:** Commit implementation changes from inside the worktree BEFORE running cmdFinalize. cmdFinalize only stages/commits archive files; it does not capture uncommitted implementation changes.

## Gotchas / Risks Identified
- None that change the Option B decision.
- Standard risk: re-verify exact line numbers in Phase 3 to avoid off-by-one insertions.

## Recommendation
Proceed with Option B as specified in `.cache/planner.md`.
