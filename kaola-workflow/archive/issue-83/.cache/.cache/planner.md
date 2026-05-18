# Planner: Issue #83 — GitLab Merge Path Archives Before Sink Finish

## Key Correction to Phase 1 Description

GitHub `cmdSinkFallback` actually uses `fs.existsSync(projectDir(root, args.project))` (disk check),
NOT `activeByProject`. This matters for test parity — the walkthrough negative test
`testSinkFallbackSkipsArchivedProject` creates a tmp dir with no state file, which only passes
with the disk-check pattern. GitLab fix must mirror the actual GitHub code, not the snippet in
the task description.

---

## Bug 1 — `kaola-gitlab-workflow-sink-merge.js` reads archived files

### Approach 1A — Archive-aware read fallback inside helpers (RECOMMENDED)

Add a small helper `resolveProjectFile(root, project, basename)`:
```js
function resolveProjectFile(root, project, basename) {
  const live = path.join(root, 'kaola-workflow', project, basename);
  if (fs.existsSync(live)) return live;
  const archived = path.join(root, 'kaola-workflow', 'archive', project, basename);
  if (fs.existsSync(archived)) return archived;
  return live; // let caller's try/catch handle missing
}
```
Use it in `finalValidationPassed` (for phase6-summary.md) and `readProjectInfo` (for workflow-state.md).

- **Pros**: Surgical (~10 LOC), no signature change, no command-file change, tolerates both call orderings
- **Cons**: None of substance
- **Risk**: Low
- **Complexity**: Small

### Approach 1B — CLI flag `--archived` from phase6.md

- Violates no-command-file-change constraint
- **Not recommended**

### Approach 1C — Inline path resolution at each call site

- Duplicates path logic, breaks test surface for standalone helpers
- **Not recommended**

---

## Bug 2 — `cmdSinkFallback` recreates archived directory

### Approach 2A — Port GitHub `fs.existsSync(projectDir(...))` guard verbatim (RECOMMENDED)

```js
function cmdSinkFallback() {
  const root = getRoot();
  const args = parseArgs(process.argv.slice(3));
  assert(args.project, '--project required');
  assert(isSafeName(args.project), 'unsafe project name');
  if (!fs.existsSync(projectDir(root, args.project))) {
    output({ updated: false, project: args.project, reason: 'project archived' });
    return;
  }
  const reason = args.reason || 'merge fallback';
  updateState(root, args.project, content => content
    .replace(/^sink:.*$/m, 'sink: mr')
    .replace(/^last_result:.*$/m, 'last_result: sink_fallback: ' + reason));
  output({ updated: true, project: args.project, sink: 'mr', reason });
}
```

- **Pros**: Verbatim port, also adds missing `isSafeName` guard
- **Risk**: Low
- **Complexity**: 3 added lines

### Approach 2B — `activeByProject` guard

- Diverges from GitHub, could false-negative on malformed state
- **Not recommended**

---

## Bug 3 — `appendSummary` in `kaola-gitlab-workflow-sink-mr.js`

### Approach 3A — Mirror `updateStateSinkBlock`'s existence guard (RECOMMENDED)

```js
function appendSummary(summaryFile, mrUrl, mrIid) {
  if (!fs.existsSync(path.dirname(summaryFile))) return false;
  fs.appendFileSync(summaryFile, '\nMR URL: ' + mrUrl + '\nMR IID: ' + mrIid + '\n');
  return true;
}
```

Drop `fs.mkdirSync` that recreates the archived directory.

- **Pros**: Matches sibling `updateStateSinkBlock` pattern, 2 LOC change
- **Risk**: Low — normal MR path: dir exists, proceed; fallback path: dir gone, skip
- **Complexity**: Small

### Approaches 3B, 3C — CLI flag or caller-orchestration

- Both require command-file change or larger surface change
- **Not recommended**

---

## Items NOT to Build

- No phase6.md command-file edits
- No new CLI flags (`--archived`, `--project-dir`, `--fallback`)
- No refactor of `archiveProjectDir` to defer archiving
- No reorder of `runDirectMerge`
- No change to normal `sink: mr` path
- No emergency rollback / "un-archive" logic

---

## Tests to Add (`test-gitlab-sinks.js`)

- **Bug 1**: Archive project dir via `fs.renameSync`; assert `finalValidationPassed` returns true;
  assert `readProjectInfo` returns parsed fields (not nulls)
- **Bug 1 integration**: Stub forge; invoke `runDirectMerge` after archive with `gitExec` stub;
  assert no throw
- **Bug 2**: Three sub-cases mirroring GitHub `testSinkFallbackSkipsArchivedProject`:
  (a) no active dir → `{ updated: false, reason: 'project archived' }`, dir not created;
  (b) live dir present → `{ updated: true, sink: 'mr' }`;
  (c) unsafe `--project ../escape` → non-zero exit
- **Bug 3**: `appendSummary` with non-existent dir → returns false, dir not created;
  positive case: existing dir → returns true, file contains MR lines

All tests: hand-rolled assert, tmp dirs via `fs.mkdtempSync`, `withForge` for forge stubs.

## Verification

```bash
node scripts/simulate-workflow-walkthrough.js
node plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js
```
