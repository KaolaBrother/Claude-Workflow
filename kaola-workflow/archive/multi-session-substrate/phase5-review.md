# Phase 5 - Review: multi-session-substrate

## Code Review Findings

### CRITICAL
- [C1] **Heartbeat signature mismatch** — All 6 phase command snippets passed session ID as positional arg; `cmdHeartbeat` requires `--session` flag. `args.session` always undefined → assert throws → heartbeat exits 1 at every phase boundary. Epic Case 1 used `--session` correctly and masked the bug.
  - **Fixed:** Added `--session` flag to all 6 phase command heartbeat snippets. (review-fix-1.md)

### HIGH
- [H1] **cmdClaim 67 lines** (50-line limit). Four concerns conflated: arg validation+lock write, session file write, GitHub side-effects, state update.
  - **Fixed:** Extracted `writeLockFile`, `writeSessionFile`, `postGitHubClaim` helpers. cmdClaim now 49 lines. (review-fix-2.md)

### MEDIUM/LOW (logged, non-blocking)
- [M1] Stale Sink block on re-claim — issue_number/claimed_at not refreshed when ## Sink already exists
- [M2] updateLeaseInPlace silently no-ops when ## Lease absent — undetected drift
- [L1] sleepMs busy-wait — approved by architect-revision-1
- [L2] Heartbeat exit 1 on new work — by design with && guard
- [L3] pre-commit false positive on "echo git commit" — fail-open is safe

## Security Review

**Ran:** yes — `claim.js` touches filesystem, external API (gh CLI), and session identity data.

### Findings
- [S-H1] **Path traversal via --project arg** — `args.project` fed into `path.join` without validation; `../` traversal creates files outside repo. **Fixed:** `isSafeName(args.project)` assertion in cmdClaim. (review-fix-2.md)
- [S-H2] **Poisoned lock file propagates traversal** — `match.project` from lock JSON fed into `fs.unlinkSync`/`fs.writeFileSync` without re-validation. **Fixed:** `isSafeName(match.project)` + `isSafeName(match.session_id)` assertions in cmdRelease and cmdHeartbeat. (review-fix-2.md)
- [S-M1] **--session unsanitized as filename** — Fixed as part of S-H1 fix (isSafeName on args.session).
- [S-M2] **--issue NaN via Number() coercion** — Fixed: parseInt + Number.isFinite && > 0 assertion.
- [S-L1] Lock/session files world-readable (0644) — follow-up item
- [S-L2] claim_comment_id unescaped in workflow-state.md — low exploitability, follow-up

### Confirmed Safe
- pre-commit.sh stdin → HOOK_INPUT env var (no shell injection path)
- All shell variables properly quoted in pre-commit.sh
- execFileSync array form (no shell interpolation)
- O_EXCL lock creation atomic and correct
- No hardcoded secrets

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-reviewer | invoked | .cache/code-reviewer.md | |
| security-reviewer | invoked | .cache/security-reviewer.md | filesystem + external API calls in claim.js |
| review-fix executors | invoked | .cache/review-fix-1.md, .cache/review-fix-2.md | C1 + H1 + S-H1 + S-H2 fixed |
| advisor critical gate | N/A | .cache/code-reviewer.md | CRITICAL was a signature mismatch; no ambiguity requiring advisor escalation |

## Fixes Applied
1. Heartbeat `--session` flag added to all 6 phase command snippets (commands/kaola-workflow-phase{1..6}.md)
2. isSafeName validation added to cmdClaim (args.project, args.session), cmdRelease (match.project, match.session_id), cmdHeartbeat (match.project, match.session_id)
3. --issue validated as positive integer (parseInt + Number.isFinite check)
4. cmdClaim refactored to 49 lines (extracted writeLockFile, writeSessionFile, postGitHubClaim)

## Validation Evidence
- `grep -l 'heartbeat --session' commands/kaola-workflow-phase*.md | wc -l` → 6 (PASS)
- `grep -c 'isSafeName' scripts/kaola-workflow-claim.js` → 7 (PASS)
- `KAOLA_WORKFLOW_OFFLINE=1 node scripts/kaola-workflow-claim.js status --json` → [] exit 0 (PASS)
- `npm test` → all suites pass (validate-workflow-contracts, simulate-workflow-walkthrough, claude plugin validate, Codex suites) (PASS)
- Re-review verdict: APPROVE — 0 CRITICAL, 0 HIGH

## Follow-Up Items
- [M1] Stale Sink block on re-claim — minor, tracked for next maintenance pass
- [M2] Lease drift detection not surfaced when ## Lease absent — tracked
- [S-L1] Lock/session files world-readable — add `{ mode: 0o600 }` in follow-up
- [S-L2] claim_comment_id unescaped — low risk, tracked
- [INFO] cmdStatus reads lock.session_id into path without isSafeName (read-only, safe, inconsistent) — tracked

## Review Status
PASSED WITH FOLLOW-UPS
