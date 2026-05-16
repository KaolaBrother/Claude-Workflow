## Task 4 (PR1-C-7): Update projectOwner() lock file path in kaola-workflow-repair-state.js

### Change Summary

**File modified:** `scripts/kaola-workflow-repair-state.js`

**Function updated:** `projectOwner(workflowDir, project)` (around line 80)

**What changed:**
- Replaced the hard-coded legacy lock path with a two-path lookup strategy.
- The function now derives `coordRoot` inline using `require('child_process').execFileSync('git', ['rev-parse', '--git-common-dir'])` run from `repoRoot` (the parent of `workflowDir`).
- It first tries `path.join(coordRoot, 'kaola-workflow', '.locks', project + '.lock')` (new location).
- If that path does not exist (`fs.existsSync` check), it falls back to the legacy path `path.join(workflowDir, '.locks', project + '.lock')`.
- The entire coordRoot derivation is wrapped in try/catch; on any error the function falls back to the legacy lock path, preserving existing behavior.
- `require('child_process')` is used inline (not added as a top-level import) because repair-state.js only imports `fs` and `path` at the top level.

### TDD Validation

**Before change:** `node scripts/simulate-workflow-walkthrough.js` exited 0 (baseline confirmed).

**After change:** `node scripts/simulate-workflow-walkthrough.js` exited 0.

Output: `Workflow walkthrough simulation passed`
