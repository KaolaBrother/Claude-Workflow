# TDD Task 1 Evidence: Add --runtime flag and bootstrap subcommand to claim.js

## Modified Files
- `scripts/kaola-workflow-claim.js` (646 → 724 lines)
- `scripts/simulate-workflow-walkthrough.js` (minimal runtime assertion added)

## RED Evidence
```
Error: 8G-a: lock must include runtime=claude by default, got: undefined
```
Test failed before implementation as expected.

## GREEN Evidence
```
Workflow walkthrough simulation passed
Lines: 724 OK
```
Full validation command passed: `node scripts/simulate-workflow-walkthrough.js && node -e "...line count check..."`

## Implementation Summary

1. `parseArgs` (line 92): Added `--runtime` flag handler.
2. `buildLockData` (line 260): Added `runtime: args.runtime || 'claude'`.
3. `listOpenIssues(cwd)` (line 264): Lists open GitHub issues; returns [] in OFFLINE mode or on error.
4. `pickFirstActionableIssue(classifierScript, issues, args)` (line 272): Iterates issues, calls classifier, returns first green/yellow pick with project name.
5. `runBootstrapSweep(claimScript, cwd)` (line 291): Runs sweep with OFFLINE=1, swallows errors.
6. `runBootstrapWatchPr(claimScript, cwd)` (line 301): No-op in OFFLINE mode; runs watch-pr online.
7. `runBootstrapClassify(classifierScript, args)` (line 308): Guards OFFLINE/file-exists, calls helpers.
8. `runBootstrapClaim(claimScript, args, pick)` (line 314): Claims with --runtime, appends parallel-classifier.md on yellow.
9. `cmdBootstrap()` (line 326): Orchestrates sweep → watch-pr → classify → claim; exit 1 if no pick.
10. `main()` dispatcher (line 719): Registered `if (sub === 'bootstrap') return cmdBootstrap()`.

## Deviations
None. Write set: `scripts/kaola-workflow-claim.js` only (test file has minimal assertion addition).
