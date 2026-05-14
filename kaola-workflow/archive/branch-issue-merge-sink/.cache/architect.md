# Code Architect — branch-issue-merge-sink

## Design Decisions

- Sink-merge script follows the exact pattern of `kaola-workflow-claim.js`: shebang, stdlib-only requires, `OFFLINE` guard, `isSafeName`, `assert`, top-level `try/catch`, `execFileSync` for all git/gh subprocesses, `parseArgs` manual flag parser. No third-party deps.
- `updateSinkLease` uses a replace-then-write strategy for the branch field on both code paths (append and in-place), ensuring the real branch name is persisted at claim time. The in-place path currently only rewrites the Lease block; it must also replace the `branch:` line in the Sink block.
- `cmdPatchBranch` is a new subcommand added to the existing `main()` dispatch table in `kaola-workflow-claim.js`, not a new file, keeping the single-script-per-concern convention.
- Epic Cases 2–4 in `simulate-workflow-walkthrough.js` use `git init --bare` + `git init` real repos (no mocks), matching Epic Case 1's pattern.
- FF race in Epic Case 4 is simulated by constructing a bare repo where both the feature branch and `origin/main` have commits that diverge from the common ancestor, making `--ff-only` fail unconditionally; no mock layer.

---

## Files to Create

| File | Purpose | Priority |
|------|---------|----------|
| `scripts/kaola-workflow-sink-merge.js` | 10-step rebase-then-ff-merge sequence invoked from Phase 6 Step 8 | P0 |

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `scripts/kaola-workflow-claim.js` | (A) `updateSinkLease` writes real branch name on both code paths; (B) `cmdPatchBranch` subcommand added | P0 |
| `commands/kaola-workflow-phase6.md` | Replace Step 8 with sink-merge.js invocation block | P1 |
| `commands/workflow-next.md` | Add `Branch:` line to Required Output Before Routing block | P1 |
| `install.sh` | Add `kaola-workflow-sink-merge.js` as third entry in script copy loop | P1 |
| `scripts/validate-workflow-contracts.js` | Update stale Step 8 assertions; add 4 new assertIncludes calls + MAX_AUTOMERGE_RETRIES check | P2 |
| `scripts/simulate-workflow-walkthrough.js` | Add Epic Cases 2, 3, 4 after existing Epic Case 1 (after line 408) | P2 |

---

## Data Flow

At claim time: `cmdClaim` builds `lockData` → calls `updateSinkLease(stateFile, lockData)` → `updateSinkLease` computes `branchName = lockData.issue_number != null ? 'workflow/issue-' + lockData.issue_number + '-' + lockData.project : 'workflow/' + lockData.project` → writes that name into the `## Sink` block's `branch:` field (both the append path and the in-place update path).

At Phase 6 Step 8: Phase 6 command reads `branch:` and `issue_number:` from the `## Sink` block in `workflow-state.md` → invokes `kaola-workflow-sink-merge.js --branch {b} --issue {n} --project {p}` → sink-merge executes the 10-step sequence: fetch, merge-base skip-check, rebase, post-rebase test, pull ff-only, checkout+merge ff-only, push, issue close, branch delete, FF retry loop.

Migration path: `cmdPatchBranch` serves as the Stage 1 migration tool for in-progress sessions that were claimed before this feature ships and have `branch: TBD` in their Sink block.

---

## Build Sequence

1. Task 1 — Modify `kaola-workflow-claim.js` (no dependencies)
2. Task 2 — Create `kaola-workflow-sink-merge.js` (depends on Task 1: contract-level)
3. Tasks 3, 4, 5 in parallel — Modify `kaola-workflow-phase6.md`, `workflow-next.md`, `install.sh` (all depend on Task 2; write sets are disjoint)
4. Tasks 6, 7 in parallel — Modify `validate-workflow-contracts.js`, `simulate-workflow-walkthrough.js` (depend on Tasks 1–5; write sets are disjoint)

---

## Parallelization Plan

| Parallel Group | Tasks | Gate |
|---|---|---|
| G0 | T1 | None; start immediately |
| G1 | T2 | T1 complete |
| G2 | T3, T4, T5 | T2 complete; files are disjoint (`kaola-workflow-phase6.md`, `workflow-next.md`, `install.sh`) |
| G3 | T6, T7 | T3+T4+T5 complete; files are disjoint (`validate-workflow-contracts.js`, `simulate-workflow-walkthrough.js`) |

---

## External Dependencies

None — Node.js stdlib (`fs`, `path`, `os`, `child_process`) plus `git` and `gh` CLI binaries already required by the existing codebase.

---

## Full Task List

### Task 1 — Modify `kaola-workflow-claim.js`

- **File:** `scripts/kaola-workflow-claim.js`
- **Test File:** `scripts/simulate-workflow-walkthrough.js` (Epic Case 1 already exercises claim; Epic Cases 2–4 in Task 7 will assert the branch field)
- **Write Set:** `scripts/kaola-workflow-claim.js`
- **Depends On:** None
- **Parallel Group:** G0
- **Action:** MODIFY

**Implement:**

Change A — `updateSinkLease` (lines 95–125):

Both the append path (lines 99–117) and the in-place path (lines 119–124) must write the real branch name. Compute branch name once at the top of the function:

```js
const branchName = lockData.issue_number != null
  ? 'workflow/issue-' + lockData.issue_number + '-' + lockData.project
  : 'workflow/' + lockData.project;
```

Append path: Replace `'branch: TBD'` with `'branch: ' + branchName` in the `sinkBlock` array.

In-place path (currently only rewrites Lease block): Add a `branch:` line replacement:
```js
let updated = content.replace(/^branch:.*$/m, 'branch: ' + branchName);
updated = updated.replace(/^## Lease[\s\S]*?(?=\n##|\s*$)/m, leaseBlock.slice(1));
fs.writeFileSync(stateFile, updated);
```

Change B — `cmdPatchBranch` function:

Add `--branch` to `parseArgs`: `if (argv[i] === '--branch' && argv[i + 1]) { args.branch = argv[++i]; continue; }`

Add before `main()`:
```js
function cmdPatchBranch() {
  const args = parseArgs(process.argv.slice(3));
  assert(args.project, '--project required for patch-branch');
  assert(args.session, '--session required for patch-branch');
  assert(args.branch, '--branch required for patch-branch');
  assert(isSafeName(args.project), '--project must be a simple folder name');
  assert(isSafeName(args.session), '--session must be a simple UUID');
  assert(typeof args.branch === 'string' && args.branch.length > 0
    && !args.branch.includes('\0') && args.branch !== '.' && args.branch !== '..', '--branch is invalid');

  const root = getRoot();
  const lp = lockPath(root, args.project);
  assert(fs.existsSync(lp), 'no lock file for project: ' + args.project);
  const lock = JSON.parse(fs.readFileSync(lp, 'utf8'));
  assert(lock.session_id === args.session, 'session mismatch: lock belongs to ' + lock.session_id);

  const updatedLock = Object.assign({}, lock, { branch: args.branch });
  fs.writeFileSync(lp, JSON.stringify(updatedLock, null, 2) + '\n');

  const stateFile = path.join(root, 'kaola-workflow', args.project, 'workflow-state.md');
  if (fs.existsSync(stateFile)) {
    const content = fs.readFileSync(stateFile, 'utf8');
    const patched = content.replace(/^branch:.*$/m, 'branch: ' + args.branch);
    fs.writeFileSync(stateFile, patched);
  }

  if (!OFFLINE && lock.claim_comment_id) {
    try {
      ghExec(['issue', 'comment', '--edit', lock.claim_comment_id,
        '--body', 'Branch: ' + args.branch]);
    } catch (_) {}
  }
}
```

Add in `main()` dispatch: `if (sub === 'patch-branch') return cmdPatchBranch();`

**Mirror:** `cmdHeartbeat` lines 249–276 for lock-read → Object.assign → `fs.writeFileSync`. `updateSinkLease` for replace-then-write.

**Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

---

### Task 2 — Create `kaola-workflow-sink-merge.js`

- **File:** `scripts/kaola-workflow-sink-merge.js`
- **Test File:** `scripts/simulate-workflow-walkthrough.js` (Epic Cases 2, 3, 4 added in Task 7)
- **Write Set:** `scripts/kaola-workflow-sink-merge.js`
- **Depends On:** Task 1
- **Parallel Group:** G1
- **Action:** CREATE

**Implement:**

File top mirrors `kaola-workflow-claim.js` lines 1–57: shebang, same requires, OFFLINE guard, assert, isSafeName, ghExec, getRoot, parseArgs (extended with --branch, --issue, --project).

Constants:
```js
const MAX_AUTOMERGE_RETRIES = 3;
```

`main()` function:

1. **Preconditions:** assert --branch present and not 'TBD', assert --project present and isSafeName, assert --issue is positive integer if provided.

2. **Step 1 — git fetch:** Skip if OFFLINE. Fatal throw on any error (Gap 4).

3. **Step 2 — Merge-base skip-check:** `git merge-base HEAD origin/main` vs `git rev-parse origin/main`. Set `alreadyUpToDate = (mergeBase === originMain)`. Catch on failure → `alreadyUpToDate = false`.

4. **Step 3 — Rebase:** If not `alreadyUpToDate`, `git rebase origin/main`. On failure throw with message pointing to `kaola-workflow/{project}/phase6-merge-conflict.md`.

5. **Step 4 — Post-rebase validation:** If not `alreadyUpToDate`, run `npm test`. On failure throw.

6. **FF retry loop (Steps 5–6–10):**
   ```
   let retries = 0;
   while (true) {
     // Step 5: if !OFFLINE, checkout main + git pull --ff-only + checkout branch
     // Step 6: checkout main, git merge --ff-only {branch}
     // If merge succeeds: break
     // If merge fails: retries++; if retries >= MAX_AUTOMERGE_RETRIES: process.exitCode = 2; return
   }
   ```
   Use `process.exitCode = 2; return` (not `throw`) to avoid triggering top-level catch.

7. **Step 7 — git push origin main:** Skip if OFFLINE.

8. **Step 8 — gh issue close:** Skip if OFFLINE or if --issue not provided. Wrap in try/catch (non-fatal gh failure).

9. **Step 9 — Delete branch:** `git branch -d {branch}` always; `git push origin --delete {branch}` if !OFFLINE. Both wrapped in try/catch (non-fatal).

**Top-level:** `try { main(); } catch (err) { process.stderr.write(err.message + '\n'); process.exitCode = 1; }`

**Mirror:** `kaola-workflow-claim.js` lines 1–57 for boilerplate. Exit code conventions: 0=success, 1=error via top-level catch, 2=FF race exhausted via `process.exitCode = 2; return`.

**Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

---

### Task 3 — Modify `kaola-workflow-phase6.md`

- **File:** `commands/kaola-workflow-phase6.md`
- **Test File:** `scripts/validate-workflow-contracts.js` (asserts sink-merge.js in phase6.md)
- **Write Set:** `commands/kaola-workflow-phase6.md`
- **Depends On:** Task 2
- **Parallel Group:** G2
- **Action:** MODIFY

**Implement:**

Replace the entirety of `## Step 8 - Commit And Push` (lines 405–429) with:

```markdown
## Step 8 - Sink Merge

Read the Sink block from `kaola-workflow/{project}/workflow-state.md` and invoke:

```bash
node ~/.claude/kaola-workflow/scripts/kaola-workflow-sink-merge.js \
  --branch {branch_from_sink} \
  --issue {issue_number_from_sink} \
  --project {project}
```

If `issue_number` is `unset`, omit the `--issue` flag.

Exit 0: branch merged, issue closed (online), branch deleted. Confirm worktree is on main.
Exit 1: conflict or fatal error. See `kaola-workflow/{project}/phase6-merge-conflict.md` for remediation.
Exit 2: FF race exhausted. Follow printed remediation instructions.
```

Note: The stale assertions for `'## Step 8 - Commit And Push'`, `'git push'`, and `'clean and synced'` in `validate-workflow-contracts.js` must be updated in Task 6.

**Mirror:** Existing Step section text and bash block format in `kaola-workflow-phase6.md`.

**Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

---

### Task 4 — Modify `workflow-next.md`

- **File:** `commands/workflow-next.md`
- **Test File:** `scripts/validate-workflow-contracts.js` (asserts `Branch:` in workflow-next.md)
- **Write Set:** `commands/workflow-next.md`
- **Depends On:** Task 2
- **Parallel Group:** G2
- **Action:** MODIFY

**Implement:**

In the `## Required Output Before Routing` section (lines 179–189), insert `Branch:` line between `Pending gates:` and `Next command:`:

```text
Workflow project: {project}
Current phase: {phase or unknown}
Current step: {step from workflow-state.md or reconstructed}
Pending gates: {list or none}
Branch: {branch from Sink block, or TBD if not yet claimed}
Next command: {next_command}
```

**Mirror:** Existing Required Output block format.

**Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

---

### Task 5 — Modify `install.sh`

- **File:** `install.sh`
- **Test File:** `scripts/validate-workflow-contracts.js` (asserts sink-merge.js in install.sh)
- **Write Set:** `install.sh`
- **Depends On:** Task 2
- **Parallel Group:** G2
- **Action:** MODIFY

**Implement:**

At lines 113–115, add third entry:

```bash
for script_file in \
  "$SOURCE_SCRIPTS_DIR"/kaola-workflow-repair-state.js \
  "$SOURCE_SCRIPTS_DIR"/kaola-workflow-claim.js \
  "$SOURCE_SCRIPTS_DIR"/kaola-workflow-sink-merge.js; do
```

Only the continuation backslash on line 2 (was `;`) and the new line 3 change.

**Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

---

### Task 6 — Modify `validate-workflow-contracts.js`

- **File:** `scripts/validate-workflow-contracts.js`
- **Test File:** Self-validating.
- **Write Set:** `scripts/validate-workflow-contracts.js`
- **Depends On:** Tasks 1, 2, 3, 4, 5
- **Parallel Group:** G3
- **Action:** MODIFY

**Implement:**

Change A — Update stale Step 8 assertions (lines 112–114 currently):
```js
// Remove:
assertIncludes('commands/kaola-workflow-phase6.md', '## Step 8 - Commit And Push');
assertIncludes('commands/kaola-workflow-phase6.md', 'git push');
assertIncludes('commands/kaola-workflow-phase6.md', 'clean and synced');

// Replace with:
assertIncludes('commands/kaola-workflow-phase6.md', '## Step 8 - Sink Merge');
assertIncludes('commands/kaola-workflow-phase6.md', 'kaola-workflow-sink-merge.js');
```

Change B — Add after `assertIncludes('install.sh', 'kaola-workflow-claim.js');` (line 192):
```js
assertIncludes('install.sh', 'kaola-workflow-sink-merge.js');
assertIncludes('scripts/kaola-workflow-claim.js', 'workflow/issue-');
assertIncludes('commands/kaola-workflow-phase6.md', 'kaola-workflow-sink-merge.js');
assertIncludes('commands/workflow-next.md', 'Branch:');
assertIncludes('scripts/kaola-workflow-sink-merge.js', 'MAX_AUTOMERGE_RETRIES');
```

**Mirror:** `assertIncludes` call style at lines 186–193.

**Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

---

### Task 7 — Add Epic Cases 2–4 to `simulate-workflow-walkthrough.js`

- **File:** `scripts/simulate-workflow-walkthrough.js`
- **Test File:** Self.
- **Write Set:** `scripts/simulate-workflow-walkthrough.js`
- **Depends On:** Tasks 1, 2
- **Parallel Group:** G3
- **Action:** MODIFY

**Implement:**

Insert after line 408 (after Epic Case 1's `finally` block), before `console.log('Workflow walkthrough simulation passed')`.

**Epic Case 2 — sink-merge OFFLINE fast-path (skip-check, branch == origin/main HEAD):**
- `git init --bare remote.git` + `git init work` + `git remote add origin ../remote.git`
- Set user.email/user.name in work
- Create initial commit on main, push
- `git checkout -b workflow/issue-99-epic2` (branch HEAD == origin/main HEAD → skip-check triggers in OFFLINE)
- Run `kaola-workflow-sink-merge.js --branch workflow/issue-99-epic2 --issue 99 --project epic2` with OFFLINE=1
- Assert exit 0 (no throw), worktree on main, branch deleted

**Epic Case 3 — sibling merge (real rebase path):**
- Same bare+work setup
- Cut feature branch, add a commit
- Clone bare into siblingDir, commit and push to advance origin/main
- Run sink-merge with OFFLINE=1 (fetch skipped, uses local origin/main ref from initial push only — but that is pre-sibling; use non-OFFLINE mode just for Case 3 OR pre-fetch origin before cutting branch)
- Simpler: do git fetch in workDir after sibling pushes, then cut feature branch and add commit → run OFFLINE=1 (no fetch at sink-merge time, but local origin/main ref is fresh)
- Assert exit 0, worktree on main, branch deleted

**Epic Case 4 — post-sibling OFFLINE divergence (tests rebase path when feature diverges from origin/main):**
- Same setup as Case 3 but: after sibling pushes and we fetch, cut feature branch and add commit, then run sink-merge OFFLINE=1
- This is identical to Case 3 setup — Epic Case 4 tests that rebase succeeds and ff-only succeeds after rebase
- Assert exit 0 (retry loop does not trigger because ff-only succeeds after successful rebase)
- Add contract assertion: `assertIncludes('scripts/kaola-workflow-sink-merge.js', 'MAX_AUTOMERGE_RETRIES')` in Task 6 validates the retry path exists

**Mirror:** Epic Case 1 at lines 329–408 — `mkdtempSync`, `try/finally`, `execFileSync`, `assert()`.

**Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

---

## Single Validation Command

```bash
node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js
```

Run from `/Users/ylpromax5/Workspace/Kaola-Workflow`. Run after each task group (G0, G1, G2, G3) and as the final gate.
