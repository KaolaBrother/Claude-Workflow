# Phase 2 - Ideation: claim-hardening

## Approaches Evaluated

### Option A: 4-Mechanical + Separate M1 Verification
- Summary: Bundle M2, S-L1, S-L2, and INFO as one mechanical PR; verify M1 via test 8E first, only fix regex if test fails.
- Pros: Clean review shape (mechanical fixes together, investigation separate); KISS/YAGNI on M1 (don't change working code); smallest diff surface; 8E doubles as regression coverage.
- Cons: Two logical groups; if 8E fails, Phase 4 grows by a surgical regex fix.
- Risk: Low
- Complexity: Small

### Option B: All 5 in One PR
- Summary: Implement all 5 items including the regex fix speculatively.
- Pros: Single commit.
- Cons: Mixes mechanical changes with a speculative regex rewrite; harder review; may fix a non-bug.
- Risk: Medium
- Complexity: Medium

### Option C: Five Individual PRs
- Summary: One PR per item.
- Pros: Maximum isolation.
- Cons: 5× ceremony; overkill for 1–3 line changes.
- Risk: Low
- Complexity: XL (coordination overhead)

## Advisor Findings

Advisor endorsed Option A. Key corrections and confirmations:

1. **8E test layout correction (required):** Planner proposed testing against `Project / Sink / Last Updated` (mid-document). Advisor corrected: in production Sink+Lease are always appended at the end by the "## Sink doesn't exist" branch of `updateSinkLease`. Correct 8E sequence: create standard state file → `claim #3` (appends Sink+Lease at end) → release → `claim #4` (triggers re-claim regex path) → assert `issue_number: 4`, fresh `claimed_at`, sibling sections preserved, exactly one `## Sink` and one `## Lease`.

2. **Optional 8E':** Test Sink at EOF with no following Lease (exercises the `(?=...|$)` clause). Not blocking.

3. **S-L2 stderr warning:** The planner's silent `'N/A'` fallback is adequate; a one-line stderr warning would improve observability but is not required. Recorded as considered; not built.

4. **Confirmations:** `{ mode: 0o600 }` on re-write at line 231 is a no-op today but documents intent (defensible). `fs.writeFileSync` mode-preserve on existing files is correct — lines 290, 377, 444 inherit creation-time mode. Cross-platform mode skip via `process.platform !== 'win32'` is correct. Skip-on-invalid for INFO is correct for read-only iteration semantics.

5. **Pre-existing 0o644 files:** Existing lock/session files on users' machines retain 0o644. Lock lifecycle is ephemeral (claim/release regenerates files), so this self-heals within days. No migration needed.

## Selected Approach

**Option A — 4-in-one mechanical + separate M1 verification**

Rationale: The advisor confirmed this is the correct split. Mechanical items (M2, S-L1, S-L2, INFO) are straightforward 1–3 line edits with no logic risk, and benefit from a single review pass. M1 may already be fixed by pr-sink's introduction of `buildSinkBlock`; 8E will confirm or expose a residual regex edge case. Speculating a regex change without evidence of a bug violates KISS and YAGNI.

## Task List (Phase 3 Blueprint Inputs)

Phase 1 tasks derived from the selected approach:

1. **M2** — Add stderr warning before silent return in `updateLeaseInPlace` (claim.js:143)
2. **S-L1a** — Add `0o600` mode to `fs.openSync` at claim.js:153
3. **S-L1b** — Add `{ mode: 0o600 }` to `fs.writeFileSync` session file at claim.js:171
4. **S-L1c** — Add `{ mode: 0o600 }` to `fs.writeFileSync` lock re-write at claim.js:231
5. **S-L2** — Validate `claim_comment_id` with `/^\d+$/` before write at claim.js:123
6. **INFO** — Add `isSafeName(lock.session_id)` guard before claim.js:330; skip+drift on invalid
7. **Test 8A–8D** — Epic Case 8 mechanical sub-tests in simulate-workflow-walkthrough.js
8. **Test 8E** — Re-claim path test (realistic Sink+Lease-at-end structure); if 8E RED, add surgical regex fix

## Out of Scope (explicit)

- No new subcommands or CLI flags
- No changes to `commands/*.md` files
- No `getMachineId` permission fix (config file, not lock/session — deferred)
- No regex simplification in M1 unless 8E test fails
- No stderr warning for invalid `claim_comment_id`
- No re-write mode changes at claim.js lines 290, 377, 444
- No `assert()` in cmdStatus INFO fix (use skip-on-invalid)
- No simulate-walkthrough.js structure refactor

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
