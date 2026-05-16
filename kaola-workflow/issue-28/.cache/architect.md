# Architect Blueprint — issue-28

## Summary
Fix `workflow/issue-N-issue-N` branch name duplication via two layers + DRY refactor. No new files; five existing files modified in two parallelizable groups.

## Files to Create
None.

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `scripts/kaola-workflow-roadmap.js` | Add `cmdProjectName`; dispatch in `main()`; update error message | 1 |
| `plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js` | Mirror Task 1A | 1 |
| `scripts/kaola-workflow-claim.js` | 6 changes: add `buildSinkBranchName`, route `buildSinkBlock`, rewrite `projectNameForIssue`, collapse `pickFirstActionableIssue`, route `cmdWatchPr`, add export guard | 2 |
| `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` | Mirror Task 2A | 2 |
| `scripts/simulate-workflow-walkthrough.js` | Add Epic Case 5G + 5H, regression asserts in 7G + 7A | 3 |

---

## Task 1A — roadmap.js: Add cmdProjectName

**File:** `scripts/kaola-workflow-roadmap.js`

**Insert between `cmdInitIssue` (line ~212) and `function main()` (line 214):**

```js
function cmdProjectName(argv) {
  const args = parseArgs(argv);
  const n = Number(args['issue']);
  if (!Number.isInteger(n) || n <= 0) {
    process.stderr.write('--issue must be a positive integer\n');
    process.exitCode = 1;
    return;
  }
  const root = getRoot();
  const filePath = path.join(roadmapDir(root), 'issue-' + n + '.md');
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (_) {
    process.exitCode = 1;
    return;
  }
  const name = field(content, 'workflow_project').replace(/\|/g, '').trim();
  if (!name || name === '—') {
    process.exitCode = 1;
    return;
  }
  process.stdout.write(name + '\n');
}
```

**Modify `main()` (lines 214–221):**

Replace:
```js
function main() {
  const sub = process.argv[2];
  if (!sub || sub === 'generate') { cmdGenerate(); return; }
  if (sub === 'migrate') { cmdMigrate(); return; }
  if (sub === 'validate') { cmdValidate(); return; }
  if (sub === 'init-issue') { cmdInitIssue(process.argv.slice(3)); return; }
  throw new Error('Unknown subcommand: ' + sub + '. Use generate, migrate, validate, or init-issue.');
}
```

With:
```js
function main() {
  const sub = process.argv[2];
  if (!sub || sub === 'generate') { cmdGenerate(); return; }
  if (sub === 'migrate') { cmdMigrate(); return; }
  if (sub === 'validate') { cmdValidate(); return; }
  if (sub === 'init-issue') { cmdInitIssue(process.argv.slice(3)); return; }
  if (sub === 'project-name') { cmdProjectName(process.argv.slice(3)); return; }
  throw new Error('Unknown subcommand: ' + sub + '. Use generate, migrate, validate, init-issue, or project-name.');
}
```

## Task 1B — Mirror to plugin roadmap.js

**File:** `plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js`

Apply identical changes from Task 1A.

---

## Task 2A — claim.js: Six targeted changes

**File:** `scripts/kaola-workflow-claim.js`

### Change 2A-1: Add `buildSinkBranchName` before `buildSinkBlock` (line 381)

Insert before current `buildSinkBlock` function:
```js
function buildSinkBranchName(issueNumber, project, fallbackBranch) {
  if (issueNumber == null) {
    return fallbackBranch || ('workflow/' + (project || 'unknown'));
  }
  const base = 'workflow/issue-' + issueNumber;
  if (!project || project === 'issue-' + issueNumber) return base;
  const prefix = 'issue-' + issueNumber + '-';
  const suffix = project.startsWith(prefix) ? project.slice(prefix.length) : project;
  return suffix ? base + '-' + suffix : base;
}
```

### Change 2A-2: Route `buildSinkBlock` through helper (line 383)

Replace:
```js
function buildSinkBlock(lockData) {
  const branchName = lockData.issue_number != null
    ? 'workflow/issue-' + lockData.issue_number + '-' + lockData.project
    : (lockData.branch || 'workflow/' + lockData.project);
```

With:
```js
function buildSinkBlock(lockData) {
  const branchName = lockData.branch || buildSinkBranchName(lockData.issue_number, lockData.project);
```

### Change 2A-3: Rewrite `projectNameForIssue` (lines 698–707)

Replace:
```js
function projectNameForIssue(classifierScript, issueNumber) {
  try {
    const name = execFileSync(process.execPath, [path.join(path.dirname(classifierScript), 'kaola-workflow-roadmap.js'), 'project-name', '--issue', String(issueNumber)], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    if (name) return name;
  } catch (_) {}
  return 'issue-' + issueNumber;
}
```

With:
```js
function projectNameForIssue(_classifierScript, issueNumber) {
  try {
    const content = fs.readFileSync(roadmapIssuePath(getRoot(), issueNumber), 'utf8');
    const name = field(content, 'workflow_project').replace(/\|/g, '').trim();
    if (name && name !== '—') return name;
  } catch (err) {
    if (err && err.code !== 'ENOENT') {
      process.stderr.write('warn: projectNameForIssue(' + issueNumber + ') failed: ' + err.message + '\n');
    }
  }
  return 'issue-' + issueNumber;
}
```

### Change 2A-4: Collapse `pickFirstActionableIssue` inline duplicate (lines 733–741)

Replace:
```js
      if (result.verdict === 'green' || result.verdict === 'yellow') {
        let proj = 'issue-' + N;
        try {
          const name = execFileSync(process.execPath, [path.join(path.dirname(classifierScript), 'kaola-workflow-roadmap.js'), 'project-name', '--issue', String(N)], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
          }).trim();
          if (name) proj = name;
        } catch (_) {}
        return { pick: N, project: proj, verdict: result.verdict };
      }
```

With:
```js
      if (result.verdict === 'green' || result.verdict === 'yellow') {
        return { pick: N, project: projectNameForIssue(classifierScript, N), verdict: result.verdict };
      }
```

### Change 2A-5: Route `cmdWatchPr` through helper (lines 1503–1506)

Replace:
```js
    const state = (prData.state || '').toUpperCase();
    const branchName = lock.branch || (lock.issue_number != null
      ? 'workflow/issue-' + lock.issue_number + '-' + lock.project
      : 'workflow/' + lock.project);
```

With:
```js
    const state = (prData.state || '').toUpperCase();
    const branchName = buildSinkBranchName(lock.issue_number, lock.project, lock.branch);
```

### Change 2A-6: Replace unconditional tail with export guard

Replace (at bottom of file):
```js
try { main(); } catch (err) { process.stderr.write(err.message + '\n'); process.exitCode = 1; }
```

With:
```js
if (require.main === module) {
  try { main(); } catch (err) { process.stderr.write(err.message + '\n'); process.exitCode = 1; }
} else {
  module.exports = { buildSinkBranchName };
}
```

## Task 2B — Mirror to plugin claim.js

**File:** `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`

Apply all six changes from Task 2A identically.

---

## Task 3 — simulate-workflow-walkthrough.js: Add tests

**File:** `scripts/simulate-workflow-walkthrough.js`

### Change 3A: Insert Epic Cases 5G and 5H inside Epic Case 5 block (before its closing `}` ~line 786)

**Epic Case 5G** (roadmap.js project-name subcommand, 4 assertions):
```js
      // Sub-test G: project-name subcommand
      {
        const epic5gTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kaola-workflow-epic5g-'));
        try {
          const roadmapDir5G = path.join(epic5gTmp, 'kaola-workflow', '.roadmap');
          fs.mkdirSync(roadmapDir5G, { recursive: true });

          // 5G-a: workflow_project is a real slug → exit 0, slug on stdout
          execFileSync(process.execPath, [roadmapScriptPath, 'init-issue',
            '--issue', '38', '--title', 'test-issue', '--status', 'open',
            '--workflow-project', 'guard-handoff', '--next-step', 'ready',
          ], { cwd: epic5gTmp, encoding: 'utf8' });
          const out5Ga = execFileSync(process.execPath,
            [roadmapScriptPath, 'project-name', '--issue', '38'],
            { cwd: epic5gTmp, encoding: 'utf8' }).trim();
          assert(out5Ga === 'guard-handoff', 'Epic Case 5G-a: project-name must return slug, got ' + out5Ga);

          // 5G-b: init-issue without --workflow-project → placeholder '—' → exit 1, no stdout
          execFileSync(process.execPath, [roadmapScriptPath, 'init-issue',
            '--issue', '39', '--title', 'no-slug', '--status', 'open', '--next-step', 'ready',
          ], { cwd: epic5gTmp, encoding: 'utf8' });
          let exit5Gb = 0;
          let stdout5Gb = '';
          try {
            stdout5Gb = execFileSync(process.execPath,
              [roadmapScriptPath, 'project-name', '--issue', '39'],
              { cwd: epic5gTmp, encoding: 'utf8' });
          } catch (e) { exit5Gb = e.status || 1; }
          assert(exit5Gb === 1, 'Epic Case 5G-b: placeholder workflow_project must exit 1, got ' + exit5Gb);
          assert(stdout5Gb.trim() === '', 'Epic Case 5G-b: placeholder must produce no stdout');

          // 5G-c: no file for issue 999 → exit 1
          let exit5Gc = 0;
          try {
            execFileSync(process.execPath,
              [roadmapScriptPath, 'project-name', '--issue', '999'],
              { cwd: epic5gTmp, encoding: 'utf8' });
          } catch (e) { exit5Gc = e.status || 1; }
          assert(exit5Gc === 1, 'Epic Case 5G-c: missing file must exit 1, got ' + exit5Gc);

          // 5G-d: blank workflow_project field → exit 1
          const blankIssuePath = path.join(roadmapDir5G, 'issue-40.md');
          fs.writeFileSync(blankIssuePath,
            'issue: #40\ntitle: blank-test\nstatus: open\nworkflow_project: \nnext_step: ready\n');
          let exit5Gd = 0;
          try {
            execFileSync(process.execPath,
              [roadmapScriptPath, 'project-name', '--issue', '40'],
              { cwd: epic5gTmp, encoding: 'utf8' });
          } catch (e) { exit5Gd = e.status || 1; }
          assert(exit5Gd === 1, 'Epic Case 5G-d: blank workflow_project must exit 1, got ' + exit5Gd);
        } finally {
          fs.rmSync(epic5gTmp, { recursive: true, force: true });
        }
      }

      // Sub-test H: buildSinkBranchName unit tests via export guard
      {
        const { buildSinkBranchName } = require(path.join(__dirname, 'kaola-workflow-claim.js'));

        // 5H-1: project equals 'issue-38' fallback → no suffix
        assert(
          buildSinkBranchName(38, 'issue-38') === 'workflow/issue-38',
          'Epic Case 5H-1: issue-N project must produce no suffix, got ' + buildSinkBranchName(38, 'issue-38')
        );

        // 5H-2: normal project slug → appended
        assert(
          buildSinkBranchName(38, 'guard-handoff') === 'workflow/issue-38-guard-handoff',
          'Epic Case 5H-2: slug must be appended, got ' + buildSinkBranchName(38, 'guard-handoff')
        );

        // 5H-3: project already carries issue-N prefix → dedup
        assert(
          buildSinkBranchName(38, 'issue-38-guard') === 'workflow/issue-38-guard',
          'Epic Case 5H-3: existing prefix must not double, got ' + buildSinkBranchName(38, 'issue-38-guard')
        );

        // 5H-4: null issueNumber with fallback branch
        assert(
          buildSinkBranchName(null, 'epic7a', 'workflow/issue-42-epic7a') === 'workflow/issue-42-epic7a',
          'Epic Case 5H-4: null issue must use fallbackBranch, got ' + buildSinkBranchName(null, 'epic7a', 'workflow/issue-42-epic7a')
        );
      }
```

### Change 3B: Regression assertions

In existing 7G block (after `assert(state7G.includes('sink: pr'), ...)` at ~line 1126):
```js
        // Regression: branch must not double the issue-N segment
        const branch7Gmatch = state7G.match(/^branch: (.+)$/m);
        assert(branch7Gmatch, '7G regression: ## Sink must contain a branch: line');
        assert(!/issue-42-issue-42/.test(branch7Gmatch[1]), '7G regression: branch must not duplicate issue-42 segment, got ' + branch7Gmatch[1]);
```

In existing 7A assertions (after `assert(lock7AResult.pr_number === 42, ...)` at ~line 1155):
```js
        // Regression: Sink branch name must not duplicate the issue-N prefix
        assert(!/issue-42-issue-42/.test(state7A), '7A regression: Sink block must not contain doubled issue-42 segment');
        assert(/^branch: workflow\/issue-42-epic7a$/m.test(state7A), '7A regression: Sink branch must be workflow/issue-42-epic7a');
```

---

## Build Sequence

**Group 1 (parallel — disjoint write sets):**
- Task 1A: `scripts/kaola-workflow-roadmap.js`
- Task 1B: `plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js`
- Task 2A: `scripts/kaola-workflow-claim.js`
- Task 2B: `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`

**Group 2 (sequential — depends on Group 1):**
- Task 3: `scripts/simulate-workflow-walkthrough.js`

**Group 3 (sequential — depends on Group 2):**
- Validation: `node scripts/simulate-workflow-walkthrough.js`
- Mirror parity: `diff -u scripts/kaola-workflow-roadmap.js plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js`
- Mirror parity: `diff -u scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js`

## Parallelization Plan

| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| 1 | 1A, 1B, 2A, 2B | Disjoint files |
| 2 | 3 | Depends on Group 1 (tests exercise new behavior) |
| 3 | validation | Depends on Group 2 |

## Required Imports

All symbols already imported — no new `require()` statements needed in any file.

## Out of Scope

- `scripts/kaola-workflow-classifier.js` — untouched
- `scripts/kaola-workflow-sink-merge.js` — untouched
- `scripts/kaola-workflow-sink-pr.js` — untouched
- `scripts/kaola-workflow-repair-state.js` — untouched
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` — untouched
- ROADMAP.md schema — no new fields
- CHANGELOG/README — pre-commit checklist items only

## Validation Commands

```bash
node scripts/simulate-workflow-walkthrough.js
# → must exit 0 with "Workflow walkthrough simulation passed"

diff -u scripts/kaola-workflow-roadmap.js plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js
# → no output

diff -u scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js
# → no output
```
