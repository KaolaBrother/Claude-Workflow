# Code Explorer Output — Issue #129

## Summary

All macOS-hang-vulnerable `gh` shims are in `scripts/simulate-workflow-walkthrough.js` only. There are 7 shim write sites, all using the same `#!/bin/sh`/`case "$ARGS"` pattern. The shims are NOT directly invoked by the walkthrough — they are placed as executables on a temp `binDir/gh` PATH prefix, then discovered and exec'd by Node child processes running `kaola-workflow-claim.js` or `kaola-workflow-classifier.js`. The macOS hang occurs during this exec path (`/bin/sh /tmp/.../bin/gh issue view 504`). The fix is to convert all shims from shell scripts to Node.js scripts (`#!/usr/bin/env node`), eliminating shell script execution entirely.

## Shim Sites (all in `scripts/simulate-workflow-walkthrough.js`)

| Line | Function | Cases |
|------|----------|-------|
| 338–353 | `testClassifierClosedIssueResidueIgnored` | issue 80 (closed), issue 81 (open), repo view, wildcard `[]` |
| 382–394 | `writeGhShimForStartup` (shared helper) | repo view, issue view (generic fixture), api, wildcard `""` |
| 481–493 | `testClassifierCurrentClaimMarkerBlocks` | repo view, issue view 504, api with specific endpoint, wildcard `[]` |
| 514–525 | `testWatchPrArchivesClosedIssuePrFolder` | issue view 200 (closed), pr view (MERGED), repo view, wildcard `[]` |
| 909–919 | `testStatusShowsClosedIssueDrift` | issue view 100 (open), issue view 200 (closed), wildcard `[]` |
| 1235–1247 | `testE2EGitHubPrFullChain` | repo view, issue view 860, pr view (MERGED), api, wildcard `""` |
| 1317–1329 | `testParallelIssueIndependence` | repo view, issue view 870, issue view 871, api, wildcard `""` |

## Shim Pattern (Shell — current, broken on macOS)

```js
fs.writeFileSync(ghShim, [
  '#!/bin/sh',
  'ARGS="$@"',
  'case "$ARGS" in',
  '  *"repo view"*) echo \'{"owner":{"login":"test"},"name":"repo"}\' ;;',
  '  *"issue view"*) echo \'{"number":0,...}\' ;;',
  '  *) echo \'\' ;;',
  'esac',
  ''
].join('\n'));
fs.chmodSync(ghShim, 0o755);
```

## Shim Pattern (Node.js — replacement)

```js
fs.writeFileSync(ghShim, [
  '#!/usr/bin/env node',
  'const a = process.argv.slice(2).join(\' \');',
  'if (a.includes(\'repo view\')) process.stdout.write(\'{"owner":{"login":"test"},"name":"repo"}\\n\');',
  'else if (a.includes(\'issue view\')) process.stdout.write(\'{"number":0,...}\\n\');',
  'else process.stdout.write(\'\'  + \'\\n\');',
].join('\n'));
fs.chmodSync(ghShim, 0o755);
```

Key translation rules:
- `#!/bin/sh` → `#!/usr/bin/env node`
- `ARGS="$@"` → `const a = process.argv.slice(2).join(' ');` (at top of each shim)
- `*"pattern"*) echo '...' ;;` → `if (a.includes('pattern')) process.stdout.write('...\n');`
- `*) echo '[]' ;;` (wildcard) → `else process.stdout.write('[]\n');`
- `*) echo '' ;;` (wildcard) → `else process.stdout.write('\n');` or just omit (no output)

Shell `case` patterns are glob-style (`*"..."*`). Node `.includes()` is exactly equivalent for substring matching of a space-joined arg string.

## Invocation Pattern

Child processes are spawned as:
```js
spawnSync(process.execPath, [classifierScript, 'classify', '--issue', '81'], {
  env: { PATH: binDir + path.delimiter + process.env.PATH }
})
```

The Node child process running claim.js/classifier.js discovers `gh` via PATH resolution. It invokes it as a subprocess (likely via `execFileSync('gh', args)` or similar inside claim.js). The OS executes `binDir/gh` via shebang. On macOS, `#!/bin/sh` shebang execution of a temp file hangs; `#!/usr/bin/env node` does not.

## Confirmed: Only `scripts/simulate-workflow-walkthrough.js` affected

- GitLab/Gitea walkthroughs (`simulate-gitlab-workflow-walkthrough.js`, `simulate-gitea-workflow-walkthrough.js`): no `chmodSync`, no shim writes — not affected
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`: no shims
- `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js`: no shims

## Existing `/bin/sh` Invocation Pattern (line 151)

```js
const result = spawnSync('bash', [hookScript], { cwd: tmp, input: '', encoding: 'utf8' });
```

This is the only use of an explicit interpreter for an external script. It is in `testHookSingleProjectGuard` and is already correct (explicit `bash` interpreter for a hook shell script, not a shim).

## Timeout/Signal Handling

None. No `timeout:` field in any `spawnSync` call. Adding timeouts is a partial mitigation; Node.js shims are the proper fix.

## writeGhShimForStartup Callers

The shared helper is called by:
- `testStartupJsonAndSiblingWorktrees` (line 447)
- `testFinalizeReleaseCleansWorktree` (line 599)
- `testFinalizeFromLinkedWorktreeCleansMainCopy` (line 636)
- `testReleaseFromLinkedWorktreeCleansMainCopy` (line 717)
- `testE2EGitHubMergeFullChain` (line 1020)
- `testFastE2EMergeFullChain` (line 1136)

Fixing `writeGhShimForStartup` once fixes all 6 callers. The 6 inline shim writes (lines 338, 481, 514, 909, 1235, 1317) each need individual conversion.

## Write Set

- `scripts/simulate-workflow-walkthrough.js` (only this file)
- No changes to: `scripts/kaola-workflow-claim.js`, `scripts/kaola-workflow-classifier.js`, or any other script
