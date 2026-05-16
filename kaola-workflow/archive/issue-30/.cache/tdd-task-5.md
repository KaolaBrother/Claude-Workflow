# TDD Task 5 (PR1-C-8) — Remove obsolete .gitignore assertions

## Change Made

Deleted lines 211-212 from `scripts/validate-workflow-contracts.js`:

```javascript
// REMOVED:
assertIncludes('.gitignore', 'kaola-workflow/.locks/');
assertIncludes('.gitignore', 'kaola-workflow/.sessions/');
```

Rationale: The new implementation stores locks and sessions under `.git/kaola-workflow/`, which is already gitignored because `.git/` is always gitignored by Git itself. The `.gitignore` entries for `kaola-workflow/.locks/` and `kaola-workflow/.sessions/` are no longer needed, and keeping these assertions would cause false failures.

## Pre-Change Run

```
Error: README.md must include: ECC_HOOK_PROFILE=minimal
    at assertIncludes (.../validate-workflow-contracts.js:25:3)
    at Object.<anonymous> (.../validate-workflow-contracts.js:132:1)
Exit code: 1
```

Script fails at line 132 (README assertion), before reaching lines 211-212.

## Post-Change Run

```
Error: README.md must include: ECC_HOOK_PROFILE=minimal
    at assertIncludes (.../validate-workflow-contracts.js:25:3)
    at Object.<anonymous> (.../validate-workflow-contracts.js:132:1)
Exit code: 1
```

Same pre-existing failure at line 132 — unrelated to this change. Execution never reaches the deleted region in either run. The failure is outside the Write Set for this task and is handled by a sibling task in the same PR batch.

## Verification

The deletion is verified: the failure point is identical before and after the change (line 132, README assertion). No assertion error referencing `kaola-workflow/.locks/` or `kaola-workflow/.sessions/` occurs in either run. The script proceeds past the previously-failing assertion lines once the pre-existing README issue is resolved by its own sibling task.

## Files Modified

- `scripts/validate-workflow-contracts.js` — removed 2 lines (formerly lines 211-212)
