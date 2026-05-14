# Advisor — Phase 3 Plan Gate (branch-issue-merge-sink)

## Verdict
Three blocking gaps. Route back to code-architect.

---

## Blocking Gap 1: No task creates the feature branch

Phase 2 selected A-creation-1: "Phase 1 command file runs `git checkout -b`". The blueprint has no task modifying any phase command file to actually create the branch. Task 1 writes the *name* into the Sink block; nothing cuts the branch in the worktree.

This task also owns the two other Phase 2 advisor gaps that are currently unrepresented:
- Gap 3 (worktree-clean): `git status --porcelain` precondition before `git checkout -b`; fail-loud, no auto-stash
- Gap 2 (Stage 1 migration): after `git checkout -b`, call `node kaola-workflow-claim.js patch-branch --project --session --branch` when the legacy lease shows `branch: TBD`

Add as Task 8 in G2. Without it, the feature is end-to-end non-functional.

## Blocking Gap 2: Step 4 (`npm test`) will fail Epic Cases 3 and 4

Task 2's Step 4 runs `execFileSync('npm', ['test'], ...)` whenever `!alreadyUpToDate`. Epic Cases 3 and 4 set up tempdir workDirs with no `package.json` → `npm test` errors → sink-merge throws at Step 4 → Cases 3 and 4 fail before reaching the merge they're trying to test.

Cases 3 and 4 both use rebase, so `alreadyUpToDate` is false in both. The test suite cannot pass as specified.

Resolution: add OFFLINE skip to Step 4 (mirrors Steps 1/5/7/8/9 — matches C-refined-A principle). Document that callers running OFFLINE own their own validation. Cheapest fix and consistent with the existing OFFLINE semantics.

## Blocking Gap 3: Epic Case 4 does not exercise FF race retry exhaustion

The architect's own text mid-Case-4 explicitly says: "Case 4 ends up structurally identical to Case 3" and substitutes a static `assertIncludes('MAX_AUTOMERGE_RETRIES')` string check. The issue body lists FF race retry as an explicit acceptance criterion.

Resolution (recommended): `KAOLA_WORKFLOW_FORCE_FF_FAIL=N` env flag consumed only by sink-merge.js makes the first N `merge --ff-only` invocations throw before calling git. Deterministic, contained, documented as test-only.

## Non-blocking: `phase6-merge-conflict.md` referenced but never created

sink-merge.js throws "see kaola-workflow/{project}/phase6-merge-conflict.md" but no Task creates this doc. Either add a tiny CREATE task for a static template, or change the message to point at an existing in-repo doc.

---

## Date
2026-05-14T23:10:00Z
