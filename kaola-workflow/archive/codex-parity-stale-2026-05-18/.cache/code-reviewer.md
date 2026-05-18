# Code Review: codex-parity Phase 4

## Summary
| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 2 |
| MEDIUM | 3 (+ 1 test gap) |
| LOW | 2 |

## HIGH Findings

### HIGH-1: args.runtime defaults to "undefined" string when --runtime omitted in cmdBootstrap
File: scripts/kaola-workflow-claim.js, line 315
`runBootstrapClaim` builds spawn args array with `'--runtime', args.runtime` unconditionally. When `--runtime` is omitted from bootstrap invocation, `args.runtime` is `undefined`, which coerces to the string `"undefined"` in the args array. The child claim process receives `--runtime undefined`, which passes through `buildLockData`'s `args.runtime || 'claude'` truthy check (since `"undefined"` is truthy), writing `runtime: "undefined"` to the lock file.
Fix: `'--runtime', args.runtime || 'claude'` in runBootstrapClaim.

### HIGH-2: runBootstrapSweep is a guaranteed no-op — dead code
File: scripts/kaola-workflow-claim.js, lines 291-299
`runBootstrapSweep` passes `KAOLA_WORKFLOW_OFFLINE: '1'` to the child process. Inside `cmdSweep`, `isRemoteStale` returns `false` for all locks when OFFLINE is set. So every lock is skipped and nothing is ever deleted. The function does nothing.
Fix: Remove the `KAOLA_WORKFLOW_OFFLINE: '1'` override so the child inherits the parent's OFFLINE state. In true OFFLINE mode, sweep correctly skips remote checks; in ONLINE mode, it performs the intended cleanup.

## MEDIUM Findings

### MEDIUM-1: No allowlist validation on --runtime flag value
File: scripts/kaola-workflow-claim.js, lines 92, 243-244
`--sink` is validated to `merge|pr`. `--runtime` accepts any string. Known valid values are `claude` and `codex`. Should validate in `validateClaimArgs`.

### MEDIUM-2: pickFirstActionableIssue accepts args parameter it never uses
File: scripts/kaola-workflow-claim.js, line 272
The `args` parameter is passed but never referenced in the function body. Violates YAGNI.

### MEDIUM-3: pick.project used in path construction without parent-side isSafeName check
File: scripts/kaola-workflow-claim.js, lines 319-321
`pick.project` flows from roadmap.js stdout into `path.join(getRoot(), 'kaola-workflow', pick.project, '.cache', ...)`. The child claim validates via `isSafeName`, but parent path construction runs after `execFileSync` which only throws if the child exits non-zero. Should add `assert(isSafeName(pick.project), ...)` before path.join.

### MEDIUM (test gap): No test for bootstrap without --runtime
Case 5d invokes bootstrap without testing the default runtime fallback. A test should call bootstrap without --runtime and assert lock runtime === 'claude'.

## LOW Findings

### LOW-1: acquirePidFile returns open fd used as non-null sentinel
### LOW-2: cmdWatchPr slightly exceeds 50-line guideline (~54 lines)

## Documentation Files
No findings — skill SKILL.md updates are structurally sound.
