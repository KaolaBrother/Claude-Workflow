# Planner: claim-hardening

## Sub-question Resolutions

- **M1**: Option (a) — verify current regex + add test coverage (8E). KISS: don't change a regex that may be working; YAGNI: no simplification without evidence of a bug. If 8E fails, escalate to surgical fix.
- **S-L1**: Fix only 3 creation points (lines 153, 171, 231). `fs.writeFileSync` preserves existing mode on re-write; lines 290, 377, 444 are re-writes and inherit the creation-time mode.
- **S-L2**: Validate at write point (line 123) using `/^\d+$/.test(...)` consistent with line 386 convention. On invalid, write `'N/A'` silently (no new stderr warning).
- **INFO**: Skip-on-invalid in `cmdStatus` (not assert-throw). `cmdStatus` is all-locks read-only — throwing on one bad entry denies status for all. Skip + record drift.

## Recommended Option: A — 4-in-one mechanical + separate M1 verification

### Phase 1 — Mechanical hardening (M2 + S-L1 + S-L2 + INFO)

1. `fs.openSync(lp, 'wx', 0o600)` at line 153 (S-L1 lock creation)
2. `fs.writeFileSync(sessionPath(...), ..., { mode: 0o600 })` at line 171 (S-L1 session creation)
3. `fs.writeFileSync(lp, ..., { mode: 0o600 })` at line 231 (S-L1 lock re-write after commentId)
4. `process.stderr.write('updateLeaseInPlace: ## Lease section missing in ' + stateFile + '\n');` before line 143 return (M2)
5. `/^\d+$/.test(lockData.claim_comment_id)` guard at line 123 → write `safeCommentId` or `'N/A'` (S-L2)
6. `isSafeName(lock.session_id)` guard before line 330 → skip + push `'session_id unsafe'` to drift array (INFO)
7. Epic Case 8 in simulate-walkthrough.js: sub-tests 8A (permissions), 8B (M2 stderr), 8C (S-L2 validation), 8D (INFO skip)

### Phase 2 — M1 verification

8. Epic Case 8E: drive claim→release→claim path with state file containing `## Project / ## Sink / ## Last Updated` sections. Assert `issue_number` and `claimed_at` refresh + sibling sections preserved.
9. If 8E fails: surgical regex fix (replace lookahead-based match with section-aware splitter). Do NOT rewrite `updateSinkLease` structure.

## Option B — All 5 in one PR
Adequate but mixes mechanical + investigation review shapes. Medium risk from regex change alongside mechanical fixes. Not recommended.

## Option C — Five individual PRs
Overkill for 1-3 line items. 5× ceremony. Not recommended.

## Items NOT to Build
- No new subcommands or CLI flags
- No changes to commands/*.md files (unless contract assertion breaks — verify)
- No `getMachineId` permission fix (config file, not lock/session; deferred)
- No regex simplification in M1 unless 8E fails
- No new stderr warning for invalid `claim_comment_id`
- No re-write permissions on lines 290, 377, 444
- No `assert()` in cmdStatus INFO fix (use skip-on-invalid)
- No simulate-walkthrough.js structure refactor (deferred)

## Testing Strategy
- Epic Case 8 (8A–8D) for mechanical; Epic Case 8E for M1
- Platform guard: `if (process.platform !== 'win32')` on permission assertions
- Stderr capture (8B): `execFileSync(..., { stdio: ['ignore', 'pipe', 'pipe'] })`
- Target: simulate-walkthrough.js stays under 1150 lines

## Key Unknown
M1: does the current regex correctly handle all state-file layouts? 8E will answer this. If yes, M1 is test-only. If no, surgical fix.

## Success Criteria
- All 5 items resolved in claim.js
- Lock/session created at 0o600 (8A, non-Windows)
- `updateLeaseInPlace` warning surfaces on stderr (8B)
- claim_comment_id is digits-only or N/A in state file (8C)
- cmdStatus skips malformed session_id, exit 0 (8D)
- Re-claim refreshes Sink block fields (8E)
- Epic Cases 1–7 still pass
- simulate-walkthrough.js under 1150 lines
- No public CLI surface change
