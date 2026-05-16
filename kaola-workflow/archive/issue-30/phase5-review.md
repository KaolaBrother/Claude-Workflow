# Phase 5 - Review: issue-30

## Code Review Findings

### CRITICAL
none

### HIGH
none

### MEDIUM/LOW

**MEDIUM-1 (Fixed):** `provisionWorktree` bare `includes(wtPath)` false-positive — a project path that is a prefix of another (e.g., `issue-501` vs `issue-5010`) would return a false resume hit. Fixed inline: `listOut.includes('worktree ' + wtPath + '\n')`.

**MEDIUM-2 (Fixed):** `cmdClaim` legacy lock re-claim regression — pre-Phase-4 locks without `worktree_path` fell through `issueAlreadyClaimed` → exit 2. Fixed via tdd-guide: added a third branch (`!existingLock.worktree_path`) that provisions a new worktree and patches the lock in place. Tests 15G + 15H added to walkthrough.

**MEDIUM-3 (Follow-up):** Test 15E missing `patch-branch` assertion after missing-worktree recovery. Does not block.

**MEDIUM-4 (Follow-up):** Test 16B missing branch-preservation assertion after PR CLOSED. Does not block.

**LOW (Fixed):** `migrateLegacyCoordState` EXDEV branch leaked file descriptor from `fs.openSync`. Fixed inline: stored fd + `fs.closeSync(fd)`.

**Security-MEDIUM (Follow-up):** Inconsistent `isSafeName` implementations across `repair-state.js` vs `claim.js`/`sink-merge.js`. Maintenance concern, not immediately exploitable. Does not block.

**Security-LOWs (Follow-up):** Lock file mode 0o600 on update writes (4 sites); symlink check in `migrateLegacyCoordState`; `worktree_path` forwarding in `cmdHandoff`; `git checkout` without `--` in `sink-merge.js`; `phase_file` path probe in `repair-state.js`. All bounded by local trust assumptions. Do not block.

## Security Review

ran: yes — filesystem access, external API calls (gh CLI), git hook, lock file writes.

### Findings
No CRITICAL or HIGH. One MEDIUM (isSafeName inconsistency) and five LOWs as listed above.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-reviewer | invoked | .cache/code-reviewer.md | |
| security-reviewer | invoked | .cache/security-reviewer.md | filesystem access + git hook touched |
| review-fix executors | invoked | .cache/review-fix-1.md (MEDIUM-2 fix) | |
| advisor critical gate | N/A | no CRITICAL findings | |

## Fixes Applied

1. **Trivial Inline — MEDIUM-1**: `provisionWorktree` includes() anchor fix (`'worktree ' + wtPath + '\n'`). Recorded here.
2. **Trivial Inline — LOW**: `migrateLegacyCoordState` fd leak: added `fs.closeSync(_fd)`. Recorded here.
3. **tdd-guide — MEDIUM-2**: Legacy lock re-claim regression. Fixed in `cmdClaim()`; tests 15G + 15H added. Evidence: `.cache/review-fix-1.md`.
4. **Plugin mirror re-synced**: `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` re-copied after fixes.

## Validation Evidence

| Command | Result | Evidence |
|---------|--------|----------|
| `node scripts/simulate-workflow-walkthrough.js` | PASS (exit 0) | Phase 4 evidence + re-run post-fix |
| `node scripts/validate-workflow-contracts.js` | PASS (exit 0) | Phase 4 evidence |
| `bash -n hooks/kaola-workflow-pre-commit.sh` | PASS (exit 0) | Phase 4 evidence |
| `diff scripts/kaola-workflow-claim.js plugins/...` | PASS (empty diff) | post-fix mirror sync |

## Follow-Up Items

1. Test 15E: add `patch-branch` assertion for missing-worktree recovery scenario
2. Test 16B: add `git branch --list` assertion confirming branch preserved after CLOSED
3. `isSafeName` consolidation across `repair-state.js` / `claim.js` / `sink-merge.js`
4. Lock file mode 0o600 on 4 update-write sites in `claim.js` (heartbeat, ticker, patch-branch, watch-pr)
5. Symlink guard in `migrateLegacyCoordState` (`lstatSync` before `linkSync`)
6. Strip `worktree_path` in `cmdHandoff` instead of forwarding from existing lock
7. `git checkout -- <branch>` in `sink-merge.js` for consistency with delete calls
8. `phase_file` path validation in `repair-state.js` before `exists()` probe
9. Shell pwd grace follow-up issue (deferred from Phase 3, §Items Deferred)

## Review Status

PASSED WITH FOLLOW-UPS
