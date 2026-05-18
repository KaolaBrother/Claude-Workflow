# Code Explorer: Issue #83 — GitLab Merge Path Archives Before Sink Finish

## Root Cause

The GitLab Phase 6 merge path runs `cmdFinalize` (Step 8b) which renames
`kaola-workflow/{project}/` → `kaola-workflow/archive/{project}/` BEFORE
dispatching the sink scripts in Step 9. But `kaola-gitlab-workflow-sink-merge.js`
reads files from the now-archived active folder path.

## Bug Sites

### Bug 1 — `kaola-gitlab-workflow-sink-merge.js` reads archived paths

**`finalValidationPassed` (lines 55–59):**
```javascript
function finalValidationPassed(root, project) {
  const summaryFile = path.join(root, 'kaola-workflow', project, 'phase6-summary.md');
  let summary = '';
  try { summary = fs.readFileSync(summaryFile, 'utf8'); } catch (_) { return false; }
  return /Final Validation/i.test(summary) && /pass/i.test(summary) && !/blocked|failed/i.test(summary);
}
```
After Step 8b, `phase6-summary.md` is at `kaola-workflow/archive/{project}/phase6-summary.md`.
The `try/catch` returns `false` → assertion at line 97 throws.

**`readProjectInfo` (lines 44–53):**
```javascript
function readProjectInfo(root, project) {
  const stateFile = path.join(root, 'kaola-workflow', project, 'workflow-state.md');
  let content = '';
  try { content = fs.readFileSync(stateFile, 'utf8'); } catch (_) {}
  return {
    project_id: Number(field(content, 'project_id')) || null,
    path_with_namespace: field(content, 'path_with_namespace'),
    web_url: field(content, 'project_web_url')
  };
}
```
Silently returns null fields → `closeLinkedIssue` fails or closes wrong issue.

**`runDirectMerge` (lines 91–101) calls both:**
```javascript
assert(finalValidationPassed(root, args.project), 'Final validation evidence is required before direct merge sink runs');
// ^ Throws when active folder is archived
```

### Bug 2 — `cmdSinkFallback` in `kaola-gitlab-workflow-claim.js` (lines 547–555)

```javascript
function cmdSinkFallback() {
  const root = getRoot();
  const args = parseArgs(process.argv.slice(3));
  assert(args.project, '--project required');
  const reason = args.reason || 'merge fallback';
  updateState(root, args.project, content => content
    .replace(/^sink:.*$/m, 'sink: mr')
    .replace(/^last_result:.*$/m, 'last_result: sink_fallback: ' + reason));
  output({ updated: true, project: args.project, sink: 'mr', reason });
}
```

`updateState` calls `writeFile` which calls `fs.mkdirSync` + `fs.writeFileSync` on the active
path unconditionally. When archived, this recreates `kaola-workflow/{project}/workflow-state.md`
with corrupted/empty state. No `activeByProject` guard exists.

GitHub equivalent has this guard (in `scripts/kaola-workflow-claim.js`):
```javascript
const folder = activeByProject(root, args.project);
if (!folder) {
  output({ updated: false, reason: 'project archived' });
  return;
}
```

### Bug 3 — `sink-mr.js` on exit-3 fallback path

`appendSummary` (lines 70–73) calls `fs.mkdirSync` recursively and `fs.appendFileSync` on
active folder paths. If `sink-merge.js` fails with exit 3 and triggers fallback to MR after
archive, `sink-mr.js` recreates `kaola-workflow/{project}/`. Active folder guard in
`updateStateSinkBlock` (line 58: `if (!fs.existsSync(stateFile)) return false;`) only
skips the state update; `appendSummary` still creates the dir.

## Correct Pattern (GitHub)

`scripts/kaola-workflow-sink-merge.js` never reads active folder files. All info passed via
CLI args (`--branch`, `--issue`, `--project`). The shell in phase6.md captures metadata
from `workflow-state.md` into shell variables BEFORE Step 8b runs finalize.

## File Inventory

| File | Role | Change Needed |
|------|------|---------------|
| `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js` | Direct merge sink | Fix `finalValidationPassed` and `readProjectInfo` to check archive path first |
| `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js` | `cmdSinkFallback` | Add `activeByProject` guard before `updateState` |
| `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js` | MR sink | Guard `appendSummary` against archived path on fallback |
| `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js` | Sink unit tests | Add post-archive scenario tests |
| `plugins/kaola-workflow-gitlab/scripts/simulate-gitlab-workflow-walkthrough.js` | Integration walkthrough | Mirror `testSinkFallbackSkipsArchivedProject` from GitHub walkthrough |

## Key Architecture Facts

- `cmdFinalize` calls `archiveProjectDir` which does `fs.renameSync(src, dest)` — active folder gone atomically
- Phase6.md captures `SINK_BRANCH`, `SINK_ISSUE`, `SINK_KIND` as shell vars BEFORE Step 8b
- Step 9 sink dispatch happens AFTER archive
- `sink: mr` path never runs archive (Step 8b is merge-only) — MR path is safe by design
- `simulate-workflow-walkthrough.js` lines 531–570 has `testSinkFallbackSkipsArchivedProject` to mirror

## Test Patterns

- Framework: hand-rolled assert (no test framework)
- Location: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`
- Structure: module-level functions, `main()` async runner, `assert()` helper
- Tests use tmp dirs and offline mode (`KAOLA_WORKFLOW_OFFLINE=1` or `gitExec` option)
- Integration: `simulate-gitlab-workflow-walkthrough.js` for end-to-end scenarios

## External Docs

N/A — internal patterns sufficient.
