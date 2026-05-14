# Code Architect Revision 1 — branch-issue-merge-sink

## Design Decisions

- Branch creation lives in a new `## Step 6 - Cut Feature Branch` appended to `commands/kaola-workflow-phase1.md`, after Step 5 (Write Phase File) so `workflow-state.md` already holds the `branch:` value when Step 6 reads it. This placement is idempotent on resume.
- OFFLINE skip applied to `npm test` in sink-merge.js Step 4, consistent with C-refined-A and matching Steps 1/5/7/8/9 which already skip network ops. Callers in OFFLINE mode own their own validation.
- FF race retry exhaustion tested via `KAOLA_WORKFLOW_FORCE_FF_FAIL=N` env flag consumed only by sink-merge.js. The forced fail check fires inside the FF retry loop BEFORE `git merge --ff-only`, so the forced-fail increments the same retry counter as a real FF failure.
- `phase6-merge-conflict.md` remediation is inlined as a multi-line string in sink-merge.js Step 3's error message. No new file, no new task, no new build sequence entry.
- All non-blocking advisor items from phase2-ideation.md (Gap 1 no-issue fallback, Gap 4 fetch failure fatal, Gap 2 Stage 1 migration) remain handled as originally specified.

---

## Files to Create

| File | Purpose | Priority |
|------|---------|----------|
| `scripts/kaola-workflow-sink-merge.js` | 10-step rebase-then-ff-merge sequence invoked from Phase 6 Step 8 | P0 |

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `scripts/kaola-workflow-claim.js` | (A) `updateSinkLease` writes real branch name on both code paths; (B) `cmdPatchBranch` subcommand; (C) `--branch` flag added to `parseArgs` | P0 |
| `commands/kaola-workflow-phase1.md` | Add new `## Step 6 - Cut Feature Branch` section after Step 5 | P1 |
| `commands/kaola-workflow-phase6.md` | Replace Step 8 `Commit And Push` with `Sink Merge` invocation block | P1 |
| `commands/workflow-next.md` | Add `Branch:` line to Required Output Before Routing block | P1 |
| `install.sh` | Add `kaola-workflow-sink-merge.js` as third entry in script copy loop | P1 |
| `scripts/validate-workflow-contracts.js` | Update stale Step 8 assertions; add 10 new `assertIncludes` calls covering T1, T2, T3, T4, T5, T8 | P2 |
| `scripts/simulate-workflow-walkthrough.js` | Add Epic Cases 2, 3, 4 after line 408 | P2 |

---

## Data Flow

At claim time: `cmdClaim` builds `lockData` → calls `updateSinkLease(stateFile, lockData)` → `updateSinkLease` computes `branchName = lockData.issue_number != null ? 'workflow/issue-' + lockData.issue_number + '-' + lockData.project : 'workflow/' + lockData.project` → writes that name into the `## Sink` block's `branch:` field on BOTH code paths (append path and in-place update path).

At Phase 1 Step 6: Phase 1 command reads `branch:` line from `## Sink` block in `workflow-state.md` → runs `git status --porcelain` (fail-loud if dirty) → runs `git show-ref --verify --quiet refs/heads/{branch}` to check existence: if exits 0 checkout existing branch; if exits non-0 run `git checkout -b {branch}` → if the Sink block shows `branch: TBD` (legacy), call `node ~/.claude/kaola-workflow/scripts/kaola-workflow-claim.js patch-branch --project {p} --session {s} --branch {b}`.

At Phase 6 Step 8: Phase 6 command reads `branch:` and `issue_number:` from `## Sink` block in `workflow-state.md` → invokes `kaola-workflow-sink-merge.js --branch {b} --issue {n} --project {p}` → sink-merge executes the 10-step sequence.

Migration path: `cmdPatchBranch` serves as the Stage 1 migration tool for in-progress sessions that were claimed before this feature ships and have `branch: TBD`.

---

## Build Sequence

1. Task 1 — Modify `scripts/kaola-workflow-claim.js` (no dependencies)
2. Task 2 — Create `scripts/kaola-workflow-sink-merge.js` (depends on Task 1 contract-level)
3. Tasks 3, 4, 5, 8 in parallel — Modify `commands/kaola-workflow-phase6.md`, `commands/workflow-next.md`, `install.sh`, `commands/kaola-workflow-phase1.md` (all depend on Task 2; write sets are disjoint)
4. Tasks 6, 7 in parallel — Modify `scripts/validate-workflow-contracts.js`, `scripts/simulate-workflow-walkthrough.js` (depend on Tasks 1–5 + T8; write sets are disjoint)

---

## Parallelization Plan

| Parallel Group | Tasks | Gate |
|---|---|---|
| G0 | T1 | None; start immediately |
| G1 | T2 | T1 complete |
| G2 | T3, T4, T5, T8 | T2 complete; files are disjoint (`kaola-workflow-phase6.md`, `workflow-next.md`, `install.sh`, `kaola-workflow-phase1.md`) |
| G3 | T6, T7 | T3+T4+T5+T8 complete; files are disjoint (`validate-workflow-contracts.js`, `simulate-workflow-walkthrough.js`) |

---

## External Dependencies

None — Node.js stdlib (`fs`, `path`, `os`, `child_process`) plus `git` and `gh` CLI binaries already required by the existing codebase.

---

## Full Task List

### Task 1 — Modify `scripts/kaola-workflow-claim.js`

- **File:** `scripts/kaola-workflow-claim.js`
- **Test File:** `scripts/simulate-workflow-walkthrough.js` (Epic Case 1 already exercises claim; Epic Cases 2–4 in Task 7 assert the branch field)
- **Write Set:** `scripts/kaola-workflow-claim.js`
- **Depends On:** None
- **Parallel Group:** G0
- **Action:** MODIFY

**Change A — `updateSinkLease` (lines 95–125):**

Compute branch name once at the top of the function, before the block construction:

```js
const branchName = lockData.issue_number != null
  ? 'workflow/issue-' + lockData.issue_number + '-' + lockData.project
  : 'workflow/' + lockData.project;
```

Append path (lines 99–117): replace `'branch: TBD'` in the `sinkBlock` array with `'branch: ' + branchName`.

In-place update path (currently lines 119–124, only rewrites Lease block): add a `branch:` line replacement BEFORE the Lease block replacement:

```js
let updated = content.replace(/^branch:.*$/m, 'branch: ' + branchName);
updated = updated.replace(/^## Lease[\s\S]*?(?=\n##|\s*$)/m, leaseBlock.slice(1));
fs.writeFileSync(stateFile, updated);
return;
```

**Change B — `parseArgs` function:**

Add `--branch` flag parsing inside the existing `for` loop, after the `--issue` entry:

```js
if (argv[i] === '--branch' && argv[i + 1]) { args.branch = argv[++i]; continue; }
```

**Change C — `cmdPatchBranch` function:**

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

Add in `main()` dispatch immediately after the `status` entry:

```js
if (sub === 'patch-branch') return cmdPatchBranch();
```

Update the usage assert message to include `patch-branch`:

```js
assert(sub, 'usage: kaola-workflow-claim.js <claim|release|heartbeat|sweep|status|patch-branch>');
```

**Mirror:** `cmdHeartbeat` (lines 249–276) for lock-read → `Object.assign` → `fs.writeFileSync`. `updateSinkLease` for replace-then-write.

**Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

---

### Task 2 — Create `scripts/kaola-workflow-sink-merge.js`

- **File:** `scripts/kaola-workflow-sink-merge.js`
- **Test File:** `scripts/simulate-workflow-walkthrough.js` (Epic Cases 2, 3, 4 added in Task 7)
- **Write Set:** `scripts/kaola-workflow-sink-merge.js`
- **Depends On:** Task 1
- **Parallel Group:** G1
- **Action:** CREATE

**File header** (mirrors `kaola-workflow-claim.js` lines 1–57):

```js
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OFFLINE = process.env.KAOLA_WORKFLOW_OFFLINE === '1';
const FORCE_FF_FAIL = parseInt(process.env.KAOLA_WORKFLOW_FORCE_FF_FAIL || '0', 10);

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function isSafeName(name) {
  return typeof name === 'string' && name.length > 0 &&
    !name.includes('/') && !name.includes('\\') &&
    !name.includes('\0') && name !== '.' && name !== '..';
}

function ghExec(args) {
  if (OFFLINE) return '';
  return execFileSync('gh', args, { encoding: 'utf8' }).trim();
}

function getRoot() {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  } catch (_) {
    return process.cwd();
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--branch' && argv[i + 1]) { args.branch = argv[++i]; continue; }
    if (argv[i] === '--issue' && argv[i + 1]) { args.issue = parseInt(argv[++i], 10); continue; }
    if (argv[i] === '--project' && argv[i + 1]) { args.project = argv[++i]; continue; }
  }
  return args;
}

const MAX_AUTOMERGE_RETRIES = 3;
```

**`main()` function — 10-step sequence:**

```js
function main() {
  const args = parseArgs(process.argv.slice(2));
  assert(args.branch && args.branch !== 'TBD', '--branch must be provided and not TBD');
  assert(args.project && isSafeName(args.project), '--project must be a safe folder name');
  if (args.issue != null) {
    assert(Number.isFinite(args.issue) && args.issue > 0, '--issue must be a positive integer');
  }

  // Step 1 — git fetch
  if (!OFFLINE) {
    execFileSync('git', ['fetch', 'origin'], { encoding: 'utf8' });
  }

  // Step 2 — Merge-base skip-check
  let alreadyUpToDate = false;
  try {
    const mergeBase = execFileSync('git', ['merge-base', 'HEAD', 'origin/main'],
      { encoding: 'utf8' }).trim();
    const originMain = execFileSync('git', ['rev-parse', 'origin/main'],
      { encoding: 'utf8' }).trim();
    alreadyUpToDate = (mergeBase === originMain);
  } catch (_) {
    alreadyUpToDate = false;
  }

  // Step 3 — Rebase
  if (!alreadyUpToDate) {
    try {
      execFileSync('git', ['rebase', 'origin/main'], { encoding: 'utf8' });
    } catch (e) {
      throw new Error(
        'Rebase failed: ' + e.message + '\n' +
        'Remediation:\n' +
        '  1. Run: git rebase --abort\n' +
        '  2. Resolve conflicts manually on the feature branch\n' +
        '  3. Re-run: git rebase origin/main\n' +
        '  4. Re-invoke sink-merge after conflicts are resolved\n' +
        'For further guidance, see the conflict remediation section in ' +
        'https://github.com/kaolabrother/Kaola-Workflow/blob/main/README.md'
      );
    }
  }

  // Step 4 — Post-rebase validation
  // Skip when OFFLINE (mirrors Steps 1/5/7/8/9). Callers in OFFLINE mode own their own validation.
  if (!alreadyUpToDate && !OFFLINE) {
    execFileSync('npm', ['test'], { encoding: 'utf8', stdio: 'inherit' });
  }

  // FF retry loop (Steps 5–6–10)
  let retries = 0;
  let forcedFailCount = 0;
  while (true) {
    // Step 5 — Pull latest main
    if (!OFFLINE) {
      execFileSync('git', ['checkout', 'main'], { encoding: 'utf8' });
      execFileSync('git', ['pull', '--ff-only'], { encoding: 'utf8' });
      execFileSync('git', ['checkout', args.branch], { encoding: 'utf8' });
    }

    // Step 6 — FF-only merge onto main
    execFileSync('git', ['checkout', 'main'], { encoding: 'utf8' });
    // FORCE_FF_FAIL: make first FORCE_FF_FAIL attempts fail without calling git
    if (forcedFailCount < FORCE_FF_FAIL) {
      forcedFailCount++;
      retries++;
      execFileSync('git', ['checkout', args.branch], { encoding: 'utf8' });
      if (retries >= MAX_AUTOMERGE_RETRIES) {
        process.stderr.write('FF race: exhausted ' + MAX_AUTOMERGE_RETRIES + ' retries. Aborting.\n');
        process.stderr.write('Manual resolution: ensure no concurrent pushes to main and re-run sink-merge.\n');
        process.exitCode = 2;
        return;
      }
      continue;
    }

    let mergeSuccess = false;
    try {
      execFileSync('git', ['merge', '--ff-only', args.branch], { encoding: 'utf8' });
      mergeSuccess = true;
    } catch (_) {
      retries++;
      execFileSync('git', ['checkout', args.branch], { encoding: 'utf8' });
      if (retries >= MAX_AUTOMERGE_RETRIES) {
        process.stderr.write('FF race: exhausted ' + MAX_AUTOMERGE_RETRIES + ' retries. Aborting.\n');
        process.stderr.write('Manual resolution: ensure no concurrent pushes to main and re-run sink-merge.\n');
        process.exitCode = 2;
        return;
      }
      continue;
    }

    if (mergeSuccess) break;
  }

  // Step 7 — Push
  if (!OFFLINE) {
    execFileSync('git', ['push', 'origin', 'main'], { encoding: 'utf8' });
  }

  // Step 8 — Close issue
  if (!OFFLINE && args.issue != null) {
    try { ghExec(['issue', 'close', String(args.issue), '--comment', 'Merged via sink-merge.']); }
    catch (_) {}
  }

  // Step 9 — Delete branch (local always; remote only if !OFFLINE)
  try { execFileSync('git', ['branch', '-d', args.branch], { encoding: 'utf8' }); } catch (_) {}
  if (!OFFLINE) {
    try { execFileSync('git', ['push', 'origin', '--delete', args.branch], { encoding: 'utf8' }); }
    catch (_) {}
  }
}

try { main(); } catch (err) { process.stderr.write(err.message + '\n'); process.exitCode = 1; }
```

**Exit codes:**
- `0` — success: merged, issue closed (online), branch deleted
- `1` — fatal error (conflict, precondition, or unexpected failure) via top-level catch
- `2` — FF race exhausted via `process.exitCode = 2; return` (NOT via throw, to avoid top-level catch)

**FORCE_FF_FAIL placement:** The `forcedFailCount < FORCE_FF_FAIL` check fires BEFORE `git merge --ff-only` is called, and increments `retries` the same way a real FF failure does. This ensures retry exhaustion is genuinely exercised.

**OFFLINE semantics summary:**
- Step 1 (fetch): skipped
- Step 4 (npm test): skipped
- Step 5 (pull main): skipped
- Step 7 (push): skipped
- Step 8 (gh close): skipped
- Step 9 remote delete: skipped
- Local git ops (rebase, merge --ff-only, local branch delete): always run

**Mirror:** `kaola-workflow-claim.js` lines 1–57 for boilerplate.

**Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

---

### Task 3 — Modify `commands/kaola-workflow-phase6.md`

- **File:** `commands/kaola-workflow-phase6.md`
- **Test File:** `scripts/validate-workflow-contracts.js` (stale assertions replaced; new `kaola-workflow-sink-merge.js` assertion added)
- **Write Set:** `commands/kaola-workflow-phase6.md`
- **Depends On:** Task 2
- **Parallel Group:** G2
- **Action:** MODIFY

**Replace the entirety of `## Step 8 - Commit And Push`** (current lines 405–429) with:

```markdown
## Step 8 - Sink Merge

Read the `## Sink` block from `kaola-workflow/{project}/workflow-state.md`:

```bash
# Extract values from Sink block
SINK_BRANCH=$(grep '^branch:' kaola-workflow/{project}/workflow-state.md | awk '{print $2}')
SINK_ISSUE=$(grep '^issue_number:' kaola-workflow/{project}/workflow-state.md | awk '{print $2}')
```

If `SINK_ISSUE` is `unset`, omit `--issue`. Invoke:

```bash
node ~/.claude/kaola-workflow/scripts/kaola-workflow-sink-merge.js \
  --branch "$SINK_BRANCH" \
  --issue "$SINK_ISSUE" \
  --project {project}
```

Exit codes:
- Exit 0: branch merged onto main, issue closed (online), local branch deleted. Confirm worktree is on main with `git status --short --branch`.
- Exit 1: conflict or fatal error. Rebase conflict remediation printed to stderr with exact commands. Re-run after resolving.
- Exit 2: FF race exhausted after MAX_AUTOMERGE_RETRIES retries. Follow printed remediation instructions (ensure no concurrent pushes to main, then re-run sink-merge).
```

**Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

---

### Task 4 — Modify `commands/workflow-next.md`

- **File:** `commands/workflow-next.md`
- **Test File:** `scripts/validate-workflow-contracts.js` (asserts `Branch:` in `workflow-next.md`)
- **Write Set:** `commands/workflow-next.md`
- **Depends On:** Task 2
- **Parallel Group:** G2
- **Action:** MODIFY

**In `## Required Output Before Routing`** (current lines 182–189), insert `Branch:` between `Pending gates:` and `Next command:`:

```text
Workflow project: {project}
Current phase: {phase or unknown}
Current step: {step from workflow-state.md or reconstructed}
Pending gates: {list or none}
Branch: {branch from Sink block in workflow-state.md, or TBD if not yet claimed}
Next command: {next_command}
```

**Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

---

### Task 5 — Modify `install.sh`

- **File:** `install.sh`
- **Test File:** `scripts/validate-workflow-contracts.js` (asserts `kaola-workflow-sink-merge.js` in `install.sh`)
- **Write Set:** `install.sh`
- **Depends On:** Task 2
- **Parallel Group:** G2
- **Action:** MODIFY

**At lines 113–115**, add third entry to the script copy `for` loop:

```bash
for script_file in \
  "$SOURCE_SCRIPTS_DIR"/kaola-workflow-repair-state.js \
  "$SOURCE_SCRIPTS_DIR"/kaola-workflow-claim.js \
  "$SOURCE_SCRIPTS_DIR"/kaola-workflow-sink-merge.js; do
```

**Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

---

### Task 6 — Modify `scripts/validate-workflow-contracts.js`

- **File:** `scripts/validate-workflow-contracts.js`
- **Test File:** Self-validating.
- **Write Set:** `scripts/validate-workflow-contracts.js`
- **Depends On:** Tasks 1, 2, 3, 4, 5, 8
- **Parallel Group:** G3
- **Action:** MODIFY

**Change A — Remove stale Step 8 assertions** (currently lines 112–114):

```js
// REMOVE these three lines:
assertIncludes('commands/kaola-workflow-phase6.md', '## Step 8 - Commit And Push');
assertIncludes('commands/kaola-workflow-phase6.md', 'git push');
assertIncludes('commands/kaola-workflow-phase6.md', 'clean and synced');

// Replace with:
assertIncludes('commands/kaola-workflow-phase6.md', '## Step 8 - Sink Merge');
assertIncludes('commands/kaola-workflow-phase6.md', 'kaola-workflow-sink-merge.js');
```

**Change B — Add new assertions** after `assertIncludes('install.sh', 'kaola-workflow-claim.js');`:

```js
assertIncludes('install.sh', 'kaola-workflow-sink-merge.js');
assertIncludes('scripts/kaola-workflow-claim.js', 'workflow/issue-');
assertIncludes('commands/kaola-workflow-phase6.md', 'kaola-workflow-sink-merge.js');
assertIncludes('commands/workflow-next.md', 'Branch:');
assertIncludes('scripts/kaola-workflow-sink-merge.js', 'MAX_AUTOMERGE_RETRIES');
assertIncludes('scripts/kaola-workflow-sink-merge.js', 'KAOLA_WORKFLOW_OFFLINE');
assertIncludes('scripts/kaola-workflow-sink-merge.js', 'KAOLA_WORKFLOW_FORCE_FF_FAIL');
assertIncludes('commands/kaola-workflow-phase1.md', 'git status --porcelain');
assertIncludes('commands/kaola-workflow-phase1.md', 'git checkout -b');
assertIncludes('commands/kaola-workflow-phase1.md', 'patch-branch');
```

**Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

---

### Task 7 — Add Epic Cases 2–4 to `scripts/simulate-workflow-walkthrough.js`

- **File:** `scripts/simulate-workflow-walkthrough.js`
- **Test File:** Self.
- **Write Set:** `scripts/simulate-workflow-walkthrough.js`
- **Depends On:** Tasks 1, 2
- **Parallel Group:** G3
- **Action:** MODIFY

**Insert after line 408** (after Epic Case 1's `finally` block closes), before `console.log('Workflow walkthrough simulation passed')`.

**Epic Case 2 — OFFLINE fast-path (branch HEAD == origin/main HEAD, skip-check triggers):**

```js
// Epic Case 2: sink-merge OFFLINE fast-path (alreadyUpToDate = true)
const epic2Tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kaola-workflow-epic2-'));
try {
  const remoteDir = path.join(epic2Tmp, 'remote.git');
  const workDir = path.join(epic2Tmp, 'work');
  execFileSync('git', ['init', '--bare', remoteDir], { encoding: 'utf8' });
  execFileSync('git', ['init', workDir], { encoding: 'utf8' });
  execFileSync('git', ['config', 'user.email', 'test@test.com'], { cwd: workDir, encoding: 'utf8' });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: workDir, encoding: 'utf8' });
  execFileSync('git', ['remote', 'add', 'origin', remoteDir], { cwd: workDir, encoding: 'utf8' });
  fs.writeFileSync(path.join(workDir, 'README.md'), 'init\n');
  execFileSync('git', ['add', 'README.md'], { cwd: workDir, encoding: 'utf8' });
  execFileSync('git', ['commit', '-m', 'init'], { cwd: workDir, encoding: 'utf8' });
  execFileSync('git', ['push', 'origin', 'HEAD:main'], { cwd: workDir, encoding: 'utf8' });
  execFileSync('git', ['checkout', '-b', 'workflow/issue-99-epic2'], { cwd: workDir, encoding: 'utf8' });
  let epic2ExitCode = 0;
  try {
    execFileSync(process.execPath, [
      path.join(root, 'scripts/kaola-workflow-sink-merge.js'),
      '--branch', 'workflow/issue-99-epic2', '--issue', '99', '--project', 'epic2'
    ], { cwd: workDir, encoding: 'utf8', env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' } });
  } catch (e) {
    epic2ExitCode = e.status || 1;
  }
  assert(epic2ExitCode === 0, 'Epic Case 2: sink-merge must exit 0 on fast-path, got ' + epic2ExitCode);
  const currentBranch2 = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'],
    { cwd: workDir, encoding: 'utf8' }).trim();
  assert(currentBranch2 === 'main', 'Epic Case 2: worktree must be on main after merge, got ' + currentBranch2);
  let branchExists2 = true;
  try {
    execFileSync('git', ['show-ref', '--verify', '--quiet', 'refs/heads/workflow/issue-99-epic2'],
      { cwd: workDir, encoding: 'utf8' });
  } catch (_) { branchExists2 = false; }
  assert(!branchExists2, 'Epic Case 2: feature branch must be deleted after merge');
} finally {
  fs.rmSync(epic2Tmp, { recursive: true, force: true });
}
```

**Epic Case 3 — Rebase path (feature diverges from origin/main, rebase + FF-merge succeeds):**

```js
// Epic Case 3: sink-merge rebase path (real rebase + ff-merge)
const epic3Tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kaola-workflow-epic3-'));
try {
  const remoteDir = path.join(epic3Tmp, 'remote.git');
  const workDir = path.join(epic3Tmp, 'work');
  const siblingDir = path.join(epic3Tmp, 'sibling');
  execFileSync('git', ['init', '--bare', remoteDir], { encoding: 'utf8' });
  execFileSync('git', ['init', workDir], { encoding: 'utf8' });
  execFileSync('git', ['config', 'user.email', 'test@test.com'], { cwd: workDir, encoding: 'utf8' });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: workDir, encoding: 'utf8' });
  execFileSync('git', ['remote', 'add', 'origin', remoteDir], { cwd: workDir, encoding: 'utf8' });
  fs.writeFileSync(path.join(workDir, 'README.md'), 'init\n');
  execFileSync('git', ['add', 'README.md'], { cwd: workDir, encoding: 'utf8' });
  execFileSync('git', ['commit', '-m', 'init'], { cwd: workDir, encoding: 'utf8' });
  execFileSync('git', ['push', 'origin', 'HEAD:main'], { cwd: workDir, encoding: 'utf8' });
  execFileSync('git', ['clone', remoteDir, siblingDir], { encoding: 'utf8' });
  execFileSync('git', ['config', 'user.email', 'sibling@test.com'], { cwd: siblingDir, encoding: 'utf8' });
  execFileSync('git', ['config', 'user.name', 'Sibling'], { cwd: siblingDir, encoding: 'utf8' });
  fs.writeFileSync(path.join(siblingDir, 'sibling.txt'), 'sibling\n');
  execFileSync('git', ['add', 'sibling.txt'], { cwd: siblingDir, encoding: 'utf8' });
  execFileSync('git', ['commit', '-m', 'sibling commit'], { cwd: siblingDir, encoding: 'utf8' });
  execFileSync('git', ['push', 'origin', 'main'], { cwd: siblingDir, encoding: 'utf8' });
  execFileSync('git', ['fetch', 'origin'], { cwd: workDir, encoding: 'utf8' });
  execFileSync('git', ['checkout', '-b', 'workflow/issue-100-epic3'], { cwd: workDir, encoding: 'utf8' });
  fs.writeFileSync(path.join(workDir, 'feature.txt'), 'feature\n');
  execFileSync('git', ['add', 'feature.txt'], { cwd: workDir, encoding: 'utf8' });
  execFileSync('git', ['commit', '-m', 'feature commit'], { cwd: workDir, encoding: 'utf8' });
  let epic3ExitCode = 0;
  try {
    execFileSync(process.execPath, [
      path.join(root, 'scripts/kaola-workflow-sink-merge.js'),
      '--branch', 'workflow/issue-100-epic3', '--issue', '100', '--project', 'epic3'
    ], { cwd: workDir, encoding: 'utf8', env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' } });
  } catch (e) {
    epic3ExitCode = e.status || 1;
  }
  assert(epic3ExitCode === 0, 'Epic Case 3: sink-merge must exit 0 after rebase, got ' + epic3ExitCode);
  const currentBranch3 = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'],
    { cwd: workDir, encoding: 'utf8' }).trim();
  assert(currentBranch3 === 'main', 'Epic Case 3: worktree must be on main, got ' + currentBranch3);
  let branchExists3 = true;
  try {
    execFileSync('git', ['show-ref', '--verify', '--quiet', 'refs/heads/workflow/issue-100-epic3'],
      { cwd: workDir, encoding: 'utf8' });
  } catch (_) { branchExists3 = false; }
  assert(!branchExists3, 'Epic Case 3: feature branch must be deleted after merge');
} finally {
  fs.rmSync(epic3Tmp, { recursive: true, force: true });
}
```

**Epic Case 4 — FF race retry exhaustion (`KAOLA_WORKFLOW_FORCE_FF_FAIL=3`):**

```js
// Epic Case 4: FF race retry exhaustion (FORCE_FF_FAIL=3 == MAX_AUTOMERGE_RETRIES)
const epic4Tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kaola-workflow-epic4-'));
try {
  const remoteDir = path.join(epic4Tmp, 'remote.git');
  const workDir = path.join(epic4Tmp, 'work');
  const siblingDir = path.join(epic4Tmp, 'sibling');
  execFileSync('git', ['init', '--bare', remoteDir], { encoding: 'utf8' });
  execFileSync('git', ['init', workDir], { encoding: 'utf8' });
  execFileSync('git', ['config', 'user.email', 'test@test.com'], { cwd: workDir, encoding: 'utf8' });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: workDir, encoding: 'utf8' });
  execFileSync('git', ['remote', 'add', 'origin', remoteDir], { cwd: workDir, encoding: 'utf8' });
  fs.writeFileSync(path.join(workDir, 'README.md'), 'init\n');
  execFileSync('git', ['add', 'README.md'], { cwd: workDir, encoding: 'utf8' });
  execFileSync('git', ['commit', '-m', 'init'], { cwd: workDir, encoding: 'utf8' });
  execFileSync('git', ['push', 'origin', 'HEAD:main'], { cwd: workDir, encoding: 'utf8' });
  execFileSync('git', ['clone', remoteDir, siblingDir], { encoding: 'utf8' });
  execFileSync('git', ['config', 'user.email', 'sibling@test.com'], { cwd: siblingDir, encoding: 'utf8' });
  execFileSync('git', ['config', 'user.name', 'Sibling'], { cwd: siblingDir, encoding: 'utf8' });
  fs.writeFileSync(path.join(siblingDir, 'sibling.txt'), 'sibling\n');
  execFileSync('git', ['add', 'sibling.txt'], { cwd: siblingDir, encoding: 'utf8' });
  execFileSync('git', ['commit', '-m', 'sibling commit'], { cwd: siblingDir, encoding: 'utf8' });
  execFileSync('git', ['push', 'origin', 'main'], { cwd: siblingDir, encoding: 'utf8' });
  execFileSync('git', ['fetch', 'origin'], { cwd: workDir, encoding: 'utf8' });
  execFileSync('git', ['checkout', '-b', 'workflow/issue-101-epic4'], { cwd: workDir, encoding: 'utf8' });
  fs.writeFileSync(path.join(workDir, 'feature4.txt'), 'feature4\n');
  execFileSync('git', ['add', 'feature4.txt'], { cwd: workDir, encoding: 'utf8' });
  execFileSync('git', ['commit', '-m', 'feature commit epic4'], { cwd: workDir, encoding: 'utf8' });
  let epic4ExitCode = 0;
  try {
    execFileSync(process.execPath, [
      path.join(root, 'scripts/kaola-workflow-sink-merge.js'),
      '--branch', 'workflow/issue-101-epic4', '--issue', '101', '--project', 'epic4'
    ], { cwd: workDir, encoding: 'utf8', env: {
      ...process.env,
      KAOLA_WORKFLOW_OFFLINE: '1',
      KAOLA_WORKFLOW_FORCE_FF_FAIL: '3'
    }});
  } catch (e) {
    epic4ExitCode = e.status || 1;
  }
  assert(epic4ExitCode === 2,
    'Epic Case 4: sink-merge must exit 2 on FF race exhaustion, got ' + epic4ExitCode);
  let branchStillExists4 = false;
  try {
    execFileSync('git', ['show-ref', '--verify', '--quiet', 'refs/heads/workflow/issue-101-epic4'],
      { cwd: workDir, encoding: 'utf8' });
    branchStillExists4 = true;
  } catch (_) { branchStillExists4 = false; }
  assert(branchStillExists4,
    'Epic Case 4: feature branch must NOT be deleted when FF race exhausted');
} finally {
  fs.rmSync(epic4Tmp, { recursive: true, force: true });
}
```

**Mirror:** Epic Case 1 (lines 329–408) — `mkdtempSync`, `try/finally`, `execFileSync`, `assert()`.

**Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

---

### Task 8 — Modify `commands/kaola-workflow-phase1.md`

- **File:** `commands/kaola-workflow-phase1.md`
- **Test File:** `scripts/validate-workflow-contracts.js` (asserts `git status --porcelain`, `git checkout -b`, `patch-branch` in phase1.md)
- **Write Set:** `commands/kaola-workflow-phase1.md`
- **Depends On:** Task 2 (contract-level: sink-merge conventions inform branch naming in Sink block)
- **Parallel Group:** G2
- **Action:** MODIFY

**Add a new section `## Step 6 - Cut Feature Branch`** after the existing `## Step 5 - Write Phase File` section (after the `Continue to Phase 2 when...` closing line, which is the final line of the current file).

**Append to `commands/kaola-workflow-phase1.md`:**

```markdown
## Step 6 - Cut Feature Branch

If a claim session is active (`KAOLA_SESSION_ID` is set) and `workflow-state.md`
contains a `## Sink` block, cut the feature branch now.

Read the branch name from the Sink block:

```bash
SINK_BRANCH=$(grep '^branch:' kaola-workflow/{project}/workflow-state.md | awk '{print $2}')
```

If `SINK_BRANCH` is empty or `TBD`, skip this step — no session is active or
the branch name is not yet resolved.

**Worktree precondition** — run before any git branch operation:

```bash
git status --porcelain
```

If the output is non-empty (dirty worktree), stop immediately with:

```text
ERROR: Worktree is dirty. Commit or discard your changes before cutting the
feature branch. Do NOT auto-stash. Resolve manually, then re-run Phase 1.
```

Do not stash automatically.

**Branch creation (idempotent):**

```bash
if git show-ref --verify --quiet refs/heads/"$SINK_BRANCH"; then
  # Branch already exists — resume case
  git checkout "$SINK_BRANCH"
else
  git checkout -b "$SINK_BRANCH"
fi
```

**Stage 1 migration** — if the Sink block showed `branch: TBD` before the
branch name was resolved, call `patch-branch` to backfill the lock file, Sink
block, and GitHub claim comment:

```bash
# Only if the stored branch was TBD (legacy lease)
if [ "$(grep '^branch:' kaola-workflow/{project}/workflow-state.md | awk '{print $2}')" = "TBD" ]; then
  node "${CLAUDE_PLUGIN_ROOT:-$HOME/.claude/kaola-workflow}/scripts/kaola-workflow-claim.js" \
    patch-branch \
    --project {project} \
    --session "$KAOLA_SESSION_ID" \
    --branch "$SINK_BRANCH"
fi
```

After this step the worktree is on `{branch}`. Phase 4 implementation work
begins on this branch.

Update `workflow-state.md`:

```text
phase: 1
step: complete
next_command: /kaola-workflow-phase2 {project-name}
```

Continue to Phase 2 when Phase 1 evidence and compliance rows are complete.
```

**Note on migration check:** The migration check reads `branch:` from `workflow-state.md` BEFORE the new branch is created. When the value is `TBD`, it means the claim was made with an older version of `kaola-workflow-claim.js` that did not yet write a real branch name — `patch-branch` must be called to backfill. When the value is already a real branch name (the normal post-T1 path), `patch-branch` is not called.

**Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

---

## Single Validation Command

```bash
node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js
```

Run from `/Users/ylpromax5/Workspace/Kaola-Workflow`. Run after each task group (G0, G1, G2, G3) and as the final gate.

---

## Summary of Changes from Original Blueprint

| Gap | Resolution |
|---|---|
| Blocking Gap 1: no task creates the branch | Added Task 8 (G2): new `## Step 6 - Cut Feature Branch` in `commands/kaola-workflow-phase1.md`; owns worktree-clean check, idempotent `git checkout -b`, and legacy `patch-branch` migration |
| Blocking Gap 2: `npm test` fails Epic Cases 3 and 4 | Task 2 amended: Step 4 skipped when `OFFLINE === '1'`; matches C-refined-A and Steps 1/5/7/8/9 |
| Blocking Gap 3: Epic Case 4 doesn't test FF race exhaustion | Task 2 amended: `KAOLA_WORKFLOW_FORCE_FF_FAIL` env flag, `forcedFailCount` check BEFORE `git merge --ff-only` inside retry loop; Task 7 amended: Epic Case 4 sets `FORCE_FF_FAIL=3`, asserts exit code 2, asserts branch NOT deleted |
| Non-blocking: `phase6-merge-conflict.md` never created | Task 2 amended: Step 3 error message inlined as multi-line string with exact `git rebase --abort` → fix → rerun instructions; no new file required |
| Task 6 assertions expanded | 10 new assertions covering T1, T2, T3, T4, T5, T8; Task 6 dependencies updated to include T8 |
| Parallelization plan | T8 added to G2 alongside T3/T4/T5 (disjoint write sets) |
