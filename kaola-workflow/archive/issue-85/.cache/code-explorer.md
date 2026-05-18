# Code Explorer — Issue #85: E2E Regression Coverage

## Existing Test Coverage (Gaps)

### `scripts/simulate-workflow-walkthrough.js` — 28 tests currently

**Multi-step tests that cover individual segments (not full chain):**
- `testFinalizeReleaseCleansWorktree` (line 573): startup → finalize/release for 4 issues; worktree cleanup; no sink
- `testFinalizeFromLinkedWorktreeCleansMainCopy` (line 611): finalize from linked worktree; dual-cleanup; no startup call
- `testSinkMergeFromLinkedWorktree` (line 748): sink-merge from linked worktree with real FF-merge + branch deletion; no startup call, manually planted files
- `testSinkPrLeavesCleanWorktree` (line 913, async): sink-pr OFFLINE; clean worktree + pr_url; no startup or finalize
- `testStartupJsonAndSiblingWorktrees` (line 421): two issue startups → worktree paths correct; no independence/finalize assertion

**No full E2E chain exists**: startup → parallel claim → finalize → sink → no active folder/worktree.

### `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` (Codex)

5 assertions only: startup acquires, second startup returns owned, status shows count 1, next-skill file contains text, validator exists. No finalize/sink/parallel.

### GitLab simulate files

`simulate-gitlab-workflow-walkthrough.js`: `testFallbackGuardsAfterArchive` (archive guards) + 3 sub-scripts. No startup→finalize→sink chain.

## Key Technical Facts

### OFFLINE Support

- GitHub `kaola-workflow-claim.js`: full OFFLINE support via `KAOLA_WORKFLOW_OFFLINE=1` — startup, finalize, status, release, watch-pr all work offline (worktree provisioning skipped when OFFLINE or no git history)
- `scripts/kaola-workflow-sink-merge.js`: OFFLINE-compatible (git fetch skipped, issue close skipped, merge-base check treats offline as up-to-date)
- `scripts/kaola-workflow-sink-pr.js`: OFFLINE-compatible (sets `prUrl = 'OFFLINE_PLACEHOLDER'`, metadata commit still runs)
- **GitLab `kaola-gitlab-workflow-claim.js`**: NO `KAOLA_WORKFLOW_OFFLINE` reference — OFFLINE mode completely unsupported
- **`kaola-gitlab-workflow-sink-merge.js`, `kaola-gitlab-workflow-sink-mr.js`**: NO OFFLINE guard — require live GitLab API

### Test Patterns

**spawnSync pattern** (sync tests):
```js
function testFoo() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-'));
  try {
    // arrange: git init, commits, worktrees, planted files
    // act: runNode(claimScript, [...args], tmp)
    // assert: json(result).field === value
    assert(!fs.existsSync(path.join(tmp, ...)), 'msg')
    console.log('testFoo: PASSED');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
```

**spawn pattern** (async, when git stdout streaming needed):
```js
async function testFoo() {
  const tmp = fs.mkdtempSync(...);
  try { ... await runNodeAsync(...); ... } finally { fs.rmSync(...); }
}
```

**Real git repo setup** (from `testSinkMergeFromLinkedWorktree`):
```js
execFileSync('git', ['init', '-b', 'main'], { cwd: tmp });
execFileSync('git', ['config', 'user.email', 'x@x.com'], { cwd: tmp });
execFileSync('git', ['config', 'user.name', 'x'], { cwd: tmp });
execFileSync('git', ['commit', '--allow-empty', '-m', 'init'], { cwd: tmp });
execFileSync('git', ['worktree', 'add', '-b', 'workflow/issue-N', wtPath, 'HEAD'], { cwd: tmp });
```

### `cmdStartup` (lines 366-383)

- Requires `--target-issue N`
- OFFLINE: worktree provisioning skipped (no git worktree add)
- Returns `{ verdict, claim: 'acquired'|'owned', selected_project, selected_issue, target_source, worktree_path }`
- Creates `kaola-workflow/<project>/workflow-state.md`

### `cmdFinalize` (lines 441-452)

- `--project <name>` required; `--keep-worktree` optional
- Renames `kaola-workflow/<project>` → `kaola-workflow/archive/<project>`
- Stamps `status: closed`, `step: complete`
- If cwd is linked worktree, also cleans `mainRoot/kaola-workflow/<project>`
- Unless `--keep-worktree`, calls `removeWorktree`
- Returns `{ status: 'closed', archived: true, dest: '<archive path>' }`

### `cmdWorktreeFinalize` (lines 531-544)

- Copies entire active folder from main worktree into linked worktree
- Used for artifact mirroring before sink
- NOT tested in current walkthrough E2E chain

### `sink-merge.js` Key Facts

- Step 0: calls `removeWorktree` on active folder's worktree before checkout
- Step 1: `assertCleanWorktree(mainRoot)` — must be clean before merge
- Steps work OFFLINE (no fetch, no push, no issue close) — merge still happens locally
- After merge: branch deleted (`postMergeCleanup`)

### `sink-pr.js` Key Facts

- OFFLINE path: sets `prUrl = 'OFFLINE_PLACEHOLDER'`, updates state, metadata commit
- Leaves worktree clean after metadata commit
- Does NOT call finalize or archive

### Sync Constraint (CRITICAL)

`scripts/validate-script-sync.js` enforces byte-identity for 7 common scripts. `simulate-*` files are explicitly excluded from the allowlist. The Claude variant (`scripts/simulate-workflow-walkthrough.js`) and Codex variant (`plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`) test different surfaces and must never be synced.

## Identified Gaps (Facts)

1. **No full GitHub merge E2E**: startup → (parallel second claim) → worktree-finalize → finalize + sink-merge → assert archive + no worktree + clean main
2. **No full GitHub PR E2E**: startup → worktree-finalize → finalize (--keep-worktree) → sink-pr (OFFLINE) → assert archive + pr_url + clean worktree
3. **No parallel independence test**: two active issues; finalize one; assert other is unaffected
4. **GitLab E2E impossible offline**: no OFFLINE guard in GitLab claim or sink scripts → can't add hermetic GitLab E2E; must document why out of scope

## Files to Add Tests

- `scripts/simulate-workflow-walkthrough.js` — 2-3 new test functions + main() calls
- No changes to Codex variant (different surface, must not sync)
- No GitLab test changes (OFFLINE not supported — document out-of-scope instead)
