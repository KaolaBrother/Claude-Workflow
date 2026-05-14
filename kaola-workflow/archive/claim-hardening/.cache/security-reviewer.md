# Security Review: claim-hardening Phase 4 Changes

## Scope
Files reviewed: `scripts/kaola-workflow-claim.js`, `scripts/simulate-workflow-walkthrough.js`
Changes: S-L1a/b/c (file permissions), M2 (stderr warn), S-L2 (claim_comment_id), INFO (isSafeName guard), H1 (branch newline injection fix)

## Initial Review (Pre-H1-Fix)

### HIGH Finding: H1 — `--branch` newline injection in cmdPatchBranch

`cmdPatchBranch` validation at lines 371-372 blocked `\0` but not `\n`/`\r`. A branch name
containing a newline would be written via `content.replace(/^branch:.*$/m, ...)` into
workflow-state.md (line 386), enabling arbitrary markdown section injection.

Attack vector: CLI argument `--branch 'main\n## Lease\nsession_id: attacker'`
Impact: Injects fake lease section into workflow-state.md, potentially hijacking session state

Same injection class as S-L2 (claim_comment_id) and INFO (session_id path traversal).

### No CRITICAL findings
### No other HIGH findings in Phase 4 changes

## Re-Review (Post-H1-Fix)

### H1: RESOLVED
Fix at lines 371-373:
```javascript
assert(typeof args.branch === 'string' && args.branch.length > 0
    && !args.branch.includes('\0') && !args.branch.includes('\n') && !args.branch.includes('\r')
    && args.branch !== '.' && args.branch !== '..', '--branch is invalid');
```
The downstream `.replace()` at line 387 uses the function form (arrow), which prevents `$&`/`$1` expansion.
Lock file persistence via `JSON.stringify` escapes control characters.
`gh issue comment --body` path uses `execFileSync` positional arg (not shell), so no shell injection.

### Phase 4 changes — no regressions
- S-L1a/b/c (0o600 modes): Correct. Atomic creation with `wx` flag prevents race.
- M2 (stderr diagnostic): Correct, no info leak.
- S-L2 (digit-only regex on claim_comment_id): Correctly prevents `gh` flag injection.
- INFO (isSafeName in cmdStatus map): Correctly prevents path-composition attack.

### LOW Finding: updateSinkLease string-form replace (parity gap)
`updateSinkLease` (lines 133-137) uses the string second-arg form of `.replace()` with
`lockData.project` and `lockData.session_id` values. If those values contain `$&`/`$1`
they would be expanded by JS replacement string substitution.

Severity: LOW — attack requires controlling fields already guarded by `isSafeName` in the call path.
Recommended fix: convert both `.replace()` calls to function-form callbacks (same pattern as line 387).
Not blocking for Phase 6.

## Summary

| Finding | Severity | Status |
|---------|----------|--------|
| H1: branch newline injection in cmdPatchBranch | HIGH | RESOLVED |
| S-L1a/b/c, M2, S-L2, INFO guard | — | No regressions |
| updateSinkLease string-form replace | LOW | Follow-up item |

## Date
2026-05-15T03:35:00Z
