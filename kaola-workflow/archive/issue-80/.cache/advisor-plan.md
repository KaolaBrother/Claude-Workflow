# Advisor Plan Gate — Issue #80

## Issues Found (require architect revision)

### Issue 1: `verdict: owned` triggers wrong release

`selected_project` is populated for BOTH `verdict: acquired` AND `verdict: owned` (claim.js:373).
If a prior session left an active folder and freshness blocks, `[ -n "$KAOLA_PROJECT" ]` would release
the prior session's work — not "the just-claimed project."

Fix: also extract `KAOLA_CLAIM` and guard on `acquired`:
```bash
KAOLA_CLAIM="$(node -e "try{process.stdout.write(JSON.parse(process.argv[1]).claim||'')}catch(e){}" "$STARTUP_OUT" 2>/dev/null)" || true
[ "$KAOLA_CLAIM" = "acquired" ] && [ -n "$KAOLA_PROJECT" ] && node "$CLAIM_JS" release ...
```
Apply same guard in GitLab SKILL. Don't propagate the GitHub reference SKILL's latent gap.

### Issue 2: Test fixture for issue-604

`testFinalizeReleaseCleansWorktree` may use pre-populated mock fixtures for issues 601-603.
Must verify whether issue 604 needs to be added to the fixture array/stub before assuming `startup --target-issue 604` works.

### Minor

Line numbers drift fast. Re-read each block immediately before editing rather than relying on quoted snippets.

## Verdict

Blueprint needs revision on Issue 1 and Issue 2 before Phase 4 can proceed.
