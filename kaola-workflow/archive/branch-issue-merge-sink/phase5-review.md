# Phase 5 - Review: branch-issue-merge-sink

## Code Review Findings

### CRITICAL
none

### HIGH
All three HIGH code findings were resolved through two fix rounds:

- **H1 — updateSinkLease Lease block regex**: The `/m` flag caused early termination; removing it broke matching entirely (^ requires position 0). Fixed with `(?:^|\n)(## Lease[\s\S]*?)(?=\n##|[\s]*$)` pattern — correctly matches wherever `## Lease` appears in the file.
- **H2 — sink-merge.js main() 114 lines**: Refactored across two rounds. Extracted `doRebase()` (25 lines), `ffMergeLoop()` (45 lines), `postMergeCleanup()` (17 lines). Final `main()` is 39 lines — under 50-line limit.
- **H3 — phase6.md bash template unconditional `--issue`**: Replaced with conditional `SINK_ISSUE_FLAG` — only passes `--issue` when `SINK_ISSUE != "unset"`.

### MEDIUM/LOW
- **M1/Sec M1 — String.replace backreference risk** (claim.js lines 125, 367): Fixed in review-fix-1 — both use function form `() => 'branch: ' + value`.
- **M2 — sink-merge.js --branch validation weaker**: Resolved via security fix — leading-dash rejection added.
- **M3 — simulate-workflow-walkthrough.js main() 445 lines**: Deferred — refactoring test-only orchestration code; no behavior risk.
- **L1 — cmdClaim() 51 lines**: Deferred — 1 line over limit, borderline.
- **L2 — sleepMs CPU spin-wait**: Deferred — CLI tool, acceptable in practice.
- **L3 — phase1.md Stage 1 migration block unreachable as written**: Deferred documentation clarification.

---

## Security Review

Ran: yes — sink-merge.js and claim.js involve filesystem access, external CLI calls (git, gh).

### Findings (all resolved or deferred)

- **S-H1 — args.branch leading-dash injection**: RESOLVED — leading-dash validation added to sink-merge.js; `--` separator added to `git merge`, `git branch -d`, `git push --delete`.
- **S-M1 — String.replace backreference via args.branch**: RESOLVED — function form replacements in claim.js.
- **S-L1 — claim_comment_id not numeric-validated**: RESOLVED — `/^\d+$/.test()` guard before gh CLI invocation.
- **NOTE — npm test runs on rebased branch content**: Acknowledged; requires trusted branch authors (by design).

---

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-reviewer | invoked | .cache/code-reviewer.md | |
| security-reviewer | invoked | .cache/security-reviewer.md | filesystem access + external CLI calls in sink-merge.js + claim.js |
| review-fix executors | invoked | .cache/review-fix-1.md, .cache/review-fix-2.md, .cache/review-fix-3.md | 3 fix rounds |
| advisor critical gate | N/A | no CRITICAL findings | no CRITICAL findings found |

---

## Fixes Applied
1. review-fix-1: claim.js + sink-merge.js — Lease regex `m` removal (first attempt), function-form replacements, leading-dash validation + `--` separators, claim_comment_id numeric guard, main() split into doRebase/ffMergeLoop
2. review-fix-2: phase6.md — conditional SINK_ISSUE_FLAG bash template
3. review-fix-3: claim.js — Lease regex corrected to `(?:^|\n)` anchor; sink-merge.js — postMergeCleanup() extracted, main() trimmed to 39 lines

---

## Validation Evidence
Final validation run after all fixes:
```
node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js
```
Result: PASS — "Workflow walkthrough simulation passed" + "Workflow contract validation passed"
All 4 Epic Cases exercised (fast-path, rebase, FF retry exhaustion).
Evidence: direct run in orchestrator session.

---

## Follow-Up Items
- M3: simulate-workflow-walkthrough.js main() at 445 lines — extract epicCase1/2/3/4 functions
- L1: cmdClaim() at 51 lines — extract applyCommentIdToLock helper
- L2: sleepMs spin-wait — replace with Atomics.wait
- L3: phase1.md Step 6 migration block prose — clarify pre-condition vs migration-check sequencing

---

## Review Status
PASSED WITH FOLLOW-UPS
