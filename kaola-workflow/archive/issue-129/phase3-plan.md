# Phase 3 - Plan: issue-129

## Blueprint

### Files to Create
None.

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `scripts/simulate-workflow-walkthrough.js` | PATH fix (Task 0) + 7 shim conversions (Tasks 1-7) | Fix macOS hang; enable #!/usr/bin/env node shims |

### Build Sequence
1. Task 0: PATH fix — prepend `path.dirname(process.execPath)` in 4 spawnSync call sites (required before any shim conversion)
2. Task 1: Convert `writeGhShimForStartup` helper (line 382) — shared helper, 6 callers fixed
3. Task 2: Convert inline shim at line 338 (`testClassifierClosedIssueResidueIgnored`)
4. Task 3: Convert inline shim at line 481 (`testClassifierCurrentClaimMarkerBlocks`)
5. Task 4: Convert inline shim at line 514 (`testWatchPrArchivesClosedIssuePrFolder`)
6. Task 5: Convert inline shim at line 909 (`testStatusShowsClosedIssueDrift`)
7. Task 6: Convert inline shim at line 1235 (`testE2EGitHubPrFullChain`)
8. Task 7: Convert inline shim at line 1317 (`testParallelIssueIndependence`)

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| serial | 0→1→2→3→4→5→6→7 | All in same file; applied sequentially to avoid conflicts |

### External Dependencies
None — all changes use existing `path`, `fs`, `process.argv`, `process.stdout` already in the file.

## Task List

### Task 0: PATH Fix
- File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/simulate-workflow-walkthrough.js`
- Depends On: none
- Action: MODIFY
- Implement: In `runClaimOnline` (line 414) and `runClaimOnlineLastJson` (line 432), change:
  ```js
  PATH: binDir + path.delimiter + (process.env.PATH || '')
  ```
  to:
  ```js
  PATH: binDir + path.delimiter + path.dirname(process.execPath) + path.delimiter + (process.env.PATH || '')
  ```
  Also apply the same pattern to the two inline `spawnSync` calls:
  - Line 356: `testClassifierClosedIssueResidueIgnored` inline spawnSync
  - Line 497: `testClassifierCurrentClaimMarkerBlocks` inline spawnSync
- Validate: `node scripts/simulate-workflow-walkthrough.js` must exit 0

### Task 1: Convert `writeGhShimForStartup` helper (line 382)
- File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/simulate-workflow-walkthrough.js`
- Depends On: Task 0
- Action: MODIFY
- Implement: Replace lines 383-394:
  ```js
  // BEFORE (shell):
  fs.writeFileSync(ghShim, [
    '#!/bin/sh', 'ARGS="$@"', 'case "$ARGS" in',
    '  *"repo view"*) echo \'{"owner":{"login":"test"},"name":"repo"}\' ;;',
    '  *"issue view"*) echo \'{"number":0,"title":"fixture","body":"README.md","labels":[],"state":"open"}\' ;;',
    '  *"api"*) echo \'[]\' ;;',
    '  *) echo "" ;;',
    'esac', ''
  ].join('\n'));
  ```
  with:
  ```js
  // AFTER (Node.js):
  fs.writeFileSync(ghShim, [
    '#!/usr/bin/env node',
    "const a = process.argv.slice(2).join(' ');",
    "if (a.includes('repo view')) { process.stdout.write('{\"owner\":{\"login\":\"test\"},\"name\":\"repo\"}\\n'); }",
    "else if (a.includes('issue view')) { process.stdout.write('{\"number\":0,\"title\":\"fixture\",\"body\":\"README.md\",\"labels\":[],\"state\":\"open\"}\\n'); }",
    "else if (a.includes('api')) { process.stdout.write('[\\n'); }",
    "else { process.stdout.write('\\n'); }"
  ].join('\n'));
  ```
  Keep `fs.chmodSync(ghShim, 0o755)` unchanged.
- Validate: `node scripts/simulate-workflow-walkthrough.js` must exit 0

### Task 2: Convert inline shim at line 338 (`testClassifierClosedIssueResidueIgnored`)
- File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/simulate-workflow-walkthrough.js`
- Depends On: Task 0
- Action: MODIFY
- Implement: Replace lines 338-352 (the writeFileSync block):
  ```js
  // BEFORE (shell):
  fs.writeFileSync(ghShim, [
    '#!/bin/sh', 'ARGS="$@"', 'case "$ARGS" in',
    '  *"issue view 80"*)', '    echo \'{"state":"closed"}\' ;;',
    '  *"issue view 81"*)', '    echo \'{"number":81,...}\' ;;',
    '  *"repo view"*)', '    echo \'{"owner":...}\' ;;',
    '  *)', '    echo \'[]\' ;;',
    'esac', ''
  ].join('\n'));
  ```
  with (Node.js, if/else if/else chain):
  ```js
  fs.writeFileSync(ghShim, [
    '#!/usr/bin/env node',
    "const a = process.argv.slice(2).join(' ');",
    "if (a.includes('issue view 80')) { process.stdout.write('{\"state\":\"closed\"}\\n'); }",
    "else if (a.includes('issue view 81')) { process.stdout.write('{\"number\":81,\"title\":\"unrelated\",\"body\":\"commands/something.md\",\"labels\":[],\"state\":\"open\"}\\n'); }",
    "else if (a.includes('repo view')) { process.stdout.write('{\"owner\":{\"login\":\"test\"},\"name\":\"repo\"}\\n'); }",
    "else { process.stdout.write('[\\n'); }"
  ].join('\n'));
  ```
  NOTE: `issue view 80` must come before `issue view 81` and before `issue view` to preserve first-match semantics. Both specific patterns come before any generic fallback.
- Validate: `node scripts/simulate-workflow-walkthrough.js` must exit 0

### Task 3: Convert inline shim at line 481 (`testClassifierCurrentClaimMarkerBlocks`)
- File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/simulate-workflow-walkthrough.js`
- Depends On: Task 0
- Action: MODIFY
- Implement: Replace lines 482-492 (the writeFileSync block):
  ```js
  fs.writeFileSync(ghShim, [
    '#!/usr/bin/env node',
    "const a = process.argv.slice(2).join(' ');",
    "if (a.includes('repo view')) { process.stdout.write('{\"owner\":{\"login\":\"test\"},\"name\":\"repo\"}\\n'); }",
    "else if (a.includes('issue view 504')) { process.stdout.write('{\"number\":504,\"title\":\"claimed\",\"body\":\"README.md\",\"labels\":[],\"state\":\"open\"}\\n'); }",
    "else if (a.includes('api repos/test/repo/issues/504/comments')) { process.stdout.write('[{\"body\":\"<!-- kw:claim project=issue-504 -->\",\"updated_at\":\"2099-01-01T00:00:00Z\"}]\\n'); }",
    "else { process.stdout.write('[\\n'); }"
  ].join('\n'));
  ```
  NOTE: `repo view` must come before `issue view 504` to avoid false match (issue view doesn't contain "repo view"). The api pattern must come last before wildcard.
- Validate: `node scripts/simulate-workflow-walkthrough.js` must exit 0

### Task 4: Convert inline shim at line 514 (`testWatchPrArchivesClosedIssuePrFolder`)
- File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/simulate-workflow-walkthrough.js`
- Depends On: Task 0
- Action: MODIFY
- Implement: Replace lines 514-525 (the writeFileSync block, note: `path.join(binDir, 'gh')` not a variable):
  ```js
  fs.writeFileSync(path.join(binDir, 'gh'), [
    '#!/usr/bin/env node',
    "const a = process.argv.slice(2).join(' ');",
    "if (a.includes('issue view 200')) { process.stdout.write('{\"state\":\"closed\"}\\n'); }",
    "else if (a.includes('pr view')) { process.stdout.write('{\"state\":\"MERGED\",\"number\":1}\\n'); }",
    "else if (a.includes('repo view')) { process.stdout.write('{\"owner\":{\"login\":\"test\"},\"name\":\"repo\"}\\n'); }",
    "else { process.stdout.write('[\\n'); }"
  ].join('\n'));
  ```
- Validate: `node scripts/simulate-workflow-walkthrough.js` must exit 0

### Task 5: Convert inline shim at line 909 (`testStatusShowsClosedIssueDrift`)
- File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/simulate-workflow-walkthrough.js`
- Depends On: Task 0
- Action: MODIFY
- Implement: Replace lines 909-919 (the writeFileSync block):
  ```js
  fs.writeFileSync(path.join(binDir, 'gh'), [
    '#!/usr/bin/env node',
    "const a = process.argv.slice(2).join(' ');",
    "if (a.includes('issue view 100')) { process.stdout.write('{\"state\":\"open\"}\\n'); }",
    "else if (a.includes('issue view 200')) { process.stdout.write('{\"state\":\"closed\"}\\n'); }",
    "else { process.stdout.write('[\\n'); }"
  ].join('\n'));
  ```
- Validate: `node scripts/simulate-workflow-walkthrough.js` must exit 0

### Task 6: Convert inline shim at line 1235 (`testE2EGitHubPrFullChain`)
- File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/simulate-workflow-walkthrough.js`
- Depends On: Task 0
- Action: MODIFY
- Implement: Replace lines 1235-1246 (the writeFileSync block):
  ```js
  fs.writeFileSync(path.join(binDir, 'gh'), [
    '#!/usr/bin/env node',
    "const a = process.argv.slice(2).join(' ');",
    "if (a.includes('repo view')) { process.stdout.write('{\"owner\":{\"login\":\"test\"},\"name\":\"repo\"}\\n'); }",
    "else if (a.includes('issue view')) { process.stdout.write('{\"number\":860,\"title\":\"pr-chain-fixture\",\"body\":\"README.md\",\"labels\":[],\"state\":\"open\"}\\n'); }",
    "else if (a.includes('pr view')) { process.stdout.write('{\"state\":\"MERGED\",\"number\":1}\\n'); }",
    "else if (a.includes('api')) { process.stdout.write('[\\n'); }",
    "else { process.stdout.write('\\n'); }"
  ].join('\n'));
  ```
- Validate: `node scripts/simulate-workflow-walkthrough.js` must exit 0

### Task 7: Convert inline shim at line 1317 (`testParallelIssueIndependence`)
- File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/simulate-workflow-walkthrough.js`
- Depends On: Task 0
- Action: MODIFY
- Implement: Replace lines 1317-1329 (the writeFileSync block):
  ```js
  fs.writeFileSync(path.join(binDir, 'gh'), [
    '#!/usr/bin/env node',
    "const a = process.argv.slice(2).join(' ');",
    "if (a.includes('repo view')) { process.stdout.write('{\"owner\":{\"login\":\"test\"},\"name\":\"repo\"}\\n'); }",
    "else if (a.includes('issue view 870')) { process.stdout.write('{\"number\":870,\"title\":\"feature-870\",\"body\":\"scripts/feature-870.js\",\"labels\":[],\"state\":\"open\"}\\n'); }",
    "else if (a.includes('issue view 871')) { process.stdout.write('{\"number\":871,\"title\":\"feature-871\",\"body\":\"scripts/feature-871.js\",\"labels\":[],\"state\":\"open\"}\\n'); }",
    "else if (a.includes('api')) { process.stdout.write('[\\n'); }",
    "else { process.stdout.write('\\n'); }"
  ].join('\n'));
  ```
  NOTE: `issue view 870` must come before `issue view 871` (both before any generic `issue view` fallback); `repo view` first.
- Validate: `node scripts/simulate-workflow-walkthrough.js` must exit 0

## Advisor Notes
Advisor confirmed Option A. Critical finding: node NOT on child-process PATH; must prepend `path.dirname(process.execPath)` in 4 locations. Conversion invariants: `if/else if/else` chain (first-match), keep `chmodSync(0o755)`. See `.cache/advisor-ideation.md`.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | N/A | | Single-file mechanical conversion; patterns fully documented in phase1 code-explorer; no new architecture |
| advisor plan gate | invoked | .cache/advisor-ideation.md | advisor confirmed approach in Phase 2 |
| architect revisions | N/A | | No blueprint gaps; plan is mechanically derived from phase1 shim table |
