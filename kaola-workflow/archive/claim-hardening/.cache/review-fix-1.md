# Review Fix 1: H1 — cmdPatchBranch branch newline injection

## Finding
HIGH (security-reviewer): `cmdPatchBranch` validation at lines 371-372 did not block `\n`/`\r` in
the `--branch` argument. A newline-containing branch name would be written via `content.replace()`
into workflow-state.md, enabling markdown section injection (same class as S-L2/INFO).

## Fix (tdd-guide)

**File:** `scripts/kaola-workflow-claim.js`, lines 371-373

Before:
```javascript
assert(typeof args.branch === 'string' && args.branch.length > 0
    && !args.branch.includes('\0') && args.branch !== '.' && args.branch !== '..', '--branch is invalid');
```

After:
```javascript
assert(typeof args.branch === 'string' && args.branch.length > 0
    && !args.branch.includes('\0') && !args.branch.includes('\n') && !args.branch.includes('\r')
    && args.branch !== '.' && args.branch !== '..', '--branch is invalid');
```

**Test added:** `scripts/simulate-workflow-walkthrough.js` — Test 8F (Epic Case 8)
Passes `--branch 'main\n## Lease\nsession_id: injected'`, asserts exit code !== 0.

## Validation

RED evidence: `AssertionError: 8F: patch-branch must reject branch names containing newline` (status 1)
GREEN evidence: `node scripts/simulate-workflow-walkthrough.js` exits 0, prints "Workflow walkthrough simulation passed"

## Date
2026-05-15T03:30:00Z
