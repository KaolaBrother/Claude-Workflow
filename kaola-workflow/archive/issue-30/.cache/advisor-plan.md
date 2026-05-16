# Advisor Gate — Phase 3 Plan, issue-30

## Verdict: Blueprint is substantially sound. Apply 6 corrections before Phase 4.

PR-1/PR-2 split, task ordering, parallelization groups, and the Epic Case sub-case structure are all sensible. The architect resolved the sink-merge integration question correctly (inline `getCoordRoot` + `removeWorktree`, or export from claim.js — both are viable). The implementation steps are concrete enough to execute.

---

## Critical (must fix before Phase 4)

### 1. AC9 test for pre-commit cross-worktree blocking is MISSING

Sub-case 15J was the only test for PR-1's pre-commit hook change. The architect renumbered it away. Add sub-case 16H: claim project-A as session-A; `git worktree add <wt-B>`; from `cwd: wt-B`, attempt `git commit --allow-empty -m test`; assert pre-commit hook blocks with non-zero exit. Validates `--git-common-dir` resolves to shared `.git/` and lock-presence check works cross-worktree.

### 2. `migrateLegacyCoordState` idempotency is unsafe

`rename(2)` atomically replaces destination on POSIX — stale legacy lock would clobber a fresh new-path lock written after migration runs. Fix: use `fs.linkSync(legacy, new)` (atomic, fails EEXIST if destination exists), then `fs.unlinkSync(legacy)` on success; on EXDEV, fall back to `fs.openSync(new, 'wx')` + `fs.copyFileSync` + `fs.unlinkSync(legacy)`.

### 3. EEXIST retry in `cmdClaim` is a behavioral regression

The PR2-3 transaction adds a 3-attempt EEXIST retry loop. EEXIST on O_EXCL means another session holds the lock — retrying changes claim semantics. Remove the retry; restore single-attempt O_EXCL.

### 4. PR2-3 and PR2-4 must be one atomic task

PR2-3 starts with `writeLockFile`; PR2-4 inserts resume-detection "before step 1." These splice into the same `cmdClaim` block — they must be one task with the resume-detection block explicitly placed after `migrateLegacyCoordState` and before `writeLockFile`.

### 5. Sub-case 16D (AC10) triggers the wrong path

`claim release` does not invoke `removeWorktree`. Change trigger to `watch-pr` with `cwd: wtPath604` and a MERGED gh shim, which actually exercises `removeWorktree` and triggers cwd-protection.

### 6. Shell pwd grace was dropped (Phase 2 commitment)

Phase 2 advisor concern #4 required this in-scope OR an explicit follow-up issue. Decision: create a follow-up issue. Record in `phase3-plan.md` § "Items Deferred."

---

## Important (recommended, not blocking)

### 7. AC sub-case number reuse is confusing

15E/15F/16E/16F all claim two AC numbers. Use one canonical AC per sub-case; list secondaries in code comments.

### 8. `localOwnerLiveness` and `handleTiebreakerYield` signature changes are implicit

Make explicit: `localOwnerLiveness(root, coordRoot, ownerSession, lock, now)` and `handleTiebreakerYield(coordRoot, args, tbResult)`.

### 9. Cross-filesystem `renameSync` concern belongs in PR1-2 implementation spec

Move EXDEV fallback detail into the PR1-2 task body, not the edge-case list.

---

## Summary

Encode corrections #1–6 directly into `phase3-plan.md`. No architect-revision pass needed. Route to Phase 4 after fixes.
