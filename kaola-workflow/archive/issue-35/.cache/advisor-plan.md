# Advisor Plan Gate — issue-35

## Overall Assessment
Blueprint is strong and implementable. Proceed to Phase 4 with two concrete verifications.

## Verifications Phase 4 Must Perform

**1. HOME isolation in Epic Case 14a/14b.**
The architect says "HOME set to the tmp dir so no real global config is read" but didn't audit whether existing Epic Case 14 actually sets `HOME` on the spawned `node ... startup` child process. If the harness inherits `process.env` without overriding HOME, a dev machine with `priority_top_tier_labels` in their real `~/.config/kaola-workflow/config.json` will silently break Case 14a's tier assertions.
Phase 4 must: read Epic Case 14 (lines ~3111-3234) to see exactly how it passes env to its child process, then mirror that pattern *plus* explicit `HOME=<tmpDir>` for 14a/14b.

**2. Re-sort placement vs. claim loop.**
Step 5b mutates `issueFetch.issues = sortIssueRecords(...)` after `fetchOpenIssueRecords`. This is only correct if no code between `fetchOpenIssueRecords` and `runStartupClaimFirstAvailable` captured the old reference. Phase 4 must verify that `cmdStartup` reads `issueFetch.issues` (not a pre-captured `const issues = ...`) at the call site that feeds the claim loop. The picked-case path at ~line 1238 also needs to be confirmed to read from the post-sort array.

## Edge Case to Document
`workflow:queued` is still the primary sort key — so a queued P3 outranks an unqueued P0. This is the intended Phase 2 semantics (queued primacy preserved), but worth one sentence in README: "`workflow:queued` always wins, then priority tier, then issue number."

## Non-Blocking Observations
- Double sort (fetchOpenIssueRecords already calls sortIssueRecords at line 964, then cmdStartup re-sorts) is harmless waste but acceptable for now.
- Architect already incorporated Phase 2 advisor concerns (two-layer config, empty-string filter, unambiguous ranking shape).

## Verdict
Proceed to Phase 4. Record the two verifications as concrete acceptance checks.
