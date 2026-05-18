# Architect Output — Issue #84

## Files to Modify

| File | Changes | Why |
|------|---------|-----|
| `scripts/kaola-workflow-claim.js` | Fix `readPriorityConfig` path+key; add to `module.exports` | Implementation reads wrong file + key |
| `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` | Byte-identical copy via `cp` | validate-script-sync.js enforces identity |
| `scripts/simulate-workflow-walkthrough.js` | Add `testReadPriorityConfig` function + register call in `main()` | AC3 regression test |
| `CHANGELOG.md` | Prepend entry under `## [Unreleased]` | Document fix |

## Build Sequence

1. Fix `readPriorityConfig` body in `scripts/kaola-workflow-claim.js` (path + key)
2. Add `readPriorityConfig` to `module.exports` (alphabetical between `readActiveFolders` and `removeWorktree`)
3. `cp` to `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
4. Add `testReadPriorityConfig` function to `scripts/simulate-workflow-walkthrough.js`
5. Register `testReadPriorityConfig()` call in `main()` before the final `console.log`
6. Add CHANGELOG entry (independent, can do in parallel with above)

## Exact Changes

### Task 1+2: `scripts/kaola-workflow-claim.js`

Lines 62-70 replace:
```js
// OLD
function readPriorityConfig(root) {
  const file = path.join(root, '.kaola-workflow.json');
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed.top_tier_labels) ? parsed.top_tier_labels : ['P0', 'P1'];
  } catch (_) {
    return ['P0', 'P1'];
  }
}

// NEW
function readPriorityConfig(root) {
  const file = path.join(root, 'kaola-workflow', 'config.json');
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed.priority_top_tier_labels) ? parsed.priority_top_tier_labels : ['P0', 'P1'];
  } catch (_) {
    return ['P0', 'P1'];
  }
}
```

Lines 620-621 (module.exports): add `readPriorityConfig,` between `readActiveFolders,` and `removeWorktree,`

### Task 3: Sync

```bash
cp scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js
```

### Task 4+5: `scripts/simulate-workflow-walkthrough.js`

Add function before `async function main()` at line 967:
```js
function testReadPriorityConfig() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-priority-config-'));
  try {
    const { readPriorityConfig } = require('./kaola-workflow-claim');
    // Case 1: missing config → default
    const defaults = readPriorityConfig(tmpRoot);
    assert(Array.isArray(defaults) && defaults.length === 2 && defaults[0] === 'P0' && defaults[1] === 'P1',
      'missing config must return ["P0","P1"], got: ' + JSON.stringify(defaults));
    // Case 2: custom labels
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

Add call in `main()` at line 997 (between `await testSinkPrLeavesCleanWorktree();` and final `console.log`):
```js
    testReadPriorityConfig();
```

### Task 6: CHANGELOG

After `## [Unreleased]` header, insert:
```markdown
### Fixed — Priority Label Config Path and Key (issue #84)

- **`readPriorityConfig` in `scripts/kaola-workflow-claim.js`** (and byte-identical plugin copy): now reads `kaola-workflow/config.json` + `priority_top_tier_labels` instead of `.kaola-workflow.json` + `top_tier_labels`. Aligns implementation with documented contract in SKILL.md and `commands/workflow-init.md`.
- **`readPriorityConfig` exported** from `kaola-workflow-claim.js` for direct unit testing.
- **Regression test** (`testReadPriorityConfig`) in `scripts/simulate-workflow-walkthrough.js`: missing-file default, custom labels, non-array fallback.
```

## Validation

```bash
node scripts/validate-script-sync.js   # must print OK and exit 0
node scripts/simulate-workflow-walkthrough.js  # must include testReadPriorityConfig: PASSED and exit 0
```
