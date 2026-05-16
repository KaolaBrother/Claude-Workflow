# Code Explorer Output — issue-28

## Bug Summary
When a session is claimed, the feature branch name contains the issue number twice:
`workflow/issue-38-issue-38` instead of `workflow/issue-38-<slug>` or `workflow/issue-38`.

---

## Root Cause: Two Gaps

### Gap 1 — Missing `project-name` subcommand in roadmap.js
`scripts/kaola-workflow-roadmap.js` `main()` dispatch (lines 214–221):
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
Calling `project-name` throws (exit 1, stderr only). The subprocess error is swallowed by `catch (_) {}` in `projectNameForIssue`.

### Gap 2 — Silent catch returns `issue-{N}` fallback used as slug
`scripts/kaola-workflow-claim.js` lines 698–707 (`projectNameForIssue`):
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

### Gap 3 — Branch construction concatenates fallback as slug
`buildSinkBlock` line 383:
```js
const branchName = lockData.issue_number != null
  ? 'workflow/issue-' + lockData.issue_number + '-' + lockData.project
  : (lockData.branch || 'workflow/' + lockData.project);
```
When `lockData.project === 'issue-38'` → produces `workflow/issue-38-issue-38`.

Same pattern at `watch-pr` reconstruction line 1503–1506:
```js
const branchName = lock.branch || (lock.issue_number != null
  ? 'workflow/issue-' + lock.issue_number + '-' + lock.project
  : 'workflow/' + lock.project);
```

---

## Key Utility Functions

### `field()` — in both claim.js (line 21) and roadmap.js (line 9)
```js
function field(content, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = content.match(new RegExp('^' + escaped + ':\\s*(.+)$', 'm'));
  return m ? m[1].trim() : '';
}
```

### `roadmapDir()` and `roadmapIssuePath()` — in claim.js (lines 570–574)
```js
function roadmapDir(root) { return path.join(root, 'kaola-workflow', '.roadmap'); }
function roadmapIssuePath(root, issueNumber) {
  return path.join(roadmapDir(root), 'issue-' + issueNumber + '.md');
}
```

### `getRoot()` — in roadmap.js (lines 15–24)
```js
function getRoot() {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch (_) { return process.cwd(); }
}
```
`claim.js` also has a local copy.

### `roadmapDir()` — in roadmap.js (lines 52–54)
```js
function roadmapDir(root) { return path.join(root, 'kaola-workflow', '.roadmap'); }
```

---

## `pickFirstActionableIssue` — duplicate bug (lines 727–747)
```js
function pickFirstActionableIssue(classifierScript, issues) {
  for (let i = 0; i < issues.length; i++) {
    const N = issues[i];
    try {
      const raw = execFileSync(process.execPath, [classifierScript, 'classify', '--issue', String(N)], { encoding: 'utf8' });
      const result = JSON.parse(raw);
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
    } catch (_) {}
  }
  return { pick: null };
}
```
Same `project-name` subprocess call with same silent catch. Can be refactored to call `projectNameForIssue` directly.

---

## Test File Patterns

**Assert function** (lines 10–13):
```js
function assert(condition, message) {
  if (!condition) { throw new Error(message); }
}
```

**Key helper assertions:**
- `assert(cond, msg)` — raw boolean
- `assertNext(stateFile, expected)` — checks `next_command:` field
- `assertFileIncludes(file, needle)` — file content includes string
- `assertCommandIncludes(relativePath, needles)` — script source includes strings

**Relevant test section — Epic Case 5 (lines 672–786):**
Tests `generate`, `migrate`, `validate`, `init-issue` for roadmap.js. New `project-name` test (5G) should be added here.

Typical pattern:
```js
const outSomething = execFileSync(process.execPath,
  [roadmapScriptPath, 'subcommand', '--arg', 'value'],
  { cwd: tmpDir, encoding: 'utf8' });
assert(outSomething.trim() === 'expected', 'Epic Case 5G: description, got ' + outSomething.trim());
```

---

## Mirror Pattern
`scripts/` and `plugins/kaola-workflow/scripts/` are byte-for-byte identical.
Every change must be applied to **both** copies. No symlink or import relationship.

---

## Recommended Fix Approach

### Fix 1 — `roadmap.js`: Add `cmdProjectName` subcommand
```js
function cmdProjectName(argv) {
  const args = parseArgs(argv);
  const n = Number(args['issue']);
  if (!Number.isInteger(n) || n <= 0) {
    process.stderr.write('--issue must be a positive integer\n');
    process.exitCode = 1;
    return;
  }
  const filePath = path.join(roadmapDir(getRoot()), 'issue-' + n + '.md');
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const name = field(content, 'workflow_project').replace(/\|/g, '').trim();
    if (name && name !== '—') { process.stdout.write(name + '\n'); return; }
  } catch (_) {}
  process.exitCode = 1;
}
// In main():
if (sub === 'project-name') { cmdProjectName(process.argv.slice(3)); return; }
```

### Fix 2 — `claim.js`: Fix `projectNameForIssue` to use direct file read
```js
function projectNameForIssue(classifierScript, issueNumber) {
  try {
    const root = getRoot();
    const content = fs.readFileSync(roadmapIssuePath(root, issueNumber), 'utf8');
    const name = field(content, 'workflow_project').replace(/\|/g, '').trim();
    if (name && name !== '—') return name;
  } catch (_) {}
  return 'issue-' + issueNumber;
}
```

### Fix 3 — `claim.js`: Refactor `pickFirstActionableIssue` to call `projectNameForIssue`
Replace lines 734–741 with a single call to `projectNameForIssue(classifierScript, N)`.

### Fix 4 — `claim.js`: Add `buildSinkBranchName` defensive helper
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
Use in `buildSinkBlock` (line 383) and `watch-pr` reconstruction (line 1504).

### All four fixes must be mirrored to plugin copies.

---

## Files to Modify
1. `scripts/kaola-workflow-roadmap.js` — add `cmdProjectName`
2. `plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js` — mirror
3. `scripts/kaola-workflow-claim.js` — fix `projectNameForIssue`, refactor `pickFirstActionableIssue`, add `buildSinkBranchName`, update `buildSinkBlock` and `watch-pr`
4. `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` — mirror
5. `scripts/simulate-workflow-walkthrough.js` — add test assertions (Epic Case 5G + branch name unit tests)
