# Advisor Ideation — branch-issue-merge-sink

## Verdict

Planner's integrated recommendation is sound. All five choices are approved. Four gaps must be wired into Phase 3 before the blueprint is written.

---

## Gaps to Address in Phase 3

### Gap 1: No-issue branch name fallback
Branch template `workflow/issue-{N}-{slug}` assumes --issue is always present. cmdClaim accepts --issue as optional (value 'unset' when absent). Decide:
- (a) Fallback to `workflow/{project}` when no issue
- (b) Require --issue set for branch creation; fail-loud otherwise

**Resolution (internal selection):** Option (a) — fallback to `workflow/{project}`. Avoids `issue-none-foo` strings and allows free-form-task workflows without breaking. Simpler error recovery.

### Gap 2: Stage 1 migration needs explicit split
Issue body promises: "if lease has `branch: TBD`, Phase 1 on resume cuts branch from origin/main and patches lock + Sink block + GitHub claim comment."

Cleanest split: new `claim.js patch-branch` subcommand handles:
(i) patch lock JSON to add branch field
(ii) rewrite Sink block with real branch name
(iii) edit GitHub claim comment
Phase 1 command file calls `git checkout -b {branch}` THEN `claim.js patch-branch --project {p} --session {s} --branch {b}`.

**Resolution:** Adopt patch-branch subcommand approach — maintains claim.js as the single owner of lock/Sink/GitHub state.

### Gap 3: Worktree-clean precondition
Phase 1 command must check `git status --porcelain` before `git checkout -b`. Fail-loud with remediation if dirty. Do NOT auto-stash.

### Gap 4: git fetch failure in sink-merge.js
If network is down, fetch fails. Skip-check would then compare against stale origin/main, falsely deciding "no rebase needed." Treat fetch failure as fatal stop (not silent proceed). Explicit error path in step 1.

---

## Non-blocking Watch Items

- simulate.js file size: ~416 + ~200-240 for Cases 3+4 ≈ 650-700 lines. Under 800-line cap.
- Re-validation cost in contested case: validation runs twice when origin/main moves (Phase 6 Step 1 pre-rebase + sink-merge.js Step 4 post-rebase) — by design.
- Pre-commit hook unaffected: ff-merge creates no merge commit, so hook's git-commit-detecting branch is not triggered.

---

## Date
2026-05-14T23:00:00Z
