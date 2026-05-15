Local planner fallback.

Options considered:

Option A: Fix each issue independently with one workflow project per issue.
Pros: strict per-issue isolation.
Cons: high duplicate setup cost; shared files would be edited repeatedly; increased risk of inconsistent tests.

Option B: Use one umbrella workflow project for issues #14-#21.
Pros: matches the shared implementation surface; allows one coherent set of regression tests for claim/bootstrap/sink/plugin validation; simpler final validation.
Cons: requires careful acceptance mapping in Phase 6.

Option C: Patch only tests and docs without changing runtime behavior.
Pros: smallest diff.
Cons: leaves critical coordination bugs unfixed; does not satisfy acceptance criteria.

Recommended: Option B.
