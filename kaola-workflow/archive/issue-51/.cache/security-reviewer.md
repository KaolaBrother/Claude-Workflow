# Security Review — Issue #51 Phase 4

Date: 2026-05-18
Reviewer: security-reviewer agent
Scope: git diff main — scripts/kaola-workflow-claim.js, scripts/kaola-workflow-repair-state.js, plugins/kaola-workflow/hooks/kaola-workflow-pre-commit.sh, scripts/simulate-workflow-walkthrough.js

---

## Summary

No CRITICAL or HIGH issues found. Phase 6 is not blocked.

Three MEDIUM/LOW findings documented below.

---

## CRITICAL — None

---

## HIGH — None

---

## MEDIUM

### M-1: closedFastPath skips lock field validation before removeWorktree

File: scripts/kaola-workflow-claim.js:2147–2161

In `cmdSweep`, the new `closedFastPath` branch calls `removeWorktree(coordRoot, lock.project, lock)` (line 2161) without first validating `lock.project` via `isSafeName()`. The parallel code in `cmdWatchPr` at lines 2348–2349 validates both `isSafeName(lock.project)` and `isSafeName(lock.session_id)` before calling `removeWorktree`.

The existing sweep code for the normal (stale) path also skips these validations — so this is not a regression introduced by the closedFastPath — but the closedFastPath adds a new way to reach `removeWorktree` that bypasses the defense-in-depth pattern established by `cmdWatchPr`.

Blast radius analysis:
- `lock.project` flows into `removeWorktree`'s deferred branch only (`path.join(pendingDir, project + '.json')`, line 643). The deferred branch fires when `cwdReal` is inside `wtReal`, which is unlikely during a sweep from the main worktree.
- `lock.worktree_path` is passed to `realpathSync` then to `git worktree remove --force -- <path>` (line 658). `git worktree remove` refuses paths not registered as worktrees; `rmdirSync` only removes empty directories. No path anchoring to `coordRoot` exists, but this is pre-existing to this PR.
- `lock.issue_number` is passed via `String(lock.issue_number)` to `execFileSync` array form — no shell injection possible.
- Attacker prerequisite: must write a malicious `.lock` file AND make `gh issue view N` report state=CLOSED (i.e., control or forge gh responses). This is a high-bar precondition.

Recommended fix: add `isSafeName(lock.project)` and `isSafeName(lock.session_id)` checks at the top of the closedFastPath block, consistent with cmdWatchPr:

```js
if (!isSafeName(lock.project)) continue;
if (!isSafeName(lock.session_id)) continue;
```

This should also be applied to the normal (non-closedFastPath) sweep path at lines 2151–2163 for parity.

---

## LOW

### L-1: cmdResume ownership guard is identity-assertion not identity-verification

File: scripts/kaola-workflow-claim.js:2640–2651

The new guard compares `resumeLock.session_id !== explicitSession` where `explicitSession` comes directly from `args.session` (the raw `--session` flag value). An attacker who knows another session's `session_id` can pass `--session=<that-id>` and the guard passes, resuming the victim's project context.

This is a known, documented deviation (args.session-based identity, not crypto-verified). The prior-art `cmdResume` on `main` had no guard at all, so this is a strict additive improvement — the new code blocks every unintentional mismatch case. The attack requires knowledge of an active session's ID, which is not a secret in this system's threat model (session IDs are written to lock files readable by any local user).

No action required; documenting for awareness.

### L-2: Pre-commit hook duplication creates drift surface

Files: hooks/kaola-workflow-pre-commit.sh vs plugins/kaola-workflow/hooks/kaola-workflow-pre-commit.sh

Both files are identical at the time of this review (diff confirmed). The duplication creates a maintenance surface where a future security fix applied to one copy may be missed in the other. No shell argument injection found in either copy; paths are handled via node and execFileSync rather than shell interpolation; LOCK_FILE is constructed from COORD_ROOT + PROJECT where PROJECT is extracted from `git diff --cached --name-only` output via awk (positional field, not interpolated). The hook can be bypassed via `git commit --no-verify` by design.

Recommendation: document in a comment that both copies must be kept in sync, or consolidate via symlink.

### L-3: Epic 20B test uses KAOLA_OFFLINE env var that claim.js does not read

File: scripts/simulate-workflow-walkthrough.js:6240, 6336, 6395

The Epic 20B test sets `KAOLA_OFFLINE: '1'` in the child process environment. `scripts/kaola-workflow-claim.js` only reads `KAOLA_WORKFLOW_OFFLINE` (line 8). The test may be relying on the gh shim (via the epic20bTmp PATH or the absence of a gh binary) to achieve offline behavior rather than the OFFLINE flag. If a real `gh` binary is reachable on the system PATH, the test may silently make live gh calls instead of being isolated.

This is a test correctness issue, not a production security issue. But if a test passes only because no gh binary is available in CI but fails in an environment with gh on PATH, security-sensitive assertions (label/assignee removal) may not be reliably tested.

Recommendation: set `KAOLA_WORKFLOW_OFFLINE: '1'` instead of (or in addition to) `KAOLA_OFFLINE: '1'` in Epic 20B, 20D, and the step:complete sweep test.

---

## Affirmative Findings

- No hardcoded secrets. grep for AKIA, sk-, api_key, password, token, secret on the diff returned no results outside test fixture strings.
- All gh CLI invocations use `execFileSync` array form (ghExec helper). No template-string shell construction found. `String(lock.issue_number)` and `String(issueNumber)` coercions prevent injection even on non-numeric values.
- `isIssueClosed` (lines 2121–2128) returns `false` on OFFLINE, null input, gh errors, and JSON parse failures. It does not fail open. Transient gh failures do not trigger the destructive sweep path.
- `archiveProjectDir` validates `isSafeName(project)` at line 1905 before constructing any path. The second-pass GC code at line 2191 validates `isSafeName(entry.name)` before consuming it.
- `scripts/kaola-workflow-repair-state.js:114` — changing `ownedByCurrentSession` to return `false` when `sessionId` is empty is a security hardening. The prior `return true` gave any caller with no session ID unilateral repair rights over all projects. Epic 20F correctly tests this.
- `cmdWorktreeFinalize` `remoteCleanup` flip to `true` (line 2813) is guarded by the session ownership check at lines 2789–2796. No unguarded label/assignee removal is introduced.
- Ticker `KAOLA_KERNEL_SESSION_SKIP=1` bypass (lines 2098–2099) is scoped to the ticker's ancestry check only. `enforcePlatformSessionOrExit` (line 256) is independently controlled by `KAOLA_ENFORCE_PLATFORM_SESSION=1` and is not bypassed by `KAOLA_KERNEL_SESSION_SKIP`. The two env vars guard different gates and do not interact.
- OFFLINE bypass for `claimExplicitTarget` closed guard (line 1305) is expected behavior: offline mode cannot verify closed state. Documented.

---

## Verdict

CRITICAL: 0 — no block
HIGH: 0 — no block
Phase 6 can proceed. Address M-1 (isSafeName parity in sweep closedFastPath) in a follow-up patch; it is not a Phase 6 blocker given the high attacker precondition bar.
