# TDD Task 1 — claim.js CWD guard + drift detection

## Modified Files
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js`

## Changes Applied

### Gap 1 — cwdInside helper (line 434)
```js
function cwdInside(target) {
  const cwd = fs.realpathSync(process.cwd());
  const real = fs.realpathSync(target);
  return cwd === real || cwd.startsWith(real + path.sep);
}
```

### Gap 1 — cmdRelease guard (lines 445-448)
Inserted after not-found guard, before archiveProjectDir:
```js
if (cwdInside(folder.project_dir)) {
  output({ released: false, reason: 'refusing to discard current working directory' }, 1);
  return;
}
```

### Gap 2 — partitionActiveAndDrift (lines 455-463)
```js
function partitionActiveAndDrift(root) {
  const all = readActiveFolders(root, { excludeClosedIssues: false });
  const active = [], drift = [];
  for (const folder of all) {
    if (folder.issue_iid != null && issueIsClosed(folder.issue_iid)) drift.push(folder);
    else active.push(folder);
  }
  return { active, drift };
}
```

### Gap 2 — cmdStatus rewrite (lines 465-469)
```js
function cmdStatus() {
  const root = getRoot();
  const { active, drift } = partitionActiveAndDrift(root);
  output({ active, drift, count: active.length });
}
```

### module.exports — added partitionActiveAndDrift (line 611)

## RED Evidence
Pre-change baseline: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js` → "GitLab workflow script tests passed"
(New behavior tested in Task 4)

## GREEN Evidence
Post-change: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js` → "GitLab workflow script tests passed"
Main session validation (orchestrator): PASS

## Deviations
None. Write set not exceeded.
