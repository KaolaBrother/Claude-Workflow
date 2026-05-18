# Phase 3 - Plan: issue-84

## Blueprint

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `scripts/kaola-workflow-claim.js` | Fix `readPriorityConfig` path+key; add to `module.exports` | Implementation reads wrong file + key |
| `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` | Byte-identical copy via `cp` | validate-script-sync.js enforces identity |
| `scripts/simulate-workflow-walkthrough.js` | Add `testReadPriorityConfig` + register call in `main()` | AC3 regression test |
| `CHANGELOG.md` | Prepend entry under `## [Unreleased]` (header exists at line 3) | Document fix |

### Build Sequence
1. Write failing test `testReadPriorityConfig` + register call (RED against current code)
2. Fix `readPriorityConfig` body: path → `'kaola-workflow', 'config.json'`; key → `priority_top_tier_labels`
3. Add `readPriorityConfig` to `module.exports` (alphabetical: between `readActiveFolders` and `removeWorktree`)
4. `cp` to plugin copy for byte-identity
5. Validate: `node scripts/validate-script-sync.js` + `node scripts/simulate-workflow-walkthrough.js`
6. Add CHANGELOG entry (independent)

### External Dependencies
- None

## Task List

### Task 1: Fix readPriorityConfig + regression test (single TDD cycle)
- **File:** `scripts/kaola-workflow-claim.js`
- **Test File:** `scripts/simulate-workflow-walkthrough.js`
- **Write Set:**
  - `scripts/kaola-workflow-claim.js` lines 62-70 (`readPriorityConfig` body)
  - `scripts/kaola-workflow-claim.js` lines 619-622 (`module.exports` — add `readPriorityConfig`)
  - `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` (byte-identical copy via `cp`)
  - `scripts/simulate-workflow-walkthrough.js` (add `testReadPriorityConfig` function + `main()` call)
  - `CHANGELOG.md` (prepend entry under `## [Unreleased]`)
- **Depends On:** none
- **Parallel Group:** serial
- **Action:** MODIFY
- **Implement:**
  - In `scripts/simulate-workflow-walkthrough.js` before `async function main()`, add:
    ```js
    function testReadPriorityConfig() {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-priority-config-'));
      try {
        const { readPriorityConfig } = require('./kaola-workflow-claim');
        // Case 1: missing config → default ['P0','P1']
        const defaults = readPriorityConfig(tmpRoot);
        assert(Array.isArray(defaults) && defaults.length === 2 && defaults[0] === 'P0' && defaults[1] === 'P1',
          'missing config must return ["P0","P1"], got: ' + JSON.stringify(defaults));
        // Case 2: kaola-workflow/config.json with priority_top_tier_labels → custom labels
        fs.mkdirSync(path.join(tmpRoot, 'kaola-workflow'), { recursive: true });
        fs.writeFileSync(path.join(tmpRoot, 'kaola-workflow', 'config.json'),
          JSON.stringify({ priority_top_tier_labels: ['critical', 'hotfix'] }));
        const custom = readPriorityConfig(tmpRoot);
        assert(Array.isArray(custom) && custom.length === 2 && custom[0] === 'critical' && custom[1] === 'hotfix',
          'custom labels must be ["critical","hotfix"], got: ' + JSON.stringify(custom));
        // Case 3: non-array value → default
        fs.writeFileSync(path.join(tmpRoot, 'kaola-workflow', 'config.json'),
          JSON.stringify({ priority_top_tier_labels: 'not-an-array' }));
        const nonArray = readPriorityConfig(tmpRoot);
        assert(Array.isArray(nonArray) && nonArray[0] === 'P0',
          'non-array value must fall back to ["P0","P1"], got: ' + JSON.stringify(nonArray));
      } finally {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
      }
      console.log('testReadPriorityConfig: PASSED');
    }
    ```
  - Add `testReadPriorityConfig();` in `main()` between `await testSinkPrLeavesCleanWorktree();` and `console.log('Workflow walkthrough simulation passed')`
  - Fix `readPriorityConfig` in `scripts/kaola-workflow-claim.js`:
    - Line 63: `path.join(root, '.kaola-workflow.json')` → `path.join(root, 'kaola-workflow', 'config.json')`
    - Line 66: `parsed.top_tier_labels` → `parsed.priority_top_tier_labels`
  - Add `readPriorityConfig,` to `module.exports` between `readActiveFolders,` and `removeWorktree,`
  - `cp` to plugin copy
  - Prepend CHANGELOG entry
- **Mirror:** Pattern from `testFallbackGuardsAfterArchive` in GitLab walkthrough — tmpdir fixture, arrange/act/assert, direct module `require()`
- **Validate:**
  ```bash
  node scripts/validate-script-sync.js
  node scripts/simulate-workflow-walkthrough.js
  ```
  Both must exit 0. Output must include `testReadPriorityConfig: PASSED`.

## Advisor Notes

Phase 2 advisor gate pinned scope. Phase 3 advisor gate satisfied by same evidence (`.cache/advisor-ideation.md`). No gaps found — surgical 2-line change with direct test pattern.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | skipped | .cache/advisor-ideation.md | scope pinned in Phase 2 advisor pass; Phase 3 advisor confirms no blockers |
| architect revisions | N/A | | plan complete on first pass |
