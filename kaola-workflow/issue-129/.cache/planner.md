# Planner Output — Issue #129

## Task
Convert all 7 temporary `gh` shell shims in `scripts/simulate-workflow-walkthrough.js` from `#!/bin/sh` shell scripts to `#!/usr/bin/env node` Node.js scripts, eliminating macOS-specific hang in `npm test`.

## Approaches Evaluated

### Option A: Convert all shims to Node.js (`#!/usr/bin/env node`)
- **Summary**: Replace each `#!/bin/sh` + `case "$ARGS" in` block with `#!/usr/bin/env node` + `if/else if/else` using `process.argv.slice(2).join(' ')` and `process.stdout.write(...)`.
- **Pros**: Eliminates shell script execution entirely; no subprocess hang; deterministic; self-proving (if `npm test` completes, fix works); single-file change; no changes to claim.js or classifier.js.
- **Cons**: Requires node to be on PATH in the child processes' environment (precondition check required).
- **Risk**: Low — pure test-fixture substitution; production code untouched.
- **Complexity**: Small — mechanical translation of 7 shim sites.

### Option B: Add `timeout` to all `spawnSync` calls that exec shims
- **Summary**: Add `timeout: 10000` to each affected `spawnSync` call so the test suite doesn't hang indefinitely.
- **Pros**: Minimal code change.
- **Cons**: Partial mitigation only — tests still hang until timeout; adds 10s per hanging test; doesn't fix root cause; flaky on slow CI.
- **Risk**: Medium — doesn't prevent the hang, just limits its duration.
- **Complexity**: Small — but doesn't solve the problem.

### Option C: Use explicit `/bin/sh shim` invocation
- **Summary**: Instead of execing the shim directly, always invoke it via `spawnSync('/bin/sh', [shimPath, ...args])`.
- **Pros**: Avoids the macOS shebang hang.
- **Cons**: Requires changes to claim.js and classifier.js (which exec `gh` via PATH discovery, not via explicit shell). Not feasible without modifying production code.
- **Risk**: High — changes production execution path.
- **Complexity**: Large — cross-file changes, production code touched.

## Recommendation

**Option A** — Convert all shims to `#!/usr/bin/env node`.

Rationale:
- Fixes the root cause (macOS quarantine/hang on shell script direct exec via shebang).
- Self-proving: if `npm test` completes, the fix is correct.
- Single-file change (`scripts/simulate-workflow-walkthrough.js`).
- No production code changes.
- The 6-caller shared helper (`writeGhShimForStartup` at line 382) means converting it once covers 6 callers; 6 inline sites need individual conversion.

**Explicit items NOT to build**:
- Do NOT modify `scripts/kaola-workflow-claim.js`
- Do NOT modify `scripts/kaola-workflow-classifier.js`
- Do NOT modify GitLab/Gitea walkthrough scripts
- Do NOT add timeouts to spawnSync calls
- Do NOT add new files

**Missing facts / precondition check required**:
- Is `node` (i.e., `path.dirname(process.execPath)`) already on `process.env.PATH` in the child processes? If not, `#!/usr/bin/env node` shims will fail with "node: command not found". Must check before proceeding.
