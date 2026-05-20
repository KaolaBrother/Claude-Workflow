# Phase 3 - Plan: issue-128

## Blueprint

### Files to Create
None.

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js` | Insert 2-line inline worktree guard after fetch block (after line 300), before `// Checkout branch` | Parity with GitHub: check clean worktree before checkout in real pipeline |
| `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js` | Identical insertion after fetch block (after line 299), before `// Checkout branch` | Same as GitLab |
| `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js` | Add dirty-worktree subprocess test block after line 568 (after `}` closing live-folder guard block) | Prove guard exits 1 on dirty tracked file |
| `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js` | Add "Test 21" dirty-worktree subprocess test block after line 535 (after `}` closing Test 20) | Same as GitLab; no `--root` flag |
| `CHANGELOG.md` | Add entry under `[Unreleased]` | Document user-visible change |

### Build Sequence
1. Task A and Task B are independent (disjoint write sets) — run in parallel
2. Task C (CHANGELOG) is independent of A and B — can run in parallel

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | Task A | GitLab files only |
| B | Task B | Gitea files only |
| C | Task C | CHANGELOG only |

All three groups are fully disjoint. Tasks A, B, C may run in parallel.

### External Dependencies
None. Uses existing `execFileSync` (already imported), existing `assert` helper (already defined in each file).

## Task List

### Task A: GitLab inline guard + dirty-worktree test
- File: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js`
- Test File: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`
- Write Set: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js`, `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`
- Depends On: none
- Parallel Group: A
- Action: MODIFY both files

**Implement in `kaola-gitlab-workflow-sink-merge.js`:**

Insert after line 300 (the closing `}` of the fetch block), before line 302 (`// Checkout branch`):

```js
  const status = execFileSync('git', ['-C', mainRoot, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim();
  assert(!status, 'Worktree must be clean before direct merge sink runs');
```

The context for the insertion (lines 298–303 currently):
```js
  if (!OFFLINE) {
    execFileSync('git', ['-C', mainRoot, 'fetch', 'origin'], { encoding: 'utf8' });
  }

  // Checkout branch
  execFileSync('git', ['-C', mainRoot, 'checkout', args.branch], { encoding: 'utf8' });
```

After insertion:
```js
  if (!OFFLINE) {
    execFileSync('git', ['-C', mainRoot, 'fetch', 'origin'], { encoding: 'utf8' });
  }

  const status = execFileSync('git', ['-C', mainRoot, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim();
  assert(!status, 'Worktree must be clean before direct merge sink runs');

  // Checkout branch
  execFileSync('git', ['-C', mainRoot, 'checkout', args.branch], { encoding: 'utf8' });
```

**Implement in `test-gitlab-sinks.js`:**

Insert after line 568 (the closing `}` of the live-folder guard block, before `// maybeAutoMergeFromConfig tests`):

```js
// assertCleanWorktree guard — exits 1 with 'Worktree must be clean'
{
  const sinkScript = path.join(__dirname, 'kaola-gitlab-workflow-sink-merge.js');
  const { root, branch } = setupRealRepo('dirty-worktree-gl-test', 'test-gl-dirty');
  fs.writeFileSync(path.join(root, 'README.md'), 'dirty content');
  const result = spawnSync(process.execPath, [sinkScript, '--project', 'test-gl-dirty', '--branch', branch, '--root', root], {
    cwd: root,
    env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' },
    encoding: 'utf8'
  });
  assert(result.status === 1, `dirty-worktree guard test: expected exit 1, got ${result.status}. stderr: ${result.stderr}`);
  assert((result.stderr || '').includes('Worktree must be clean'),
    `dirty-worktree guard test: expected 'Worktree must be clean' in stderr, got: ${result.stderr}`);
  console.log('dirty-worktree guard subprocess test passed');
}
```

- Mirror: subprocess test pattern from `test-gitlab-sinks.js` lines 555–568 (live-folder guard block); uses `setupRealRepo` + `KAOLA_WORKFLOW_OFFLINE=1` + `spawnSync` + assert status + assert stderr
- Validate: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

**CRITICAL — After validation passes:**
Run from inside the worktree (`cd $KAOLA_WORKTREE_PATH`):
```bash
git add plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js
git commit -m "fix(gitlab): add clean-worktree guard before checkout in runDirectMerge"
```
Do NOT skip this. cmdFinalize only commits archive files; uncommitted implementation will be lost when the worktree is deleted.

---

### Task B: Gitea inline guard + dirty-worktree test
- File: `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js`
- Test File: `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js`
- Write Set: `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js`, `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js`
- Depends On: none
- Parallel Group: B
- Action: MODIFY both files

**Implement in `kaola-gitea-workflow-sink-merge.js`:**

Insert after line 299 (the closing `}` of the fetch block), before line 301 (`// Checkout branch`):

```js
  const status = execFileSync('git', ['-C', mainRoot, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim();
  assert(!status, 'Worktree must be clean before direct merge sink runs');
```

The context for the insertion (lines 297–302 currently):
```js
  if (!OFFLINE) {
    execFileSync('git', ['-C', mainRoot, 'fetch', 'origin'], { encoding: 'utf8' });
  }

  // Checkout branch
  execFileSync('git', ['-C', mainRoot, 'checkout', args.branch], { encoding: 'utf8' });
```

After insertion (identical structure to GitLab):
```js
  if (!OFFLINE) {
    execFileSync('git', ['-C', mainRoot, 'fetch', 'origin'], { encoding: 'utf8' });
  }

  const status = execFileSync('git', ['-C', mainRoot, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim();
  assert(!status, 'Worktree must be clean before direct merge sink runs');

  // Checkout branch
  execFileSync('git', ['-C', mainRoot, 'checkout', args.branch], { encoding: 'utf8' });
```

**Implement in `test-gitea-sinks.js`:**

Insert after line 535 (the closing `}` of Test 20 live-folder block, before `// maybeAutoMergeFromConfig tests`):

```js
// Test 21: assertCleanWorktree guard — exits 1 with 'Worktree must be clean'
{
  const sinkScript = path.join(__dirname, 'kaola-gitea-workflow-sink-merge.js');
  const { root, branch } = setupRealRepo('dirty-worktree-gt-test', 'test-gt-dirty');
  fs.writeFileSync(path.join(root, 'README.md'), 'dirty content');
  const result = spawnSync(process.execPath, [sinkScript, '--project', 'test-gt-dirty', '--branch', branch], {
    cwd: root,
    env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' },
    encoding: 'utf8'
  });
  assert(result.status === 1, `dirty-worktree guard test: expected exit 1, got ${result.status}. stderr: ${result.stderr}`);
  assert((result.stderr || '').includes('Worktree must be clean'),
    `dirty-worktree guard test: expected 'Worktree must be clean' in stderr, got: ${result.stderr}`);
  console.log('dirty-worktree guard subprocess test passed');
}
```

Note: No `--root` flag — Gitea uses `process.cwd()` auto-discovery. `cwd: root` in `spawnSync` options covers it.

- Mirror: subprocess test pattern from `test-gitea-sinks.js` lines 522–535 (Test 20 live-folder block); uses `setupRealRepo` + `KAOLA_WORKFLOW_OFFLINE=1` + `spawnSync` + assert status + assert stderr; no `--root` flag
- Validate: `node plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js`

**CRITICAL — After validation passes:**
Run from inside the worktree (`cd $KAOLA_WORKTREE_PATH`):
```bash
git add plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js
git commit -m "fix(gitea): add clean-worktree guard before checkout in runDirectMerge"
```
Do NOT skip this. cmdFinalize only commits archive files; uncommitted implementation will be lost when the worktree is deleted.

---

### Task C: CHANGELOG entry
- File: `CHANGELOG.md`
- Test File: N/A
- Write Set: `CHANGELOG.md`
- Depends On: none
- Parallel Group: C
- Action: MODIFY

Add under `[Unreleased]` section (create `### Fixed` header if not present under Unreleased):
```markdown
### Fixed
- Add clean-worktree guard before branch checkout in GitLab and Gitea `runDirectMerge` pipelines, matching the GitHub baseline (KaolaBrother/Kaola-Workflow#128)
```

- Validate: visual review
- No worktree commit needed for CHANGELOG (no test validation required; can be staged with implementation commits or alone)

---

## Advisor Notes

- Plan is sound; Option B confirmed correct.
- Use plain `status` (no `_cw` prefix) — `status` only appears in helper function body (different scope from `runDirectMerge`), no shadowing.
- Final Phase 6 validation: `npm test` (full suite, catches validate-script-sync).
- Per-task validation: individual test file commands as specified above.
- Implementation commit from worktree is a hard gate per task before Phase 6 cmdFinalize.

See: `.cache/advisor-plan.md`

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | no gaps found by advisor | advisor found no blueprint gaps requiring revision |
