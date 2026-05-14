# Phase 3 - Plan: branch-issue-merge-sink

## Blueprint

### Files to Create
| File | Purpose | Key Interfaces |
|------|---------|----------------|
| `scripts/kaola-workflow-sink-merge.js` | 10-step rebase-then-ff-merge sequence | `--branch`, `--issue`, `--project` CLI flags; exit 0/1/2; `MAX_AUTOMERGE_RETRIES=3`; `KAOLA_WORKFLOW_OFFLINE`; `KAOLA_WORKFLOW_FORCE_FF_FAIL` |

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `scripts/kaola-workflow-claim.js` | (A) `updateSinkLease` writes real branch name on both code paths; (B) `--branch` to `parseArgs`; (C) `cmdPatchBranch` subcommand | A-naming-1: real branch name at claim time; Gap 2: Stage 1 migration |
| `commands/kaola-workflow-phase1.md` | Add `## Step 6 - Cut Feature Branch` after Step 5 | A-creation-1: Phase 1 command cuts branch; Gap 3: worktree-clean check; Gap 2: `patch-branch` migration |
| `commands/kaola-workflow-phase6.md` | Replace `## Step 8 - Commit And Push` with `## Step 8 - Sink Merge` | Route Phase 6 to sink-merge.js instead of manual git push |
| `commands/workflow-next.md` | Add `Branch:` line to Required Output Before Routing block | Surface branch name in router output |
| `install.sh` | Add `kaola-workflow-sink-merge.js` as third entry in script copy loop | Install sink-merge.js alongside claim.js |
| `scripts/validate-workflow-contracts.js` | Remove stale Step 8 assertions; add 10 new `assertIncludes` for T1/T2/T3/T4/T5/T8 | Keep contract tests current after all modifications |
| `scripts/simulate-workflow-walkthrough.js` | Add Epic Cases 2 (fast-path), 3 (rebase path), 4 (FF retry exhaustion) | Validate the 4 acceptance criteria: skip-check, rebase, FF-merge, retry exit-2 |

### Build Sequence
1. T1 — Modify `kaola-workflow-claim.js` (no deps)
2. T2 — Create `kaola-workflow-sink-merge.js` (depends on T1 contract)
3. T3, T4, T5, T8 in parallel — Modify `kaola-workflow-phase6.md`, `workflow-next.md`, `install.sh`, `kaola-workflow-phase1.md` (all depend on T2; disjoint write sets)
4. T6, T7 in parallel — Modify `validate-workflow-contracts.js`, `simulate-workflow-walkthrough.js` (depend on T1–T5+T8; disjoint write sets)

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| G0 | T1 | No dependencies |
| G1 | T2 | T1 complete; single new file |
| G2 | T3, T4, T5, T8 | T2 complete; disjoint files: `kaola-workflow-phase6.md`, `workflow-next.md`, `install.sh`, `kaola-workflow-phase1.md` |
| G3 | T6, T7 | G2 complete; disjoint files: `validate-workflow-contracts.js`, `simulate-workflow-walkthrough.js` |

### External Dependencies
Node.js stdlib (`fs`, `path`, `os`, `child_process`), `git` CLI, `gh` CLI — all already required by existing codebase.

---

## Task List

### Task 1: Modify kaola-workflow-claim.js
- **File:** `scripts/kaola-workflow-claim.js`
- **Test File:** `scripts/simulate-workflow-walkthrough.js` (Case 1 already tests claim; Cases 2-4 assert branch field)
- **Write Set:** `scripts/kaola-workflow-claim.js`
- **Depends On:** none
- **Parallel Group:** G0
- **Action:** MODIFY
- **Implement:**
  - Change A: Compute `branchName = lockData.issue_number != null ? 'workflow/issue-' + lockData.issue_number + '-' + lockData.project : 'workflow/' + lockData.project` at top of `updateSinkLease`; replace `'branch: TBD'` in `sinkBlock` array (append path); add `content.replace(/^branch:.*$/m, 'branch: ' + branchName)` before Lease block replacement (in-place path)
  - Change B: Add `if (argv[i] === '--branch' && argv[i + 1]) { args.branch = argv[++i]; continue; }` to `parseArgs` loop
  - Change C: Add `cmdPatchBranch()` function (reads lock, validates session, Object.assign branch field, writes lock + state file + gh comment edit); add dispatch `if (sub === 'patch-branch') return cmdPatchBranch();` in `main()`; update usage assert to include `patch-branch`
- **Mirror:** `cmdHeartbeat` lock-read → Object.assign → writeFileSync; `updateSinkLease` replace-then-write
- **Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

### Task 2: Create kaola-workflow-sink-merge.js
- **File:** `scripts/kaola-workflow-sink-merge.js`
- **Test File:** `scripts/simulate-workflow-walkthrough.js` (Epic Cases 2, 3, 4)
- **Write Set:** `scripts/kaola-workflow-sink-merge.js`
- **Depends On:** Task 1
- **Parallel Group:** G1
- **Action:** CREATE
- **Implement:**
  - Header mirrors `kaola-workflow-claim.js` lines 1-57: shebang, stdlib requires, `OFFLINE`, `FORCE_FF_FAIL = parseInt(process.env.KAOLA_WORKFLOW_FORCE_FF_FAIL || '0', 10)`, `assert`, `isSafeName`, `ghExec`, `getRoot`, `parseArgs (--branch/--issue/--project)`, `MAX_AUTOMERGE_RETRIES = 3`
  - Step 1: `git fetch origin` — skip if OFFLINE; fatal throw on error (Gap 4)
  - Step 2: merge-base skip-check — `git merge-base HEAD origin/main` == `git rev-parse origin/main` → `alreadyUpToDate`; catch → false
  - Step 3: rebase `origin/main` if `!alreadyUpToDate`; on failure throw multi-line error with `git rebase --abort` → fix → rerun instructions
  - Step 4: `npm test` if `!alreadyUpToDate && !OFFLINE`; skip entirely when OFFLINE (C-refined-A)
  - FF retry loop: `retries=0; forcedFailCount=0; while(true) {` Step 5: if `!OFFLINE` checkout main + pull --ff-only + checkout branch; Step 6: checkout main; if `forcedFailCount < FORCE_FF_FAIL` { forcedFailCount++; retries++; checkout branch; if retries>=MAX: exitCode=2; return; continue; }; try git merge --ff-only branch; on success break; on fail retries++; checkout branch; if retries>=MAX: exitCode=2; return; continue; `}`
  - Step 7: `git push origin main` — skip if OFFLINE
  - Step 8: `gh issue close` — skip if OFFLINE or no issue; wrap in try/catch (non-fatal)
  - Step 9: `git branch -d branch` (always); `git push origin --delete branch` if !OFFLINE; both try/catch (non-fatal)
  - Top-level: `try { main(); } catch (err) { process.stderr.write(err.message + '\n'); process.exitCode = 1; }`
  - Exit codes: 0=success, 1=fatal via catch, 2=FF race exhausted via `process.exitCode=2; return`
- **Mirror:** `kaola-workflow-claim.js` lines 1-57 for boilerplate
- **Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

### Task 3: Modify kaola-workflow-phase6.md
- **File:** `commands/kaola-workflow-phase6.md`
- **Test File:** `scripts/validate-workflow-contracts.js`
- **Write Set:** `commands/kaola-workflow-phase6.md`
- **Depends On:** Task 2
- **Parallel Group:** G2
- **Action:** MODIFY
- **Implement:** Replace `## Step 8 - Commit And Push` (lines 405-429) with `## Step 8 - Sink Merge` block: read `branch:` and `issue_number:` from Sink block; invoke `kaola-workflow-sink-merge.js --branch "$SINK_BRANCH" --issue "$SINK_ISSUE" --project {project}`; document exit 0/1/2 semantics; if SINK_ISSUE is `unset`, omit `--issue`
- **Mirror:** Existing Step section text and bash block format in `kaola-workflow-phase6.md`
- **Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

### Task 4: Modify workflow-next.md
- **File:** `commands/workflow-next.md`
- **Test File:** `scripts/validate-workflow-contracts.js`
- **Write Set:** `commands/workflow-next.md`
- **Depends On:** Task 2
- **Parallel Group:** G2
- **Action:** MODIFY
- **Implement:** In `## Required Output Before Routing` block (lines 182-189), insert `Branch: {branch from Sink block in workflow-state.md, or TBD if not yet claimed}` between `Pending gates:` and `Next command:` lines
- **Mirror:** Existing Required Output block format
- **Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

### Task 5: Modify install.sh
- **File:** `install.sh`
- **Test File:** `scripts/validate-workflow-contracts.js`
- **Write Set:** `install.sh`
- **Depends On:** Task 2
- **Parallel Group:** G2
- **Action:** MODIFY
- **Implement:** At lines 113-115, add `"$SOURCE_SCRIPTS_DIR"/kaola-workflow-sink-merge.js` as the third entry in the script copy `for` loop (add continuation backslash after `claim.js` line, add new line)
- **Mirror:** Existing `for script_file in` loop pattern
- **Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

### Task 6: Modify validate-workflow-contracts.js
- **File:** `scripts/validate-workflow-contracts.js`
- **Test File:** Self-validating
- **Write Set:** `scripts/validate-workflow-contracts.js`
- **Depends On:** Tasks 1, 2, 3, 4, 5, 8
- **Parallel Group:** G3
- **Action:** MODIFY
- **Implement:**
  - Change A: Remove 3 stale assertions (lines 112-114: `## Step 8 - Commit And Push`, `git push`, `clean and synced`); replace with `assertIncludes('commands/kaola-workflow-phase6.md', '## Step 8 - Sink Merge')` and `assertIncludes('commands/kaola-workflow-phase6.md', 'kaola-workflow-sink-merge.js')`
  - Change B: After `assertIncludes('install.sh', 'kaola-workflow-claim.js')` add 10 new assertions: `install.sh` → `kaola-workflow-sink-merge.js`; `kaola-workflow-claim.js` → `workflow/issue-`; `kaola-workflow-phase6.md` → `kaola-workflow-sink-merge.js`; `workflow-next.md` → `Branch:`; `kaola-workflow-sink-merge.js` → `MAX_AUTOMERGE_RETRIES`; `kaola-workflow-sink-merge.js` → `KAOLA_WORKFLOW_OFFLINE`; `kaola-workflow-sink-merge.js` → `KAOLA_WORKFLOW_FORCE_FF_FAIL`; `kaola-workflow-phase1.md` → `git status --porcelain`; `kaola-workflow-phase1.md` → `git checkout -b`; `kaola-workflow-phase1.md` → `patch-branch`
- **Mirror:** `assertIncludes` call style at lines 186-193
- **Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

### Task 7: Add Epic Cases 2-4 to simulate-workflow-walkthrough.js
- **File:** `scripts/simulate-workflow-walkthrough.js`
- **Test File:** Self
- **Write Set:** `scripts/simulate-workflow-walkthrough.js`
- **Depends On:** Tasks 1, 2
- **Parallel Group:** G3
- **Action:** MODIFY
- **Implement:** Insert after line 408 (after Epic Case 1 `finally` block), before `console.log('Workflow walkthrough simulation passed')`:
  - Epic Case 2 (OFFLINE fast-path): `git init --bare` + `git init` + initial commit + push + cut feature branch at same HEAD → run sink-merge OFFLINE=1 → assert exit 0, worktree on main, branch deleted
  - Epic Case 3 (rebase path): same bare+work setup + sibling advances origin/main + work fetches + cut feature branch + add commit → run sink-merge OFFLINE=1 → assert exit 0, worktree on main, branch deleted
  - Epic Case 4 (FF retry exhaustion): same setup as Case 3 → run sink-merge OFFLINE=1 with `KAOLA_WORKFLOW_FORCE_FF_FAIL=3` → assert exit 2, branch NOT deleted
  - Each case wrapped in `mkdtempSync` + `try/finally { fs.rmSync(...) }`
  - All three cases use `path.join(root, 'scripts/kaola-workflow-sink-merge.js')` as the script path
- **Mirror:** Epic Case 1 at lines 329-408: `mkdtempSync`, `try/finally`, `execFileSync`, `assert()`
- **Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

### Task 8: Modify kaola-workflow-phase1.md
- **File:** `commands/kaola-workflow-phase1.md`
- **Test File:** `scripts/validate-workflow-contracts.js`
- **Write Set:** `commands/kaola-workflow-phase1.md`
- **Depends On:** Task 2
- **Parallel Group:** G2
- **Action:** MODIFY
- **Implement:** Append new `## Step 6 - Cut Feature Branch` section after the closing `Continue to Phase 2 when...` line of Step 5:
  1. Read `SINK_BRANCH` from Sink block; skip if empty or `TBD`
  2. Run `git status --porcelain`; if non-empty output, stop with explicit error (no auto-stash)
  3. Idempotent checkout: if branch exists `git checkout $SINK_BRANCH`; else `git checkout -b $SINK_BRANCH`
  4. Stage 1 migration: if stored value was `TBD`, call `kaola-workflow-claim.js patch-branch --project {p} --session $KAOLA_SESSION_ID --branch $SINK_BRANCH`
  5. Update `workflow-state.md`: phase 1, step complete, next_command /kaola-workflow-phase2
- **Mirror:** Existing `## Step` section format in `kaola-workflow-phase1.md`; bash block formatting
- **Validate:** `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

---

## Advisor Notes

The advisor found 3 blocking gaps in the original architect blueprint:

1. **Gap 1 (blocking):** No task created the feature branch. Resolved by adding Task 8 (G2) modifying `commands/kaola-workflow-phase1.md` to add `## Step 6 - Cut Feature Branch` with worktree-clean check, idempotent `git checkout -b`, and Stage 1 `patch-branch` migration.

2. **Gap 2 (blocking):** `npm test` in Step 4 would fail Epic Cases 3 and 4 (no `package.json` in tempdir). Resolved by adding `!OFFLINE` guard to Step 4 in Task 2, consistent with C-refined-A and Steps 1/5/7/8/9.

3. **Gap 3 (blocking):** Epic Case 4 was structurally identical to Case 3 and didn't exercise FF retry exhaustion. Resolved by adding `KAOLA_WORKFLOW_FORCE_FF_FAIL=N` env flag to sink-merge.js; Epic Case 4 sets it to 3 (= MAX_AUTOMERGE_RETRIES) and asserts exit code 2 + branch not deleted.

Non-blocking: `phase6-merge-conflict.md` referenced but never created — resolved by inlining the remediation steps as a multi-line error message in sink-merge.js Step 3, eliminating the need for a separate file.

---

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | invoked | .cache/architect-revision-1.md | 1 revision required; all 3 blocking gaps resolved |
