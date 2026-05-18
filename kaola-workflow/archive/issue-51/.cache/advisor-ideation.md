# Advisor Ideation Gate

## Verdict: Strategy B confirmed

> Strategy B is the right call. Don't second-guess it — Strategy A's 25-file diff is genuinely unreviewable and Strategy C's two-entry-point GC is a future maintenance tax. The "11 ACs in one cycle" framing in #51 is a punch-list, not a contract. Filing follow-ups for the two systemic-hygiene ACs that have no live evidence (roadmap concurrency, prompt-slim) is honest scoping, not dodging.

## Required pre-Phase 3 verifications (now complete)

The advisor flagged 4 quick verifications before committing Strategy B. All four were performed:

### 1. Worktree registry reality check — CONFIRMED registered

`git worktree list --porcelain` shows:
- `kaola-workflow.kw/issue-40` → `refs/heads/workflow/issue-40` (HEAD 0e3e1f26)
- `kaola-workflow.kw/issue-42` → `refs/heads/workflow/issue-42` (HEAD 40dc427e)
- `kaola-workflow.kw/issue-46` → `refs/heads/workflow/issue-46` (HEAD cf3f57c3)
- `kaola-workflow.kw/issue-51` → `refs/heads/workflow/issue-51` (HEAD 4bb94bf6, this session)

`.git/worktrees/` confirms registry entries exist for issue-40, issue-42, issue-46, issue-51.

**Plan delta**: `cmdSweep:2125–2138` first-pass cleanup MUST explicitly call `removeWorktree(coordRoot, lock.project, lock)` (or the equivalent `git worktree remove --force <path>` + `git worktree prune`) for closed-issue locks. `git worktree prune` alone will not unregister a worktree whose directory still exists. For locks with no `worktree_path` field (older locks), the cleanup should also Glob `<repo>.kw/issue-N/` against lock.issue_number to catch the worktree.

**One-shot cleanup (Task B9)**: must remove `kaola-workflow.kw/issue-40`, `kaola-workflow.kw/issue-42`, `kaola-workflow.kw/issue-46` worktrees (and their respective `workflow/issue-N` branches if appropriate) since they correspond to merged-and-closed issues. Use `git worktree remove --force` for safety against pending working-tree changes.

### 2. Codex simulation path-fix viability — script is runtime-agnostic

`scripts/kaola-workflow-compact-context.js` reads stdin, walks up parent dirs for a `kaola-workflow/` or `claude-workflow/` directory, no Claude-specific env vars or paths. The script will run unchanged via the path-fix at `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js:113`.

**Plan delta**: Phase 4 Task B2 must ACTUALLY RUN `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` after the path change to confirm green, not just edit-and-assume. If green, no further work. If a second failure surfaces, escalate (port to plugin tree + add to script-sync allowlist).

### 3. `cmdWatchPr` CLOSED-branch flip semantics — SAFE; no existing assertion blocks it

Searched `scripts/simulate-workflow-walkthrough.js` for `aborted` and `closed_without_merge`. Only one match at line 1436: comment for test 7D, "watch-pr sees CLOSED (no merge) → releaseSession reason=aborted, branch NOT deleted". The test (lines 1437–1466) asserts only:
- lock file removed after CLOSED (line 1462)
- local branch NOT deleted after CLOSED-without-merge (line 1466)

No assertion about labels or assignees persisting. The gh shim used by 7D does not intercept `gh issue edit --remove-label`/`--remove-assignee` calls (they would fall through the shim's `exit 0` and be silent no-ops in the test). Flipping the `remoteCleanup:false` to default `true` at `:2340` is safe.

**Plan delta**: Phase 4 should update test 7D (line 1430–1460ish) so the gh shim records `gh issue edit --remove-label` calls, then add a new assertion that the call WAS made for CLOSED. This converts an implicit behavior change to an explicit assertion. Failure to add this assertion would leave the new behavior untested.

### 4. Orphan dir archive safety — all 3 are terminal-state, safe to archive

All three dirs have full phase1–6 artifacts AND `phase6-summary.md`:
- `kaola-workflow/codex-parity/`: phase: 6, step: complete; all 7 phase files present
- `kaola-workflow/cross-machine-followups/`: phase: 6, step: complete; all 7 phase files present
- `kaola-workflow/minimal-ecc-config/`: phase: 6, step: complete; all 7 phase files present

`kaola-workflow/issue-32/` (per Phase 1 stale-evidence note): step: final-validation, expired 2026-05-16T14:40 — needs case-by-case verification in Phase 3 (may not have phase6-summary.md). `kaola-workflow/issue-46/`: step: final-validation, expired 2026-05-17T23:59. Same caveat.

**Plan delta**: `cmdSweep` second-pass GC at `:2156–2181` extension must check for `phase6-summary.md` (not just `step: complete`) to qualify as safe-to-archive. If both conditions hold AND no lock exists → archive. This protects against mid-flight `step:complete` states. For issue-32/issue-46 specifically: their `step` is `final-validation` not `complete`, so they would NOT be auto-archived by the second-pass GC. Phase 4 Task B9 (one-shot cleanup) must decide explicitly whether to:
  - (a) advance them to phase6-summary.md + archive (proper Phase 6 finalize replay) — but this is more work and may require re-running gh calls
  - (b) leave them as evidence and address in a follow-up
  - (c) manual archive with a `--reason=stale-issue-closed-after-final-validation` marker

Recommend (c) for these two: manual archive into `kaola-workflow/archive/` with their existing state intact, since the issues are closed on GitHub and the audit body explicitly cites them as stale evidence.

## Deferred-decision flag for phase2-ideation.md

Per advisor: filing follow-up issues #N1 (roadmap atomic) and #N2 (prompt-slim) happens at Phase 6 Task B10, but the **#51 close comment must explicitly list "Deferred ACs: roadmap concurrency, prompt footprint" with links to the follow-up issues** so the audit doesn't read as silently dropping 5 ACs. Phase 6 Step 7 must encode this.

## Correction from prior advisor turn

Earlier advisor framing ("attack all 11 ACs vs ask the user") was binary. The planner's scope-by-evidence cut (Strategy B) is sharper than either. The planner produced the third option; the advisor confirms it.

## Earlier advisor advice (from Phase 0/lock-cleanup)

> Lock is expired — sweep should clear it. [...] If sweep doesn't clear it: inspect the lock file directly. Document why sweep skipped it; that's a #51 finding. Manually remove the lock file to unblock the claim. Don't touch worktree or branch yet — those are separate ACs.

Followed: lock manually removed (with backup preserved at `/tmp/kaola-issue-46-stale-evidence.lock.json` and `.cache/preserved-stale-evidence.md`); worktree `kaola-workflow.kw/issue-46` and branch `workflow/issue-46` were NOT touched (separate ACs covered by Strategy B Task B9).
