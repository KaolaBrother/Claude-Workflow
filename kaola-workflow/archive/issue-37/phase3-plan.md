# Phase 3 - Plan: issue-37

## Blueprint

### Files to Create
None. All changes are additive modifications to existing files.

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `scripts/kaola-workflow-claim.js` | Add 4 new `cmd*` functions before `main()` at line 2133; extend `main()` dispatcher; extend `module.exports` | Core implementation of worktree-native subcommands |
| `scripts/validate-workflow-contracts.js` | Add 10 `assertIncludes` lines after line 316 | Contract coverage for new subcommands and command-file strings |
| `scripts/simulate-workflow-walkthrough.js` | Add Epic Case 17 (17A–17F) before line 4703 | End-to-end coverage of all 4 new subcommands |
| `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` | Byte-identical mirror of `scripts/kaola-workflow-claim.js` changes | Drift guard requirement |
| `plugins/kaola-workflow/scripts/validate-workflow-contracts.js` | Byte-identical mirror of validator changes | Drift guard requirement |
| `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | Add Case 5k after line 1126 | Plugin test coverage for `pick-next` + `worktree-status` |
| `commands/workflow-next.md` | Insert 1-line guard after `KAOLA_STARTUP_SESSION=` line (248 → 249 lines) | Route native mode to `pick-next` instead of legacy `startup` |
| `commands/kaola-workflow-phase4.md` | Insert Worktree Discovery bash block after line 55 | Resolve `ACTIVE_WORKTREE_PATH` for implementation phase |
| `CHANGELOG.md` | Add [Unreleased] entry for issue #37 | Standard docs |
| `README.md` | Document 4 new subcommands and `KAOLA_WORKTREE_NATIVE` env var | Standard docs |

### Build Sequence
1. Implement T1–T4 (`cmdPickNext`, `cmdResume`, `cmdWorktreeStatus`, `cmdWorktreeFinalize`) in `scripts/kaola-workflow-claim.js` — no external dependencies
2. Wire T5: extend `main()` dispatcher + usage string + `module.exports` in same file — depends on T1–T4 existing
3. Add T6: 10 `assertIncludes` lines to `scripts/validate-workflow-contracts.js` — depends on T5 (strings must exist before asserts)
4. Add T7: Epic Case 17 to `scripts/simulate-workflow-walkthrough.js` — can parallel with T6 (disjoint files)
5. Add T8: Case 5k to plugin walkthrough — can parallel with T6, T7 (disjoint files)
6. Sync T9: drift mirrors to `plugins/` — depends on T1–T8 complete (must be byte-identical)
7. Run `npm test` — Step 1 commit gate
8. Insert T11: workflow-next guard — after Step 1 green
9. Insert T10: Phase 4 Worktree Discovery block — after Step 1 green, can parallel with T11 (disjoint files)
10. Run `npm test` — Step 2 commit gate
11. T12: Update `CHANGELOG.md` and `README.md` — after Step 2 green
12. Run `npm test` — Step 3 commit gate

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | T1, T2, T3, T4 | All write to same file but are independent function bodies — implement sequentially within one file session |
| A | T6, T7 | Disjoint files (`validate-workflow-contracts.js` vs `simulate-workflow-walkthrough.js`) |
| A | T6, T7, T8 | T8 is plugin walkthrough — fully disjoint from T6 and T7 |
| B | T10, T11 | Disjoint files (`kaola-workflow-phase4.md` vs `workflow-next.md`) |

### External Dependencies
- `fs`, `path`, `child_process` (already imported in `scripts/kaola-workflow-claim.js`)
- `execSync` / `execFileSync` for test scaffolding in Epic Case 17 (already used in walkthrough)
- No new npm packages required

## Task List

### Task 1: `cmdPickNext`
- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js` (Epic Case 17A, 17B)
- Write Set: `scripts/kaola-workflow-claim.js`
- Depends On: none
- Parallel Group: A (write sequentially within single file)
- Action: MODIFY (insertion before `main()` at line 2133)
- Implement:
  - Parse `--session`, `--runtime`, `--sink`, `--issue` args via `parseArgs()`
  - Build claimed-issue set: `spawnSync('git', ['branch', '--list', 'workflow/issue-*'])` + `spawnSync('git', ['ls-remote', '--heads', 'origin', 'refs/heads/workflow/issue-*'])` (skip ls-remote if `OFFLINE`)
  - Fetch open issues: `spawnSync('gh', ['issue', 'list', '--json', 'number,title,labels'])` (online) or read `kaola-workflow/ROADMAP.md` (offline fallback)
  - Filter: exclude already-claimed; attempt `provisionWorktree(root, project, branch)` for first candidate
  - On `git worktree add` failure (exit non-zero): mark as lost race, retry next candidate
  - Online-only: `spawnSync('gh', ['issue', 'edit', String(issue), '--add-label', CLAIM_LABEL])`
  - Emit JSON: `{verdict:'acquired', issue, project, branch, worktree_path, session, runtime, sink}` or `{verdict:'none', reason:'no-unclaimed-issues'}`
- Mirror: `cmdClaim()` for `provisionWorktree()` call pattern; `cmdStatus()` for JSON emit pattern
- Validate: Epic Case 17A asserts `verdict=acquired`; 17B asserts `verdict=none`

### Task 2: `cmdResume`
- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js` (Epic Case 17D, 17E)
- Write Set: `scripts/kaola-workflow-claim.js`
- Depends On: none
- Parallel Group: A (sequential within file)
- Action: MODIFY (insertion before `main()`)
- Implement:
  - Parse `--session`, `--project` args
  - Find main worktree: parse `spawnSync('git', ['worktree', 'list', '--porcelain'])` output; first `worktree` line is main worktree path (git guarantee)
  - Infer project from `--project` arg or current branch matching `workflow/issue-N`
  - Scan phase artifacts from `{main}/kaola-workflow/{project}/`: highest `phase*.md` determines next command
    - `phase6-summary.md` → `{verdict:'complete'}`
    - `phase5-review.md` → next: `/kaola-workflow-phase6`
    - `phase4-progress.md` → next: `/kaola-workflow-phase4` or `/kaola-workflow-phase5`
    - `phase3-plan.md` → next: `/kaola-workflow-phase4`
    - `phase2-ideation.md` → next: `/kaola-workflow-phase3`
    - `phase1-research.md` → next: `/kaola-workflow-phase2`
    - none → next: `/kaola-workflow-phase1`
  - Emit: `{resumed:true, issue, project, branch, main_worktree, current_phase, next_command}` or `{resumed:false}`
- Mirror: state-repair pattern from `scripts/kaola-workflow-repair-state.js`
- Validate: 17D asserts `next_command` contains `phase1`; 17E asserts `next_command` contains `phase4`

### Task 3: `cmdWorktreeStatus`
- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js` (Epic Case 17C)
- Write Set: `scripts/kaola-workflow-claim.js`
- Depends On: none
- Parallel Group: A
- Action: MODIFY (insertion before `main()`)
- Implement:
  - Parse `git worktree list --porcelain` output; filter entries with branch `workflow/issue-*`
  - For each entry: extract `worktree`, `HEAD`, `branch`; parse issue number from branch name
  - Online: hydrate via `spawnSync('gh', ['issue', 'view', N, '--json', 'state,assignees,labels,title,number,url'])`
  - Emit: JSON array of `{worktree_path, branch, head, issue, issue_data}`
- Mirror: `cmdStatus()` online/offline branching pattern
- Validate: 17C asserts array length >= 1 and entry matches 17A output

### Task 4: `cmdWorktreeFinalize`
- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js` (Epic Case 17F)
- Write Set: `scripts/kaola-workflow-claim.js`
- Depends On: none
- Parallel Group: A
- Action: MODIFY (insertion before `main()`)
- Implement:
  - Parse `--project`, `--session` args; assert project present
  - `root = getCoordRoot()` (see Phase 4 pre-check #1 below)
  - `worktreePath = worktreePathFor(root, project)` — line 587, deterministic, no lock file
  - `assert(fs.existsSync(worktreePath), 'worktree not provisioned at ' + worktreePath)`
  - Dirty check: `spawnSync('git', ['-C', worktreePath, 'status', '--porcelain', '--', 'kaola-workflow/' + project + '/'])` — fail if non-empty
  - Main worktree: first `worktree` from `git worktree list --porcelain` output
  - `fs.cpSync(path.join(mainWt, 'kaola-workflow', project), path.join(worktreePath, 'kaola-workflow', project), {recursive: true})`
  - `spawnSync('git', ['-C', worktreePath, 'add', 'kaola-workflow/' + project + '/'])`
  - Check staged: `spawnSync('git', ['-C', worktreePath, 'diff', '--cached', '--quiet'])` — skip commit if exit 0
  - `spawnSync('git', ['-C', worktreePath, 'commit', '-m', 'chore: sync phase artifacts for ' + project])`
  - Emit: `{verdict:'finalized', project, worktree_path: worktreePath, branch, session}`
- Mirror: `archiveProjectDir()` for `fs.cpSync` + git operations pattern
- Validate: 17F asserts file exists in worktree at `kaola-workflow/{project}/`; asserts commit made

### Task 5: `main()` Dispatcher + `module.exports`
- File: `scripts/kaola-workflow-claim.js`
- Write Set: `scripts/kaola-workflow-claim.js`
- Depends On: T1–T4
- Parallel Group: A (final step)
- Action: MODIFY
- Implement:
  - Add 4 dispatch lines after existing `if (sub === 'finalize')` line
  - Update usage `assert` string to include `pick-next|resume|worktree-status|worktree-finalize`
  - Replace `module.exports` line to include 4 new function names
- Validate: `node scripts/kaola-workflow-claim.js pick-next` outputs JSON without crashing

### Task 6: Validator Asserts
- File: `scripts/validate-workflow-contracts.js`
- Write Set: `scripts/validate-workflow-contracts.js`
- Depends On: T5 (strings must exist in claim.js before asserts)
- Parallel Group: A (can write same session as T7, disjoint files)
- Action: MODIFY (insert after line 316)
- Implement: 10 `assertIncludes` lines as specified in architect-revision-1
- Validate: `node scripts/validate-workflow-contracts.js` exits 0

### Task 7: Epic Case 17 (17A–17F)
- File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/simulate-workflow-walkthrough.js`
- Depends On: T1–T4
- Parallel Group: A (disjoint from T6)
- Action: MODIFY (insert before line 4703)
- Implement:
  - Setup: `fs.mkdtempSync` temp dir, `git init`, `git commit --allow-empty` for initial HEAD
  - Write gh shim script to `${tmpDir}/bin/gh` that returns stub data for issue 701
  - Set `PATH="${tmpDir}/bin:${process.env.PATH}"` for all sub-processes
  - **17A**: `execFileSync(process.execPath, [CLAIM_JS, 'pick-next', '--session', 's1', '--runtime', 'claude'])` — assert `verdict=acquired`, `issue=701`, `branch.startsWith('workflow/')`, `fs.existsSync(worktree_path)`
  - **17B**: same call with `env.KAOLA_WORKFLOW_OFFLINE='1'` added — assert `verdict=none`
  - **17C**: `execFileSync(CLAIM_JS, ['worktree-status'])` — assert array length >= 1, entry branch matches, entry path matches 17A output
  - **17D**: `execFileSync(CLAIM_JS, ['resume', '--project', project])` with no phase artifacts — assert `next_command` includes `phase1`
  - **17E**: write `{tmpDir}/kaola-workflow/{project}/phase3-plan.md`; re-run `resume` — assert `next_command` includes `phase4`
  - **17F**: write fake artifact to main worktree `kaola-workflow/{project}/phase3-plan.md`; run `worktree-finalize`; assert `verdict=finalized`; assert file exists in issue worktree
  - Teardown: `fs.rmSync(tmpDir, {recursive:true})` in finally block; `execSync('git worktree prune', ...)` before rm
- NOTE: 17F is the highest-complexity sub-case. Cross-worktree state setup requires: provisioned linked worktree from 17A, fake artifacts in main worktree, then copy + commit assertion. Allocate 3-4x implementation time vs other sub-cases.
- Validate: `node scripts/simulate-workflow-walkthrough.js` passes Case 17 sub-cases

### Task 8: Case 5k
- File: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- Write Set: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- Depends On: T1, T3
- Parallel Group: A (disjoint from T6, T7)
- Action: MODIFY (insert after line 1126)
- Implement: `pick-next` + `worktree-status` round-trip with issue 801; assert `verdict=acquired` and `worktree-status` returns matching entry; cleanup via `git worktree prune` + `fs.rmSync` in finally
- Mirror: Case 5j pattern at line 1123
- Validate: `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` passes Case 5k

### Task 9: Drift Mirrors
- Files: `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`, `plugins/kaola-workflow/scripts/validate-workflow-contracts.js`
- Write Set: both plugin files
- Depends On: T1–T8
- Parallel Group: A (final step before commit)
- Action: MODIFY
- Implement: `cp scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js && cp scripts/validate-workflow-contracts.js plugins/kaola-workflow/scripts/validate-workflow-contracts.js`
- Validate: `diff scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js` exits 0

### Task 10: Phase 4 Worktree Discovery Block
- File: `commands/kaola-workflow-phase4.md`
- Write Set: `commands/kaola-workflow-phase4.md`
- Depends On: Step 1 green
- Parallel Group: B (disjoint from T11)
- Action: MODIFY (insert after line 55)
- Implement: markdown section "## Worktree Discovery" with bash block using `${COORD_ROOT%/}.kw/${KAOLA_PROJECT}` formula (see advisor note: verify `KAOLA_PROJECT` convention before writing)
- Validate: `node scripts/validate-workflow-contracts.js` passes `assertIncludes('commands/kaola-workflow-phase4.md', 'ACTIVE_WORKTREE_PATH')`

### Task 11: workflow-next Guard
- File: `commands/workflow-next.md`
- Write Set: `commands/workflow-next.md`
- Depends On: Step 1 green
- Parallel Group: B (disjoint from T10)
- Action: MODIFY (insert 1 line after `KAOLA_STARTUP_SESSION=` line, before `KAOLA_SINK_FLAG=""` line)
- Implement: `[ "${KAOLA_WORKTREE_NATIVE:-0}" = "1" ] && { node "$CLAIM_JS" pick-next --session "$KAOLA_STARTUP_SESSION" --runtime claude ${KAOLA_SINK:+--sink $KAOLA_SINK} 2>&1; exit 0; } || true`
- Note: File goes from 248 → 249 lines. No line-count assertion in `validate-workflow-contracts.js`.
- Validate: `node scripts/validate-workflow-contracts.js` passes `assertIncludes('commands/workflow-next.md', 'KAOLA_WORKTREE_NATIVE')`

### Task 12: Docs
- Files: `CHANGELOG.md`, `README.md`
- Write Set: `CHANGELOG.md`, `README.md`
- Depends On: Step 2 green
- Parallel Group: C
- Action: MODIFY
- Implement: standard [Unreleased] entry; README section documenting `pick-next`, `resume`, `worktree-status`, `worktree-finalize`, and `KAOLA_WORKTREE_NATIVE`
- Validate: `npm test` exits 0

## Known Unknowns / Phase 4 Pre-Checks

Before implementing T4 (`cmdWorktreeFinalize`) and T10 (Phase 4 block), verify:

1. **`getCoordRoot()` semantics (grep before T4 coding)**: Confirm whether it uses `git rev-parse --git-common-dir` or `--show-toplevel`. If it uses `--show-toplevel` and is invoked from inside the issue worktree, the path computation in `cmdWorktreeFinalize` resolves correctly only because `worktreePathFor` uses `path.dirname(root)` — but the behavior depends on `root` being the main worktree's path. Read lines around line 580 in `scripts/kaola-workflow-claim.js` before writing T4.

2. **`KAOLA_PROJECT` env var convention (grep before T10 coding)**: Grep `KAOLA_PROJECT` across `commands/kaola-workflow-phase*.md` and `scripts/`. If unset by the phase command convention, change the bash fallback in the Worktree Discovery block from `${KAOLA_PROJECT:-${PWD##*/}}` to `:?KAOLA_PROJECT must be set in native mode` for loud failure rather than a silently wrong path.

3. **Phase 4 CWD locked decision**: Orchestrator stays on `main`; implementation edits target `.kw/issue-N` via `$ACTIVE_WORKTREE_PATH`. This is valid only because `ACTIVE_WORKTREE_PATH` uses `git rev-parse --show-toplevel` from main. If the session's cwd changes, this breaks. Do not refactor Phase 4 to use `--git-common-dir`.

## Integration Risks

1. `getCoordRoot()` in linked worktree: asserted to use `git rev-parse --git-common-dir` — safe from any worktree. Verify before T4 (see Known Unknowns #1).
2. Epic Case 17B race test: sequential (`KAOLA_WORKFLOW_OFFLINE=1`; 17A writes branch, 17B checks it locally) — reliable without parallelism.
3. `cmdWorktreeFinalize` dirty-check scope: intentionally ONLY `kaola-workflow/{project}/` — Phase 4 edits elsewhere in the worktree are allowed dirty.
4. `module.exports` extension: safe (no existing caller destructures new names).
5. workflow-next.md line count: 248 → 249 after +1 insert; no line-count assertion in `validate-workflow-contracts.js`.
6. Epic Case 17F complexity: cross-worktree setup is the highest-complexity test in the plan — see Task 7 note above.

## Advisor Notes

Full output in `.cache/advisor-plan.md`. Summary:
- All three fixes from advisor-gate are correct; no further architect revision needed.
- Write `phase3-plan.md` (this file) with three known unknowns for Phase 4 pre-checks.
- Epic Case 17F complexity explicitly called out for Phase 4 time estimation.
- `getCoordRoot()` semantics and `KAOLA_PROJECT` convention unresolved — Phase 4 must grep before coding T4 and T10.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | invoked | .cache/architect-revision-1.md | 3 blocking bugs from advisor-gate fixed |
