# Advisor Plan Gate

## Verdict: APPROVE with two scope reductions and five Phase 4 verifications

The blueprint is implementable. Phase 4 should proceed. No architect revision needed.

## Scope Reductions (lock into phase3-plan.md)

### 1. `cmdWatchPr:2340` flip is a no-op — DO NOT EDIT

The code-explorer read stale state. The architect re-read source and confirms `cmdWatchPr` CLOSED branch at line 2340 already calls `releaseSession(…, 'aborted')` with no `{remoteCleanup:false}` argument — the implementation is already correct.

**B4 work for `cmdWatchPr` reduces to**: extend test 7D (`scripts/simulate-workflow-walkthrough.js:1437–1466`) so the gh shim records `gh issue edit --remove-label` calls and assert the call was made for CLOSED. No source change at `:2329–2340`.

### 2. No new `cmdStartup` dispatch arm for `user_target_closed`

Architect found `cmdStartup:1447–1468` already renders `targetResult.status` generically. `claimExplicitTarget` returns the new `user_target_closed` status and `reasoning` field; it flows through automatically.

**B4 work for the closed-issue guard reduces to**: the `claimExplicitTarget` insertion at `:1311` only. Skip grep-for-switch-arms. Run a quick smoke test to confirm stderr message is human-readable.

## Phase 4 Verifications (B4/B5 can ship green and still be wrong without these)

### V1: H2 exact gate condition

Trigger: OR-of-three — `args.runtime === 'codex'` OR `process.env.CODEX_THREAD_ID` is set OR `process.env.KAOLA_KERNEL_SESSION_SKIP === '1'`. Anything weaker keeps 9A3 red on Codex; anything broader makes Claude sessions skip the PID check unnecessarily. Lock the exact condition in the implementation.

### V2: Epic 20B may pass immediately

Per Phase 1, `cmdPickNext` since #44 already refuses without `--target-issue`. If Epic 20B is green on first run, that's regression coverage success — **don't add hardening**. Report it honestly in phase4-progress.md as "test added, no implementation change required."

### V3: `claimExplicitTarget` closed guard must short-circuit OFFLINE

If `OFFLINE === true`, the H1 call returns false and the guard becomes a no-op. Confirm with a test case: `OFFLINE=1 node claim.js claim --target-issue 51` should NOT return `user_target_closed` even if #51 is closed. (This is the fail-open design.)

### V4: `cmdSweep` first-pass gate composition

Current code at `:2125–2126`:
```js
if (!synthetic && !shouldSweep(lock)) continue;
if (!synthetic && !isRemoteStale(lock)) continue;
```

The closed-issue bypass must short-circuit BOTH continues, not just one. Required composition after the fix: synthetic OR closed-issue-fast-path OR (shouldSweep AND isRemoteStale). Phase 4 must re-read the existing gate carefully and structure the new gate as OR-not-AND. Suggested implementation: compute `const closedFastPath = !synthetic && lock.issue_number != null && isIssueClosed(lock.issue_number);` BEFORE the two `continue` lines, then change them to `if (!synthetic && !closedFastPath && !shouldSweep(lock)) continue; if (!synthetic && !closedFastPath && !isRemoteStale(lock)) continue;`.

### V5: `postReleaseComment` reason allowlist

Phase 4 must `grep -n postReleaseComment scripts/kaola-workflow-claim.js` and check for an allowlist of reason strings. If `:released-closed-issue` (or whatever new reason is used) would be rejected by a validator, either:
- (a) reuse `:released-stale` for closed-issue cleanup, OR
- (b) extend the allowlist.

Expected: no allowlist (the function just passes a string through to gh comment), but Phase 4 must verify.

## Edge Case the Architect Missed

### B9 worktree cleanup audit trail

`git worktree remove --force <path>` discards uncommitted changes silently. `removeWorktree:658` uses `--force`. For B9 specifically (issue-40/42/46 worktrees), this is intentional — they're abandoned. But:

**Phase 4 must explicitly `git status` each worktree BEFORE removal** and capture the output to `kaola-workflow/issue-51/.cache/b9-cleanup-evidence.md` as audit trail. Don't silently nuke trees without a paper trail. Format:

```markdown
## B9 Cleanup Evidence
### kaola-workflow.kw/issue-40
git status --short (before removal): [output]
removed at: [timestamp]
### kaola-workflow.kw/issue-42
...
```

## Build Sequence Verification

- **B1 → B3 → B4 chain is correct** (helper + RED test + GREEN impl).
- **B2 is independent of B1** — could run in parallel, but sequential is fine for review clarity.
- **B5 can run before or after B4** — Epic 20B is independent of B4's implementation work.
- **B7 (repair-state / cmdResume guards) is fully independent of B4–B6.**

Build sequence is dependency-safe.

## Closing Caveat

The architect's response shows Phase 1 code-explorer made at least one stale-read error (`cmdWatchPr:2340`). **Treat code-explorer output as a starting point, not ground truth, throughout Phase 4.** Every modification site should be re-read before editing. Add this discipline note to phase3-plan.md so the implementer agent (Phase 4 tdd-guide) doesn't take cached findings as the source of truth.
