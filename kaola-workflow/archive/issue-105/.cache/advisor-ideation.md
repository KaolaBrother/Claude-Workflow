# Advisor Ideation Gate — Issue #105

## Verdict: Approach A Approved

No missed approaches. Approach B (hook intent-signal) and C (silent auto-archive) correctly rejected.

## Key Additions

### 1. Both tests required (blocks AC#3)

The planner proposed only `testSinkMergeRefusesLiveFolder` (negative). AC#3 also requires the positive case. Both tests are needed:

- `testSinkMergeRefusesLiveFolder` — guard fires on branch with live folder; assert non-zero exit, stderr substring, `main` SHA unchanged.
- `testFastE2EMergeFullChain` — `KAOLA_PATH=fast` startup → fast-summary PASSED → `worktree-finalize` → `finalize --keep-worktree` → `sink-merge` → assert `kaola-workflow/archive/issue-N/` on main and `kaola-workflow/issue-N/` absent.

The positive test is also the only test of fast-path closure end-to-end (currently absent per Phase 1 research).

### 2. Pre-existing dirty state must be resolved before Phase 4

Working tree has unstaged deletions for `kaola-workflow/issue-101/*` and untracked `kaola-workflow/archive/issue-{100,101}/` from a prior session. This must not be entangled with the fix commits. Options:
- (a) Include as the AC#4 cleanup commit on this branch (explicit)
- (b) Restore/stash and handle as a separate small PR after this one merges

Pick one before Phase 4 starts staging files.

### 3. AC#4 flexibility

"Add cleanup OR a documented one-time repair path." A documented procedure in `docs/` (or one-shot script in `scripts/`) satisfies the AC without a cleanup commit. Cleanup commit is also valid.

### 4. Phase 3 verification tasks

- Confirm `process.cwd()` vs `mainRoot` at the guard call site by reading sink-merge.js around lines 67 (`assertCleanWorktree`) and 240–245.
- Confirm guard placement is AFTER `git checkout args.branch` (so `mainRoot` reflects branch HEAD) and BEFORE the FF merge to main. Re-confirm the line-243 placement claim.
