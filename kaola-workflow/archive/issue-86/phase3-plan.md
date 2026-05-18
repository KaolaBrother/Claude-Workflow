# Phase 3 - Plan: issue-86

## Blueprint

### Files to Create

None. All changes are in existing files.

### Files to Modify

| File | Changes | Why |
|------|---------|-----|
| `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js` | Add `cwdInside(target)` helper; add 2-line CWD guard in `cmdRelease` before `archiveProjectDir`; extract `partitionActiveAndDrift(root)` from `cmdStatus`; rewrite `cmdStatus` to call it; add `partitionActiveAndDrift` to `module.exports` | Gap 1 CWD guard parity + Gap 2 drift detection parity |
| `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js` | Add CWD guard refusal test (spawnSync, cwd=project_dir); add drift detection test (withForge + in-process partitionActiveAndDrift) | Prove both gaps closed; regression coverage |
| `plugins/kaola-workflow-gitlab/commands/workflow-next.md` | Add "### Git Freshness Block Recovery" subsection after Step 1 body; add "### Co-active Folders Advisory" at end of Step 3 (before `## Co-active Folders` section) | Gap 3 doc parity |
| `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md` | Add co-active advisory after existing Routing section; preserve `PICK_NEXT_PROJECT` variable name | SKILL.md parity (freshness recovery already at lines 152-168) |
| `CHANGELOG.md` | Add entry under `[Unreleased]` | Document user-visible behavior changes |

### Build Sequence

1. **Task 1 — claim.js** (Gap 1 + Gap 2): No pre-existing dependency. `path` (line 5) and `issueIsClosed` (line 13) already imported — no new requires needed.
2. **Task 2 — workflow-next.md** (Gap 3 doc): No dependency; parallel with Task 1 and Task 3.
3. **Task 3 — SKILL.md** (Gap 3 skill): No dependency; parallel with Task 1 and Task 2.
4. **Task 4 — tests**: Depends on Task 1 (drift test calls `claim.partitionActiveAndDrift` in-process).
5. **Task 5 — CHANGELOG.md**: Depends on Tasks 1-4 complete; serial.

### Parallelization Plan

| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| Round 1 | Task 1, Task 2, Task 3 | Completely disjoint write sets |
| Round 2 | Task 4 | Depends on Task 1 (partitionActiveAndDrift export) |
| Round 3 | Task 5 | Final changelog entry; serial |

### External Dependencies

No new requires for any file:
- `path` already at line 5 of `kaola-gitlab-workflow-claim.js`
- `issueIsClosed` already at line 13 of `kaola-gitlab-workflow-claim.js`
- `claim` module, `withForge`, `spawnSync`, `writeState` all already present in test file

### Design Note — `partitionActiveAndDrift` Export

The extraction of `partitionActiveAndDrift(root)` as an exported function is a deliberate
divergence from the GitHub `cmdStatus` inline pattern. Forge stubs do not propagate across
`spawnSync` process boundaries; the drift test must call the partition function in-process
via `withForge`. This is an implementation necessity, not scope creep.

## Task List

### Task 1: claim.js — CWD Guard + Drift Detection

- **File**: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js`
- **Test File**: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`
- **Write Set**: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js`
- **Depends On**: none
- **Parallel Group**: Round 1
- **Action**: MODIFY

**Gap 1 — cwdInside helper + cmdRelease guard:**

Add `cwdInside(target)` function near other helpers, before `cmdRelease` (around line 433):
```js
function cwdInside(target) {
  const cwd = fs.realpathSync(process.cwd());
  const real = fs.realpathSync(target);
  return cwd === real || cwd.startsWith(real + path.sep);
}
```

In `cmdRelease`, immediately after the `if (!folder)` not-found guard (around line 438), add:
```js
if (cwdInside(folder.project_dir)) {
  output({ released: false, reason: 'refusing to discard current working directory' }, 1);
  return;
}
```

**Gap 2 — partitionActiveAndDrift + cmdStatus rewrite:**

Add new exported function (near other exported helpers, before `cmdStatus`):
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

Rewrite `cmdStatus` (lines 445-449):
```js
function cmdStatus() {
  const root = getRoot();
  const { active, drift } = partitionActiveAndDrift(root);
  output({ active, drift, count: active.length });
}
```

Add to `module.exports`:
```js
partitionActiveAndDrift,
```

- **Mirror**: `scripts/kaola-workflow-claim.js` lines 454-458 (cwdInside), lines 465 (guard), lines 472-485 (drift pattern)
- **Validate**: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`

---

### Task 2: workflow-next.md — Doc Subsections

- **File**: `plugins/kaola-workflow-gitlab/commands/workflow-next.md`
- **Test File**: N/A (documentation)
- **Write Set**: `plugins/kaola-workflow-gitlab/commands/workflow-next.md`
- **Depends On**: none
- **Parallel Group**: Round 1
- **Action**: MODIFY

**Subsection 1 — "### Git Freshness Block Recovery" under Startup Step 1:**

Insert immediately after the `git pull --ff-only` / "Stop and ask before any merge..." paragraph
(after current line 140, before `## Startup Step 2`). Must inline-extract BOTH project and claim
from `$STARTUP_OUT` since GitLab Step 0b only exports `KAOLA_WORKTREE_PATH`:

```bash
_KAOLA_PROJECT="$(node -e "try{process.stdout.write(JSON.parse(process.argv[1]).project||'')}catch(e){}" "$STARTUP_OUT")"
_KAOLA_CLAIM="$(node -e "try{process.stdout.write(JSON.parse(process.argv[1]).claim||'')}catch(e){}" "$STARTUP_OUT")"
[ "$_KAOLA_CLAIM" = "acquired" ] && [ -n "$_KAOLA_PROJECT" ] && node "$CLAIM_JS" release --project "$_KAOLA_PROJECT" --reason git-freshness-block
```

Mirror GitHub `commands/workflow-next.md` lines 143-159 structure.

**Subsection 2 — "### Co-active Folders Advisory" at end of Startup Step 3:**

GitLab Step 3 (`## Startup Step 3 - Select Project`) ends at line 186; `## Co-active Folders`
is a separate section starting at line 188. Insert `### Co-active Folders Advisory` subsection
at the END of Step 3 body (after line 186, before line 188 `## Co-active Folders`).

Mirror GitHub `commands/workflow-next.md` lines 207-211: "Do NOT merge, interleave, or batch commits from different active folders" plus conflict resolution guidance.

- **Mirror**: GitHub `commands/workflow-next.md` lines 143-159, 207-211
- **Validate**: File reads correctly; no syntax errors in markdown

---

### Task 3: SKILL.md — Co-active Advisory

- **File**: `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md`
- **Test File**: N/A (documentation)
- **Write Set**: `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md`
- **Depends On**: none
- **Parallel Group**: Round 1
- **Action**: MODIFY

Add co-active advisory paragraph after the existing Routing section (after line ~198 "Manual reconstruction order" block). Use `PICK_NEXT_PROJECT` (not `KAOLA_PROJECT`) — preserve SKILL.md naming convention.

Do NOT touch lines 152-168 (Git Freshness Block Recovery already present and correct).

- **Mirror**: GitHub `commands/workflow-next.md` lines 207-211 (advisory text)
- **Validate**: File reads correctly

---

### Task 4: Tests — CWD Guard + Drift Detection

- **File**: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`
- **Test File**: same (this IS the test file)
- **Write Set**: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`
- **Depends On**: Task 1 (partitionActiveAndDrift must be exported)
- **Parallel Group**: Round 2
- **Action**: MODIFY

**Test 1 — CWD guard refusal:**

```js
{
  // Test: cmdRelease refuses when cwd is inside project_dir
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-cwd-'));
  writeState(root, 'cwd-project', 99);
  const folder = claim.readActiveFolders(root)[0];  // or read project_dir from state
  const result = spawnSync(process.execPath, [claimScript, 'release', '--project', 'cwd-project', '--reason', 'test'], {
    cwd: folder.project_dir,
    encoding: 'utf8',
    env: { ...process.env, KAOLA_WORKFLOW_ROOT: root }
  });
  assert.strictEqual(result.status, 1, 'should exit 1 when cwd is inside project_dir');
  const out = JSON.parse(result.stdout.trim());
  assert.strictEqual(out.released, false);
  assert.strictEqual(out.reason, 'refusing to discard current working directory');
  console.log('CWD guard refusal test: PASS');
}
```

**Test 2 — Drift detection:**

```js
withForge({ viewIssue: (iid) => ({ state: 'closed' }) }, () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-drift-'));
  writeState(root, 'drift-project', 60);  // writes issue_iid: 60
  const result = claim.partitionActiveAndDrift(root);
  assert.strictEqual(result.drift.length, 1, 'drift should contain 1 closed-issue folder');
  assert.strictEqual(result.active.length, 0, 'active should be empty');
  console.log('Drift detection test: PASS');
});
```

Note: `writeState(root, project, issueIid, extra)` writes `issue_iid: ` + issueIid (verified at line 55 of test file). Folder with issueIid=60 will have `folder.issue_iid === 60`, triggering `issueIsClosed(60)` → `{state: 'closed'}` → drift.

- **Mirror**: Phase 1 test patterns — `withForge({stubs}, cb)` at lines 246/259/275/305; spawnSync at lines 368-372
- **Validate**: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`

---

### Task 5: CHANGELOG.md

- **File**: `CHANGELOG.md`
- **Write Set**: `CHANGELOG.md`
- **Depends On**: Tasks 1-4 complete
- **Parallel Group**: Round 3 (serial)
- **Action**: MODIFY

Add entry under `[Unreleased]`:
```
### Added
- GitLab: `cmdRelease` refuses to discard current working directory (CWD guard parity with GitHub)
- GitLab: `cmdStatus` returns `{active, drift, count}` with closed-issue drift detection (parity with GitHub)
- GitLab: `workflow-next.md` Git Freshness Block Recovery and Co-active Folders Advisory doc subsections
- GitLab: `SKILL.md` Co-active Folders Advisory
```

## Advisor Notes

From `.cache/advisor-plan.md`:

1. **KAOLA_CLAIM also needs inline extraction**: GitHub Step 0b extracts BOTH `KAOLA_PROJECT` and `KAOLA_CLAIM`; GitLab Step 0b only exports `KAOLA_WORKTREE_PATH`. The freshness recovery snippet must inline-extract both from `$STARTUP_OUT` using `_KAOLA_PROJECT` and `_KAOLA_CLAIM` local vars.

2. **writeState confirmed**: `writeState(root, project, issueIid)` writes `issue_iid: ` + issueIid at line 55. Drift test will correctly create a folder with `issue_iid: 60`.

3. **GitLab Step 3 structure confirmed**: `## Co-active Folders` (line 188) is a SEPARATE top-level section, not inside Step 3. Advisory subsection goes at the END of Step 3 body, before line 188.

4. **partitionActiveAndDrift export is justified**: documented above as explicit design decision.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | .cache/advisor-plan.md — corrections were factual only; no design reversals requiring re-architect | corrections applied directly to phase3-plan.md |
