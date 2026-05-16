# Phase 3 - Plan: issue-28

## Blueprint

### Files to Create
None.

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `scripts/kaola-workflow-roadmap.js` | Add `cmdProjectName`; dispatch in `main()`; update error message | Layer A: provides stable CLI for project name lookup |
| `plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js` | Mirror of above | Mirror policy: plugin and scripts must be identical |
| `scripts/kaola-workflow-claim.js` | 6 changes: add `buildSinkBranchName`, route `buildSinkBlock`, rewrite `projectNameForIssue`, collapse `pickFirstActionableIssue`, route `cmdWatchPr`, add export guard | Layer B: eliminate duplication bug at source |
| `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` | Mirror of above | Mirror policy |
| `scripts/simulate-workflow-walkthrough.js` | Add Epic Cases 5G + 5H, regression asserts in 7G + 7A | Test coverage for all new behavior |

### Build Sequence
1. Task 1A — `scripts/kaola-workflow-roadmap.js` (no deps)
2. Task 1B — `plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js` (no deps; parallel with 1A)
3. Task 2A — `scripts/kaola-workflow-claim.js` (no deps; parallel with 1A/1B)
4. Task 2B — `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` (no deps; parallel with 1A/1B/2A)
5. Task 3  — `scripts/simulate-workflow-walkthrough.js` (depends on Group 1 — tests exercise new behavior)
6. Validation — `node scripts/simulate-workflow-walkthrough.js` (depends on Task 3)
7. Mirror parity — `diff -u` on both script pairs (depends on Group 1)

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| 1 | 1A, 1B, 2A, 2B | Disjoint files |
| 2 | 3 | Depends on Group 1 |
| 3 | Validation, mirror-diff | Depends on Group 2 |

### External Dependencies
None. All symbols (`field`, `roadmapIssuePath`, `getRoot`, `roadmapDir`, `parseArgs`, `fs`, `path`, `execFileSync`) already imported in target files.

---

## Task List

### Task 1A: Add cmdProjectName to scripts/kaola-workflow-roadmap.js
- File: `scripts/kaola-workflow-roadmap.js`
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/kaola-workflow-roadmap.js`
- Depends On: none
- Parallel Group: 1
- Action: MODIFY

**Insert between `cmdInitIssue` (~line 212) and `function main()` (~line 214):**
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

**In `main()`: add dispatch before throw:**
```js
if (sub === 'project-name') { cmdProjectName(process.argv.slice(3)); return; }
```

**Update error message to include `project-name`:**
```js
throw new Error('Unknown subcommand: ' + sub + '. Use generate, migrate, validate, init-issue, or project-name.');
```

- Validate: `diff -u scripts/kaola-workflow-roadmap.js plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js` → no output

### Task 1B: Mirror to plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js
- File: `plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js`
- Write Set: `plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js`
- Depends On: none (apply same changes as 1A independently)
- Parallel Group: 1
- Action: MODIFY
- Implement: identical changes as Task 1A

### Task 2A: Six changes to scripts/kaola-workflow-claim.js
- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/kaola-workflow-claim.js`
- Depends On: none
- Parallel Group: 1
- Action: MODIFY

**Change 2A-1: Add `buildSinkBranchName` before `buildSinkBlock` (~line 381):**
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

**Change 2A-2: Route `buildSinkBlock` through helper — ADVISOR-CORRECTED:**
```js
function buildSinkBlock(lockData) {
  const branchName = buildSinkBranchName(lockData.issue_number, lockData.project, lockData.branch);
```
Note: `lockData.branch` passed as `fallbackBranch` — helper uses it only when `issueNumber == null`.

**Change 2A-3: Rewrite `projectNameForIssue` (lines 698–707) — ADVISOR-CORRECTED (ENOENT-aware):**
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

**Change 2A-4: Collapse `pickFirstActionableIssue` inline duplicate (lines 733–741):**

Replace the 8-line inline subprocess block with:
```js
if (result.verdict === 'green' || result.verdict === 'yellow') {
  return { pick: N, project: projectNameForIssue(classifierScript, N), verdict: result.verdict };
}
```

**Change 2A-5: Route `cmdWatchPr` through helper (lines 1503–1506) — ADVISOR-CORRECTED:**
```js
const state = (prData.state || '').toUpperCase();
const branchName = lock.branch || buildSinkBranchName(lock.issue_number, lock.project);
```
Note: `lock.branch` wins when stored (backward-compatible for legacy locks). Only compute fresh name when no stored branch.

**Change 2A-6: Export guard (replace unconditional tail at bottom of file):**

Replace:
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

- Validate: `diff -u scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js` → no output

### Task 2B: Mirror to plugins/kaola-workflow/scripts/kaola-workflow-claim.js
- File: `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
- Write Set: `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
- Depends On: none (apply all six changes from 2A independently)
- Parallel Group: 1
- Action: MODIFY
- Implement: identical changes as Task 2A

### Task 3: Add test cases to scripts/simulate-workflow-walkthrough.js
- File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/simulate-workflow-walkthrough.js`
- Depends On: Tasks 1A, 1B, 2A, 2B (tests exercise behavior from Group 1)
- Parallel Group: 2
- Action: MODIFY

**Change 3A: Insert Epic Cases 5G and 5H inside Epic Case 5 block (before closing `}` ~line 786):**

Epic Case 5G (4 assertions — `project-name` subcommand):
- 5G-a: init-issue with `--workflow-project guard-handoff` → `project-name --issue 38` → stdout `guard-handoff`, exit 0
- 5G-b: init-issue without `--workflow-project` (defaults to `—`) → `project-name --issue 39` → exit 1, no stdout
- 5G-c: `project-name --issue 999` (no file) → exit 1
- 5G-d: blank `workflow_project:` field → exit 1

Epic Case 5H (4 assertions — direct unit test of `buildSinkBranchName` via export guard):
- 5H-1: `buildSinkBranchName(38, 'issue-38')` → `'workflow/issue-38'`
- 5H-2: `buildSinkBranchName(38, 'guard-handoff')` → `'workflow/issue-38-guard-handoff'`
- 5H-3: `buildSinkBranchName(38, 'issue-38-guard')` → `'workflow/issue-38-guard'` (no double prefix)
- 5H-4: `buildSinkBranchName(null, 'epic7a', 'workflow/issue-42-epic7a')` → `'workflow/issue-42-epic7a'`

**Change 3B: Regression assertions:**

In existing 7G block (after `assert(state7G.includes('sink: pr'), ...)`):
```js
const branch7Gmatch = state7G.match(/^branch: (.+)$/m);
assert(branch7Gmatch, '7G regression: ## Sink must contain a branch: line');
assert(!/issue-42-issue-42/.test(branch7Gmatch[1]), '7G regression: branch must not duplicate issue-42 segment, got ' + branch7Gmatch[1]);
```

In existing 7A block (after `assert(lock7AResult.pr_number === 42, ...)`):
```js
assert(!/issue-42-issue-42/.test(state7A), '7A regression: Sink block must not contain doubled issue-42 segment');
assert(/^branch: workflow\/issue-42-epic7a$/m.test(state7A), '7A regression: Sink branch must be workflow/issue-42-epic7a');
```

- Validate: `node scripts/simulate-workflow-walkthrough.js` → exit 0, "Workflow walkthrough simulation passed"

---

## Advisor Notes

### Blocker Resolved: cmdWatchPr backward-compatibility
The architect's original Change 2A-5 passed `lock.branch` as `fallbackBranch` to `buildSinkBranchName`,
but `fallbackBranch` is only used when `issueNumber == null`. For any issue-backed lock with a stored
`branch:` field, `lock.branch` would be silently discarded and a new branch name would be computed.
This breaks backward-compatibility for locks like the current session's `branch: workflow/issue-28-issue-28`.

**Correction applied**: `const branchName = lock.branch || buildSinkBranchName(lock.issue_number, lock.project);`

### buildSinkBlock clarification
`buildSinkBranchName(lockData.issue_number, lockData.project, lockData.branch)` is used for `buildSinkBlock`.
`lockData.branch` acts as `fallbackBranch` — safe because the helper only uses it when `issueNumber == null`.
This handles anonymous sink locks (no issue) consistently.

### Pre-verifications completed (before Phase 4)
- `os` imported at line 3 of `simulate-workflow-walkthrough.js` ✅
- `cmdInitIssue` defaults `workflow_project` to `'—'` when `--workflow-project` omitted ✅

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | — | Single-line correction recorded in advisor-plan.md; no structural blueprint gap requiring revision cycle |
