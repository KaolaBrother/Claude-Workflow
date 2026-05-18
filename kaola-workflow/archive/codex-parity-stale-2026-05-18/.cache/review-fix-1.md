# Review Fix 1: HIGH findings in claim.js

## Fixes Applied

### FIX-1 (HIGH): runBootstrapClaim args.runtime default
- `scripts/kaola-workflow-claim.js` line 314
- Changed `'--runtime', args.runtime` to `'--runtime', args.runtime || 'claude'`
- Prevents "undefined" string from being written to lock file when --runtime omitted

### FIX-2 (HIGH): runBootstrapSweep OFFLINE override removed
- `scripts/kaola-workflow-claim.js` lines 293-296
- Removed `env: Object.assign({}, process.env, { KAOLA_WORKFLOW_OFFLINE: '1' })` override
- Child now inherits parent's OFFLINE state; sweep is functional again

### FIX-3 (MEDIUM): --runtime allowlist validation
- `scripts/kaola-workflow-claim.js` in validateClaimArgs
- Added: `assert(!args.runtime || args.runtime === 'claude' || args.runtime === 'codex', '--runtime must be "claude" or "codex"')`

### FIX-4 (MEDIUM): Removed unused args param from pickFirstActionableIssue
- Signature changed from `(classifierScript, issues, args)` to `(classifierScript, issues)`
- Call site in runBootstrapClassify updated accordingly

### FIX-5 (MEDIUM): isSafeName guard added in runBootstrapClaim
- `scripts/kaola-workflow-claim.js` in runBootstrapClaim
- Added: `assert(isSafeName(pick.project), 'classifier returned unsafe project name: ' + pick.project)` before path.join

## Test additions
- `scripts/simulate-workflow-walkthrough.js`:
  - Case 8G-c: --runtime badvalue exits non-zero with clear error message (FIX-3 regression guard)
  - Case 8G-d: --runtime omitted defaults to 'claude' (FIX-1 regression guard)

## Validation Evidence
All three test suites pass:
- `node scripts/simulate-workflow-walkthrough.js` → "Workflow walkthrough simulation passed"
- `node scripts/validate-kaola-workflow-contracts.js` → "Kaola-Workflow contract validation passed"
- `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` → "Kaola-Workflow walkthrough simulation passed"
