# Phase 1 - Research / Discovery: issue-129

## Deliverable

Convert all 7 temporary `gh` shell shim scripts in `scripts/simulate-workflow-walkthrough.js` from `#!/bin/sh` shell scripts to `#!/usr/bin/env node` Node.js scripts, eliminating macOS-specific hang in `npm test`.

## Why

On macOS, `npm test` hangs inside `scripts/simulate-workflow-walkthrough.js` when a `gh` shell shim (written to a temp dir via `fs.writeFileSync` + `chmodSync`) is executed via its `#!/bin/sh` shebang by a Node child process. The same shim executed via `/bin/sh <shim>` returns immediately. Converting shims to Node.js eliminates shell script execution entirely and makes the walkthrough deterministic.

## Affected Area

- `scripts/simulate-workflow-walkthrough.js` — all 7 shim write sites; no other file changes needed

## Key Patterns Found

1. **Shim creation pattern** (current, broken on macOS):
   ```js
   fs.writeFileSync(ghShim, ['#!/bin/sh', 'ARGS="$@"', 'case "$ARGS" in', ...].join('\n'));
   fs.chmodSync(ghShim, 0o755);
   ```
   Found at lines 338, 382 (`writeGhShimForStartup`), 481, 514, 909, 1235, 1317.

2. **Replacement Node.js shim pattern**:
   ```js
   fs.writeFileSync(ghShim, [
     '#!/usr/bin/env node',
     "const a = process.argv.slice(2).join(' ');",
     "if (a.includes('repo view')) process.stdout.write('{...}\\n');",
     "else if (a.includes('issue view')) process.stdout.write('{...}\\n');",
     "else process.stdout.write('[]\\n');"
   ].join('\n'));
   fs.chmodSync(ghShim, 0o755);
   ```
   Shell `ARGS="$@"` → `const a = process.argv.slice(2).join(' ')` (identical semantics)
   Shell `*"pattern"*)` → `.includes('pattern')` (equivalent substring matching)
   Shell `echo 'json'` → `process.stdout.write('json\n')` (identical output)
   `chmodSync(+x)` must be kept — PATH discovery requires executable bit.

3. **Invocation path**:
   ```js
   spawnSync(process.execPath, [claimScript, ...args], {
     env: { PATH: binDir + path.delimiter + process.env.PATH }
   })
   ```
   Node child runs `claim.js`; claim.js invokes `gh` via PATH; OS execs the shim. No changes to claim.js or classifier.js needed.

4. **`writeGhShimForStartup` is a shared helper** (line 380–394) called by 6 functions. Converting it once fixes all 6 callers.

5. **GitLab/Gitea walkthroughs are not affected** — no `chmodSync` or shim writes in `simulate-gitlab-workflow-walkthrough.js` or `simulate-gitea-workflow-walkthrough.js`.

## Test Patterns

- Framework: hand-rolled assert (no external framework)
- Location: `scripts/simulate-workflow-walkthrough.js` — self-contained integration test
- Validation: `node scripts/simulate-workflow-walkthrough.js` must exit 0; `npm test` must complete without hanging
- The fix is self-proving: if `npm test` completes, the hang is fixed

## Config & Env

- `KAOLA_WORKFLOW_OFFLINE=0` — used in shim-spawning tests to force online path (shims provide fake `gh`)
- No new env vars needed

## External Docs

None required. `#!/usr/bin/env node` and `process.argv` are standard Node.js.

## GitHub Issue

KaolaBrother/Kaola-Workflow#129

## Completeness Score

10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | internal Node.js patterns; no external library behavior needed |

## Notes / Future Considerations

- The 6 inline shim sites (lines 338, 481, 514, 909, 1235, 1317) each have unique case patterns and must be converted individually.
- `writeGhShimForStartup` has the generic pattern used by 6 callers — converting it once covers all.
- `chmodSync` lines are retained (executable bit still required for PATH discovery).
- No timeout changes needed — eliminating the shell execution fixes the root cause.
