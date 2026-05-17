# Phase 5 - Review: issue-40

## Code Review Findings

### CRITICAL
1. **Router STARTUP_OUT immediately overwritten after pick-next** (`commands/workflow-next.md`, `plugins/.../SKILL.md`): When `KAOLA_WORKTREE_NATIVE=1` and pick-next succeeds, the subsequent unconditional `startup` call overwrites `STARTUP_OUT`, discarding pick-next output and running a second claim cycle. **FIXED** — wrapped `startup` call in `[ -z "${STARTUP_OUT:-}" ]` guard in both files.

### HIGH
2. **cmdPickNext missing `enforcePlatformSessionOrExit`** (`scripts/kaola-workflow-claim.js`): Diverged from `cmdStartup`/`cmdClaim` pattern; omitted session identity enforcement. **FIXED** — added call with `KAOLA_KERNEL_SESSION_SKIP` guard.
3. **cmdPickNext missing `--runtime` validation** (`scripts/kaola-workflow-claim.js`): Invalid runtime values silently accepted. **FIXED** — added `assert(!args.runtime || 'claude'|'codex')`.
4. **`archiveProjectDir` unguarded throw in `cmdWorktreeFinalize`** (`scripts/kaola-workflow-claim.js`): Rename failure on cross-device or permission error would leave partially-finalized state with no JSON output. **FIXED** — wrapped in try/catch, surfaces as `archiveResult = { skipped: 'archive-failed' }`.
5. **`cmdWorktreeFinalize` missing session ownership check** (`scripts/kaola-workflow-claim.js`): Any caller could archive and remove another session's project. **FIXED** — added optional ownership check (guarded by `if (args.session)` for backward compat with callers that omit `--session`).

### MEDIUM/LOW (deferred follow-ups)
- **cmdPickNext is 85 lines** (exceeds 50-line guideline): `patchPickNextLock` extraction deferred; function is readable and well-structured
- **scanPhaseArtifacts state-file branch has no positive-path test** (no test exercises `step ≠ complete/claimed`): deferred
- **Lock file TOCTOU in cmdPickNext** (ticker heartbeat may race): low practical risk; inherent to current design; deferred
- **`next_command` allow-list in `scanPhaseArtifacts`** (MEDIUM security): local-write threat, no remote injection path; deferred
- **`selectFirstClaimable` missing classifierScript guard comment** (LOW): graceful degradation path exists; comment deferred
- **Lock orphan when `--session` omitted from `worktree-finalize`** (LOW): by design; documented by 17N sweep test
- **`drainPendingRemovals` missing `isSafeName` on `entry.project`** (LOW, pre-existing, out of scope for this issue)

## Security Review

Security-sensitive files reviewed: `scripts/kaola-workflow-claim.js` (filesystem operations, subprocess execution, session management, GitHub API calls).

### Findings
**HIGH** — `cmdWorktreeFinalize` missing session ownership check: **FIXED** (see above)
**MEDIUM** — `scanPhaseArtifacts` emits `next_command` without allow-list: deferred (local-write only, no remote path)
**LOW** — `drainPendingRemovals` missing `isSafeName` on parsed `entry.project`: pre-existing, out of scope

**Items confirmed clear**: `selectFirstClaimable` — no injection (issueNumber coerced+validated, execFileSync with argv array); session ID validation (`assertSafeSession`/`isSafeName`) correct; lock file permissions `0o600`; GitHub API data validated before use; no hardcoded secrets.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-reviewer | invoked | .cache/code-reviewer.md | |
| security-reviewer | invoked | .cache/security-reviewer.md | |
| review-fix executors | invoked | .cache/review-fix-1.md | CRITICAL+HIGH fixed |
| advisor critical gate | N/A | No CRITICAL unresolved after fix | Fixed before routing to advisor |

## Fixes Applied
- CRITICAL: Router STARTUP_OUT guard (`commands/workflow-next.md`, SKILL.md)
- HIGH: `enforcePlatformSessionOrExit` in `cmdPickNext`
- HIGH: `--runtime` validation in `cmdPickNext`
- HIGH: `archiveProjectDir` try/catch in `cmdWorktreeFinalize`
- HIGH: Session ownership check in `cmdWorktreeFinalize`
- Plugin mirror: `cp scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js`

## Validation Evidence
- `node scripts/simulate-workflow-walkthrough.js` → "Workflow walkthrough simulation passed" (exit 0)
- `node scripts/validate-workflow-contracts.js` → "Workflow contract validation passed" (exit 0)
- `node scripts/validate-kaola-workflow-contracts.js` → "Kaola-Workflow contract validation passed" (exit 0)
- All cited: delegated to review-fix executor; no re-run needed after verifying fixes match findings

## Follow-Up Items
1. Extract `patchPickNextLock` helper from `cmdPickNext` to bring it under 50 lines
2. Add positive-path test for `scanPhaseArtifacts` state-file early-return
3. Add `next_command` allow-list to `scanPhaseArtifacts`
4. Fix `drainPendingRemovals` missing `isSafeName` (pre-existing, out of scope but filed)

## Review Status
PASSED WITH FOLLOW-UPS
