# Advisor: claim-hardening Ideation Gate

## Overall Verdict
Option A endorsed. 4-mechanical + separate M1-verification split is correct.

## Correction: 8E test layout doesn't match reality

The planner proposed testing against `Project / Sink / Last Updated` layout. That never occurs in production. Real re-claim state file: `Project / Current Position / Pending Gates / ... / Last Updated` sections, then `## Sink` + `## Lease` appended AT THE END by `updateSinkLease`'s "## Sink doesn't exist" branch. The regex on re-claim always operates in `(Sink → Lease → EOF)` shape.

**Fix 8E to drive the realistic sequence:**
1. Create standard state file (Project, Current Position, etc., Last Updated)
2. Claim issue #3 → releases → creates Sink+Lease at end
3. Release
4. Claim issue #4 (re-claim path: regex replace)
5. Assert: `issue_number: 4`, fresh `claimed_at`, sibling sections preserved, exactly one `## Sink` and one `## Lease` present

**Optional 8E'**: Add a second sub-test for Sink with no following Lease (hand-edited state file) — exercises the `(?=...|$)` clause.

## Optional: S-L2 stderr warning (not blocking)
The planner's silent `'N/A'` fallback is consistent with line-386 but different semantic context. At line 123 (write point), hitting the guard means something upstream produced an unexpected `claim_comment_id` value. A one-line stderr warning would be consistent with M2's observability theme. Not a blocker; record as considered alternative.

## Confirmations (sound, no changes needed)
- Line 231 `{ mode: 0o600 }` on re-write is a no-op today but documents intent — defensible
- `fs.writeFileSync` mode-preserve on existing files is correct; 8A heartbeat check validates this
- Cross-platform mode skip with `process.platform !== 'win32'` is correct
- Skip-on-invalid for INFO is correct for read-only iteration semantics

## One missed risk: pre-existing 0o644 files
After this fix ships, existing `*.lock` and `*.json` session files on users' machines retain 0o644. The lock lifecycle is ephemeral (claim/release regenerates files), so this self-heals within days. Note under "Notes / Future Considerations" — do not add a migration.

## Net
Plan is ready for Phase 3 after fixing 8E test layout to mirror real state file structure.
