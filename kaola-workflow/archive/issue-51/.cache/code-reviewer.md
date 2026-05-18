# Code Review — Issue #51 Phase 4
Reviewer: code-reviewer agent
Date: 2026-05-18

## Scope

Changes reviewed via `git diff main` across:
- `scripts/kaola-workflow-claim.js`
- `scripts/kaola-workflow-repair-state.js`
- `scripts/simulate-workflow-walkthrough.js`
- `scripts/validate-script-sync.js`
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- `plugins/kaola-workflow/hooks/kaola-workflow-pre-commit.sh` (new file)
- `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` (sync copy)
- `plugins/kaola-workflow/scripts/kaola-workflow-repair-state.js` (sync copy)

---

## Findings

### [MEDIUM] B7b deviation: `args.session` does not promote `KAOLA_SESSION_ID` env var — guard is skipped for env-only callers

**File:** `scripts/kaola-workflow-claim.js:2640`

```js
const explicitSession = args.session || '';
if (explicitSession) { ... }
```

The plan (phase3-plan.md Task B7b) called for `currentSessionId(args, { fallback: false })`, which first checks `args.session` and then falls back to `KAOLA_SESSION_ID` before returning `''`. The implementation uses `args.session || ''` directly.

As a result, a caller that passes no `--session` CLI flag but does have `KAOLA_SESSION_ID` set in the environment (the normal production path for many resume invocations) gets the permissive path — the ownership guard never fires. The documented deviation in phase4-progress.md B7 notes "to avoid KAOLA_SESSION_ID env-var regression on test 17D", which is the correct justification, but the implication is that the guard covers only the explicit `--session` flag callers, not all authenticated sessions.

`cmdResume` is read-only (it returns JSON state and does not modify locks or files), so this is a diagnostic/UX regression, not a security hole. However, the narrowed guard is weaker than the B7 intent. Phase 5 should note this for explicit documentation before Phase 6.

**Fix suggestion:** Add a comment at line 2640 stating explicitly that `KAOLA_SESSION_ID`-only callers (no `--session` flag) are intentionally permissive, with a reference to the test-17D constraint. This prevents a future reader from "fixing" it to `currentSessionId(args)` without understanding the regression.

---

### [MEDIUM] New plugin hook not tracked by `validate-script-sync.js` — will drift silently

**File:** `plugins/kaola-workflow/hooks/kaola-workflow-pre-commit.sh` (new)
**Related:** `scripts/validate-script-sync.js`

The new hook is a byte-identical copy of `hooks/kaola-workflow-pre-commit.sh` today. However, `validate-script-sync.js` only enforces sync on the `COMMON_SCRIPTS` list (7 `.js` files). The hook copy is not in that list, and no other mechanism tracks it. Future edits to `hooks/kaola-workflow-pre-commit.sh` will not propagate to `plugins/kaola-workflow/hooks/` and vice versa, with no CI signal.

The `validate-script-sync.js` comment update at line 24 clarifies the compact-context exclusion but does not acknowledge this new file. Phase 4 records this as in-scope for AC2 but the validation gap persists after merge.

**Fix suggestion:** Either add the hook pair to `validate-script-sync.js`'s check (extending the COMMON_SCRIPTS approach to a COMMON_HOOKS list), or add a comment in `validate-script-sync.js` explicitly documenting that the hook copy is not sync-tracked and must be manually maintained.

---

### [LOW] `removeWorktree` in closed-fast-path is outside the `!OFFLINE` block but `closedFastPath` already implies `!OFFLINE` — gating is equivalent but structurally inconsistent

**File:** `scripts/kaola-workflow-claim.js:2160-2162`

```js
if (!OFFLINE && lock.issue_number != null) {
  // gh edit + postReleaseComment
}
if (closedFastPath) {
  try { removeWorktree(coordRoot, lock.project, lock); } catch (_) {}
}
```

The plan (phase3-plan.md B4 write-set) stated `removeWorktree` should be inside the `!OFFLINE && lock.issue_number != null` block. It is outside. This is functionally safe because `closedFastPath` is defined as `!synthetic && !OFFLINE && lock.issue_number != null && isIssueClosed(...)`, so the conditions are equivalent. However, the structural inconsistency makes the intent harder to read and could invite a future refactor that breaks the equivalence (e.g., if `closedFastPath` definition is widened to drop the `!OFFLINE` guard).

No behavior change needed. Note for Phase 5.

---

### [LOW] `cmdFinalize` revert confirmed but `releaseSession` is now absent from the finalize path — verify AC3 coverage chain is complete

**File:** `scripts/kaola-workflow-claim.js` (cmdFinalize, around line 1955)

The phase4-progress.md correctly documents the revert: `cmdFinalize releaseSession insert` was reverted because it broke test 34-A idempotency (lock must survive finalize). AC3 coverage is claimed via `cmdSweep + cmdWatchPr + cmdWorktreeFinalize`.

The `cmdWorktreeFinalize` path (line 2813) now uses the default `remoteCleanup: true` (the B4 flip). Labels and assignees are therefore cleared when `worktree-finalize` is called. The `cmdSweep` first-pass `closedFastPath` covers the case where issues are closed before finalization completes. This chain appears complete.

No action needed. Recording here for the Phase 5 AC audit trail.

---

### [LOW] `claimExplicitTarget` closed guard is placed BEFORE `issueAlreadyClaimed` — ordering differs from plan intent

**File:** `scripts/kaola-workflow-claim.js:1304-1315`

The phase3-plan.md Task B4 write-set says: "inserted BEFORE `issueAlreadyClaimed` check" in the task summary header, but the Task B4 body refines this: "Best insert site for `user_target_closed` is BEFORE `issueAlreadyClaimed` returns and BEFORE `classifier unavailable` check" — i.e., before `issueAlreadyClaimed` is preferred. The implementation places the closed guard first.

Placing `isIssueClosed` before `issueAlreadyClaimed` means that for a closed issue that happens to have a stale lock, the caller gets `user_target_closed` rather than `target_occupied`. This is the correct user-facing behavior (the issue is closed; whether a stale lock exists is irrelevant). The implementation is correct; the phase3-plan text was self-consistent on the final intent.

No action needed. Note for completeness.

---

### [LOW] `isIssueClosed` adds one `gh` CLI round-trip per lock file in `cmdSweep` first pass

**File:** `scripts/kaola-workflow-claim.js:2147`

Each non-synthetic lock now potentially triggers a `gh issue view --json state` call even before `shouldSweep` or `isRemoteStale` checks. In a repo with many concurrent sessions, this adds latency proportional to the number of active locks. The existing `isRemoteStale` already makes one gh API call per lock, so this doubles the gh call budget in the worst case.

This is defensible for correctness (the closed-issue path needs the state check), but it creates a performance gap worth noting. A future optimization could batch the closed-state check with the `isRemoteStale` check or cache results across a single sweep run.

No action needed for Phase 5/6. File as LOW-priority follow-up if sweep latency is observed in production.

---

### [PASS] Cross-file sync verified

`scripts/kaola-workflow-claim.js` and `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` are byte-identical (diff confirmed 0 differences).
`scripts/kaola-workflow-repair-state.js` and `plugins/kaola-workflow/scripts/kaola-workflow-repair-state.js` are byte-identical.
`hooks/kaola-workflow-pre-commit.sh` and `plugins/kaola-workflow/hooks/kaola-workflow-pre-commit.sh` are byte-identical (today).

---

### [PASS] OFFLINE fail-open verified

`isIssueClosed` (line 2121) checks `OFFLINE` first and returns `false` (fail-open) before any gh call.
`claimExplicitTarget` (line 1305) checks `!OFFLINE` before calling `isIssueClosed`. When `OFFLINE=1`, the closed guard is skipped entirely — the issue proceeds to `issueAlreadyClaimed`. This satisfies the advisor V3 requirement that `OFFLINE=1 claim --target-issue N` for a closed issue does NOT return `user_target_closed`.

---

### [PASS] `cmdSweep` first-pass gate composition verified

Lines 2147-2149:
```js
const closedFastPath = !synthetic && !OFFLINE && lock.issue_number != null && isIssueClosed(lock.issue_number);
if (!synthetic && !closedFastPath && !shouldSweep(lock)) continue;
if (!synthetic && !closedFastPath && !isRemoteStale(lock)) continue;
```

Both `continue` guards are gated with `!closedFastPath`. A fresh closed lock (not shouldSweep, not isRemoteStale) will have `closedFastPath=true`, bypassing both continues and reaching the cleanup block. Advisor V4 gate composition requirement satisfied.

---

### [PASS] `cmdSweep` second-pass step:complete check fires before phase*.md guard

Lines 2195-2209: `stateContent` read is hoisted above both the new step:complete branch (line 2201) and the `phase*.md` guard (line 2209). `phase6-summary.md` would match the `phase*.md` guard and be skipped if order were reversed. Comment at line 2200 explicitly documents the ordering dependency.

---

### [PASS] `repair-state.js` ownership refusal on empty session (B7a)

Line 114: `if (!sessionId) return false;` — correct change. The prior `return true` allowed a sessionless repair to overwrite any project state. Epic 20F covers this with an explicit regression test.

---

### [PASS] Test coverage by epic

| New code path | Regression epic |
|---|---|
| `cmdSweep` `closedFastPath` | Epic 20A |
| `claimExplicitTarget` `user_target_closed` | Epic 20A (sub-assert) |
| Post-completion auto-claim refusal | Epic 20B |
| `cmdSweep` second-pass step:complete archive | Epic 20D |
| `cmdResume` cross-session block | Epic 20E |
| `ownedByCurrentSession` empty-session → false | Epic 20F |
| test 7D label-removal assertion (watch-pr CLOSED) | Epic 7D extension |
| 9A3 ticker Codex-safe env gate | 9A3 env-gate |

All new code paths have regression coverage. No uncovered path identified.

---

### [PASS] No debug statements

No `console.log`, `console.debug`, or equivalent debug output found in any modified production file.

---

### [PASS] No hardcoded secrets or credentials

No keys, tokens, or credentials introduced.

---

### [PASS] Plugin simulation path fixes (B2b) are mechanical and correct

All `path.join(root, ...)` and `path.join(__dirname, '..', ...)` references in `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` now use `repoRoot` (three levels up from `plugins/kaola-workflow/scripts/`). The `repoRoot` constant is defined at the top of the file. Multiple fix sites are consistent and complete per phase4-progress.md B2b expansion record.

---

## Review Summary

| Severity | Count | Status |
|---|---|---|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 2 | warn |
| LOW | 4 | note |

**Verdict: WARNING** — no blocking issues. Two MEDIUM items should be addressed before Phase 6 merge:

1. Document the B7b `args.session` intentional narrowing with an inline comment so future readers cannot silently undo the test-17D constraint.
2. Either extend `validate-script-sync.js` to track the new `plugins/kaola-workflow/hooks/kaola-workflow-pre-commit.sh` copy, or add an explicit comment stating it is untracked.

The LOW items are informational; none require changes before merge.
