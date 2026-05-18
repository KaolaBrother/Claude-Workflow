# Code Architect Output — Issue #86

## Design Decisions

- `path` is required at line 5 and `issueIsClosed` is imported at line 13 of `kaola-gitlab-workflow-claim.js`. No new requires needed.
- Drift test uses in-process exported helper: extract `partitionActiveAndDrift(root)` returning `{active, drift}`, have `cmdStatus` wrap it, and add `partitionActiveAndDrift` to `module.exports`. This is the only way forge stubs propagate across the withForge boundary in tests — spawnSync does not carry forge stubs into the subprocess.
- CWD guard test uses spawnSync with `cwd: folder.project_dir` because the guard fires before any forge call, so no stub injection is required.
- `workflow-next.md` freshness block recovery uses the inline-extract pattern for project since `$KAOLA_PROJECT` is not exported by Step 0b.
- `SKILL.md` co-active advisory is appended after the existing Routing section without touching the freshness block recovery at lines 152-168 or the `PICK_NEXT_PROJECT` variable name.

## Files to Create

None. All changes are in existing files.

## Files to Modify

| File | Changes | Why |
|------|---------|-----|
| `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js` | Add `cwdInside(target)` helper; add 2-line guard in `cmdRelease` before `archiveProjectDir` | Gap 1 CWD guard parity |
| `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js` | Extract `partitionActiveAndDrift(root)` from `cmdStatus` body; rewrite `cmdStatus`; add export | Gap 2 drift detection parity |
| `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js` | Add CWD guard test (spawnSync); add drift detection test (withForge + in-process) | Regression proof for both gaps |
| `plugins/kaola-workflow-gitlab/commands/workflow-next.md` | Add "Git Freshness Block Recovery" subsection under Startup Step 1; add "Co-active Folders Advisory" under Startup Step 3 | Gap 3 doc parity |
| `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md` | Add co-active advisory after Routing section; preserve `PICK_NEXT_PROJECT` | SKILL.md parity (freshness recovery already present) |

## Build Sequence

1. **claim.js** — Gap 1 (cwdInside helper + cmdRelease guard) + Gap 2 (partitionActiveAndDrift + cmdStatus rewrite + export). Both gaps in same file; do sequentially within this task.
2. **workflow-next.md** and **SKILL.md** — parallel with step 1 (disjoint write sets).
3. **test-gitlab-workflow-scripts.js** — after step 1, because drift test calls `claim.partitionActiveAndDrift` which must be exported first.

## Parallelization Plan

| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| Round 1 | Task 1 (claim.js), Task 2 (workflow-next.md), Task 3 (SKILL.md) | Completely disjoint write sets |
| Round 2 | Task 4 (tests) | Depends on Task 1 (partitionActiveAndDrift export) |

## External Dependencies

No new requires for any file. All needed modules already imported.

## Task List

### Task 1: claim.js — CWD guard + drift detection

- **File**: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js`
- **Write Set**: same file only
- **Depends On**: none
- **Parallel Group**: Round 1

**Gap 1 — cwdInside helper + cmdRelease guard:**
- Add `function cwdInside(target)` before `cmdRelease`:
  ```js
  function cwdInside(target) {
    const cwd = fs.realpathSync(process.cwd());
    const real = fs.realpathSync(target);
    return cwd === real || cwd.startsWith(real + path.sep);
  }
  ```
- In `cmdRelease`, after the `if (!folder)` not-found guard (line 438), add:
  ```js
  if (cwdInside(folder.project_dir)) {
    output({ released: false, reason: 'refusing to discard current working directory' }, 1);
    return;
  }
  ```

**Gap 2 — partitionActiveAndDrift + cmdStatus rewrite:**
- Extract new exported function:
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
- Rewrite `cmdStatus`:
  ```js
  function cmdStatus() {
    const root = getRoot();
    const { active, drift } = partitionActiveAndDrift(root);
    output({ active, drift, count: active.length });
  }
  ```
- Add `partitionActiveAndDrift` to `module.exports`.

### Task 2: workflow-next.md — doc subsections

- **File**: `plugins/kaola-workflow-gitlab/commands/workflow-next.md`
- **Write Set**: same file only
- **Depends On**: none
- **Parallel Group**: Round 1

**Subsection 1 — Under Startup Step 1:**
Add "### Git Freshness Block Recovery" subsection immediately after the main Step 1 `git pull --ff-only` description. Must inline-extract project from `$STARTUP_OUT`:
```bash
KAOLA_PROJECT_FROM_STARTUP="$(node -e "try{process.stdout.write(JSON.parse(process.argv[1]).project||'')}catch(e){}" "$STARTUP_OUT")"
```
Then release command uses `$KAOLA_PROJECT_FROM_STARTUP`. Mirror GitHub lines 145-159 structure exactly.

**Subsection 2 — Under Startup Step 3:**
Add "### Co-active Folders Advisory" after the "Co-active Folders" paragraph already in Step 3. Mirror GitHub lines 207-211: "Do NOT merge, interleave, or batch commits from different active folders" plus conflict resolution guidance.

### Task 3: SKILL.md — co-active advisory

- **File**: `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md`
- **Write Set**: same file only
- **Depends On**: none
- **Parallel Group**: Round 1

Add co-active advisory paragraph after the existing Routing section (after line ~198). Use `PICK_NEXT_PROJECT` (not `KAOLA_PROJECT`) — preserve SKILL.md convention. Do NOT touch lines 152-168 (freshness block recovery already present).

### Task 4: tests

- **File**: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`
- **Write Set**: same file only
- **Depends On**: Task 1
- **Parallel Group**: Round 2

**Test 1 — CWD guard refusal:**
Create temp root + active folder → get `folder.project_dir` path → `spawnSync(process.execPath, [claimScript, 'release', '--project', project, '--reason', 'test'], {cwd: folder.project_dir, encoding: 'utf8'})` → assert `status === 1` → parse stdout JSON → assert `released === false`, `reason === 'refusing to discard current working directory'`.

**Test 2 — Drift detection:**
`withForge({viewIssue: (iid) => ({state: 'closed'})}, () => { ... })` → create temp root → `writeState(root, 'drift-project', 60)` with `issue_iid: 60` → call `claim.partitionActiveAndDrift(root)` → assert `result.drift.length === 1` and `result.active.length === 0`.

## Validate Command

```
node plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js
```

## Explicit Out-of-Scope Items

- Do NOT modify `scripts/kaola-workflow-claim.js` (GitHub version)
- Do NOT extract `cwdInside` into shared module
- Do NOT add freshness block recovery to SKILL.md (already at lines 152-168)
- Do NOT modify `kaola-gitlab-workflow-active-folders.js`
- Do NOT add CWD guard to `cmdFinalize`
- Do NOT auto-archive drift folders in `cmdStatus`
- Do NOT change `PICK_NEXT_PROJECT` variable anywhere in SKILL.md
- Do NOT create any new files
