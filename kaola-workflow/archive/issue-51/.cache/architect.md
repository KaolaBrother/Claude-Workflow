## Architecture: issue-51 — Closed-Issue Lifecycle Cleanup, Codex Parity, Validation Green

### Design Decisions

- **H1 inserted at line 2107** (between `isRemoteStale` end and `cmdSweep` start): keeps the helper immediately adjacent to the only function that calls it in `cmdSweep`'s first pass, and close to `isRemoteStale` which it logically mirrors. Phase 4 must not insert it anywhere else.
- **`user_target_closed` needs no new dispatch arm in `cmdStartup`**: lines 1447–1468 already render `targetResult.status` generically. The new return value from `claimExplicitTarget` flows through automatically. Only a `reasoning` field is needed so the stderr line is useful.
- **`cmdWatchPr` CLOSED path is already fixed** (line 2340 calls `releaseSession` with no `remoteCleanup:false`). The code-explorer captured a stale state. B4's only remaining work for this path is extending test 7D to add a label-removal assertion. No implementation change needed at line 2340.
- **Second-pass GC is additive, not a rewrite**: a new branch runs before the existing 30-min-expired-lease path. If `step:complete` AND `phase6-summary.md` exists AND no lock → archive with status `closed`. The abandoned-lease path (lines 2170–2180) is untouched.
- **`cmdResume` ownership guard is permissive-on-no-lock**: if lock file absent → resume proceeds (legacy projects without lock). Guard only fires when lock exists AND `lock.session_id !== currentSessionId(args)` AND sessionId is non-empty. This is the only place `cmdResume` reads a lock file.
- **`KAOLA_KERNEL_SESSION_SKIP=1` in `repair-state.js`**: refusal (non-empty session mismatch) respects the env var — when `KAOLA_KERNEL_SESSION_SKIP=1` is set, `currentSessionId()` in repair-state may still return empty (it only reads env vars, not the skip flag). The fix changes the empty-sessionId early-return from `true` to `false`; `KAOLA_KERNEL_SESSION_SKIP` is an enforcement bypass for `enforcePlatformSessionOrExit`, not for ownership checks. Tests must set proper `KAOLA_SESSION_ID` to pass the guard.
- **B9 is a one-shot maintenance operation, not a source change**. No new code; explicit shell commands.
- **B10 and B11 are GitHub API operations**, no write set in the repo.

---

### Files to Create

| File | Purpose | Priority |
|------|---------|----------|
| (none) | All work is modifications to existing files | — |

---

### Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `scripts/kaola-workflow-claim.js` | H1 helper (`:2107`), H2 ticker gate (`:2088–2092`), `claimExplicitTarget` closed guard (`:1311` insert before `classifyIssueCandidate`), `cmdFinalize` releaseSession insert (`:1947` before `archiveProjectDir`), `cmdWorktreeFinalize` remoteCleanup flip (`:2761`), `cmdSweep` first-pass closed bypass (`:2125–2127` gate extension), `cmdSweep` second-pass GC additive branch (before `:2156`), `runTick` comment-only at `:2055` | Critical |
| `scripts/kaola-workflow-repair-state.js` | `ownedByCurrentSession:114–115` — change `if (!sessionId) return true` to `if (!sessionId) return false` | High |
| `scripts/simulate-workflow-walkthrough.js` | Test 9A3 env-gate (`:2390` spawn env), Epic 20A insertion (before `:6078`), Epic 20B insertion (before `:6078`), Epic 20C insertion (before `:6078`), test 7D gh-shim extension + label assertion (`:1437–1466`) | High |
| `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | Path fix at `:113` — change `path.join(root, 'scripts/kaola-workflow-compact-context.js')` to use repo-root resolution | High |
| `scripts/validate-script-sync.js` | Comment update at `:24` — clarify exclusion rationale | Low |

---

### Per-Task Write Sets and Validation Commands

#### Task B1 — H1 helper + H2 ticker Codex-safe + 9A3 env-gate

**Write set:**
- `scripts/kaola-workflow-claim.js:2107` — insert `isIssueClosed(issueNumber)` function (~10 lines) immediately after `isRemoteStale` ends at line 2106, before `cmdSweep` at line 2108. Body: `ghExec(['issue','view',String(n),'--json','state'])`, return `true` iff `state.toLowerCase() === 'closed'`, return `false` on OFFLINE / parse error / gh failure (fail-open).
- `scripts/kaola-workflow-claim.js:2088–2092` — replace the `if (tickCtx.claudePid === null) { stderr + return }` block with: `if (tickCtx.claudePid === null && process.env.CODEX_THREAD_ID == null && process.env.KAOLA_KERNEL_SESSION_SKIP !== '1' && (args.runtime !== 'codex')) { stderr + return }`. When Codex path detected, set `tickCtx.claudePid = null` and fall through to `runTick(tickCtx)`.
- `scripts/simulate-workflow-walkthrough.js:2390` — in the 9A3 spawn `env:` object, add `KAOLA_KERNEL_SESSION_SKIP: '1'` (or `KAOLA_KERNEL_SESSION_FAKE_PID`) so the ticker proceeds to its tiebreaker loop without requiring a Claude ancestor. The ticker will then read the mocked gh shim's comment IDs and self-terminate via late-yield.

**Also sync** (validate-script-sync.js requires byte-identical): after any claim.js edit, copy to `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`.

**Validation:** `node scripts/simulate-workflow-walkthrough.js` — 9A3 must pass. `node scripts/validate-script-sync.js` must exit 0.

---

#### Task B2 — Codex simulation path fix

**Write set:**
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js:7` — `root` is already `path.resolve(__dirname, '..')` = `plugins/kaola-workflow/`. Change line 113's path argument from `path.join(root, 'scripts/kaola-workflow-compact-context.js')` to `path.join(path.resolve(__dirname, '..', '..', '..'), 'scripts/kaola-workflow-compact-context.js')` (three levels up from `plugins/kaola-workflow/scripts/` reaches repo root). Alternatively, use a dedicated `repoRoot` variable for clarity.
- `scripts/validate-script-sync.js:24` — update comment to note `kaola-workflow-compact-context.js` is excluded because it is referenced via absolute repo-root path in the Codex simulation, not copied to the plugin tree.

**Validation:** `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` must exit 0 with no `Cannot find module` errors.

---

#### Task B3 — Epic 20A in RED state

**Write set:**
- `scripts/simulate-workflow-walkthrough.js` before line 6078 — insert Epic 20A assertion block (~30 lines). Scenario: create a lock file for a closed issue (issue_number set, synthetic session), run `sweep`, assert that label-removal gh call was made AND lock file was deleted AND worktree was removed. At B3 time, sweep lacks the `isIssueClosed` fast-path, so these assertions FAIL. This is the intentional RED commit.

**Validation:** `node scripts/simulate-workflow-walkthrough.js` — must FAIL at Epic 20A assertion (confirms RED state). Also `node scripts/validate-script-sync.js` must still exit 0 (test file not in COMMON_SCRIPTS).

---

#### Task B4 — Implement closed-issue cleanup; Epic 20A turns GREEN

This task has multiple sub-edits, all in `scripts/kaola-workflow-claim.js` except the test 7D extension. All claim.js changes must be applied together, then the file synced to the plugin tree.

**Write set:**

a. `scripts/kaola-workflow-claim.js:2125–2127` — first-pass sweep gate extension. Current gate is:
```
if (!synthetic && !shouldSweep(lock)) continue;
if (!synthetic && !isRemoteStale(lock)) continue;
```
Insert a closed-issue bypass branch BEFORE these two lines (~8 lines):
```
if (!synthetic && !OFFLINE && lock.issue_number != null && isIssueClosed(lock.issue_number)) {
  // closed-issue fast-path: bypass 24h dual cutoff
  ghExec(['issue','edit', String(lock.issue_number), '--remove-label', CLAIM_LABEL]);
  ghExec(['issue','edit', String(lock.issue_number), '--remove-assignee', '@me']);
  postReleaseComment(lock.issue_number, lock.session_id, ':released-closed-issue');
  try { removeWorktree(coordRoot, lock.project, lock); } catch (_) {}
  try { fs.unlinkSync(fp); } catch (_) {}
  continue;
}
```
The `removeWorktree` call is mandatory here per advisor verification #1 (worktrees issue-40/42/46 are registered; `git worktree prune` alone does not unregister a worktree whose dir exists).

b. `scripts/kaola-workflow-claim.js:1947` — `cmdFinalize` insert `releaseSession` BEFORE `archiveProjectDir`. Insert at line 1947 (before `const result = archiveProjectDir(...)`):
```
releaseSession(root, coordRoot, args.session, 'finalized');
```
This clears the label and assignee as part of every finalize path.

c. `scripts/kaola-workflow-claim.js:2761` — `cmdWorktreeFinalize` flip `remoteCleanup`:
Change `releaseSession(root, coordRoot, args.session, 'worktree-finalized', { remoteCleanup: false })` to `releaseSession(root, coordRoot, args.session, 'worktree-finalized')` (remove the options argument, defaulting to `remoteCleanup: true`).

d. `scripts/kaola-workflow-claim.js` — `claimExplicitTarget:1304–1327` — insert a closed-issue guard after `issueAlreadyClaimed` check (line 1305–1307) and before `classifyIssueCandidate` call (line 1311). New lines at ~1308:
```
if (!OFFLINE && isIssueClosed(targetIssue)) {
  return { status: 'user_target_closed', issue: targetIssue, project: 'issue-' + targetIssue,
    reasoning: 'GitHub issue #' + targetIssue + ' is closed; cannot claim a closed issue' };
}
```
No new dispatch arm needed in `cmdStartup` — the generic refusal branch at lines 1447–1468 renders `targetResult.status` directly. The `reasoning` field propagates through line 1463.

e. `scripts/simulate-workflow-walkthrough.js:1437–1466` — test 7D gh shim extension. The current shim at line 1439–1445 exits 0 for all calls. Extend it to record `gh issue edit --remove-label` invocations in a temp file. After the `watch-pr` call at line 1459–1460, add assertion before line 1465 (before `git branch -D`): read the temp file and assert it contains `--remove-label` call for issue 45. This converts the implicit behavior of the now-already-correct `cmdWatchPr` CLOSED path (line 2340, already without `remoteCleanup:false`) into an explicit regression test. Note: the implementation at line 2340 is already correct; this is test coverage only.

**Also sync:** copy `scripts/kaola-workflow-claim.js` to `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`.

**Validation:** `node scripts/simulate-workflow-walkthrough.js` — Epic 20A must pass GREEN, test 7D must pass. Full suite must exit 0. `node scripts/validate-script-sync.js` must exit 0.

---

#### Task B5 — Epic 20B (post-completion auto-claim refusal) RED then GREEN

**Write set:**
- `scripts/simulate-workflow-walkthrough.js` before line 6078 — insert Epic 20B assertion block (~20 lines). Scenario: after a session finalizes (cmdFinalize), call `cmdPickNext` or `cmdStartup` with no `--target-issue`; assert that `claim: 'none'` and `verdict: 'no_target'` in output (the existing `no_target` path at lines 1424–1443 enforces this). Then call `cmdStartup --target-issue N` for N that is now archived; assert `user_target_red` or `target_unavailable` (not `acquired`).

Since the existing `cmdPickNext` / `cmdStartup` code at lines 1300–1303 / 1424–1443 already refuses auto-pick, this epic is expected to pass GREEN immediately. If it fails, harden the refusal path. Do not introduce new code unless the test fails.

**Validation:** `node scripts/simulate-workflow-walkthrough.js` — Epic 20B must pass. Full suite must exit 0.

---

#### Task B6 — `cmdSweep` second-pass GC: `step:complete` + `phase6-summary.md` additive branch

**Write set:**
- `scripts/kaola-workflow-claim.js:2156–2181` — insert a new branch at the TOP of the second-pass loop body, BEFORE the existing `if (dirFiles.some(f => /^phase\d/.test(f))) continue` at line 2170. New branch (~8 lines):
```
// step:complete + phase6-summary.md present + no lock → archive as closed (not abandoned)
const stepValue = field(stateContent, 'step');
if (stepValue === 'complete' &&
    dirFiles.includes('phase6-summary.md') &&
    !fs.existsSync(lockPath(coordRoot, entry.name)) &&
    !fs.existsSync(lockPath(root, entry.name))) {
  try { archiveProjectDir(root, entry.name, 'closed'); } catch (_) {}
  continue;
}
```
The `stateContent` read (line 2171–2173) must be hoisted ABOVE this new branch since it uses `field(stateContent, 'step')`. Reorder: read `stateContent` first, then the new branch, then the existing `phase*.md` guard, then the `status:active` check, etc.

Note: `step:complete` dirs that lack `phase6-summary.md` (mid-flight complete before finalize ran) are left alone. `step:final-validation` dirs (issue-32, issue-46) do NOT match and are not auto-archived.

**Also sync** claim.js to plugin tree.

**Validation:** `node scripts/simulate-workflow-walkthrough.js` must exit 0. Manually verify `kaola-workflow/codex-parity/`, `cross-machine-followups/`, `minimal-ecc-config/` would be archived by this path (all have `step:complete` + `phase6-summary.md` per advisor verification #4).

---

#### Task B7 — `repair-state.js` ownership refusal + `cmdResume` ownership guard

**Write set (two disjoint files — can be applied in parallel):**

a. `scripts/kaola-workflow-repair-state.js:114–115` — change:
```
function ownedByCurrentSession(workflowDir, project, sessionId) {
  if (!sessionId) return true;
```
to:
```
function ownedByCurrentSession(workflowDir, project, sessionId) {
  if (!sessionId) return false;
```
Rationale: empty sessionId means no env vars are set; returning `true` grants implicit global access. `KAOLA_KERNEL_SESSION_SKIP=1` does not affect this function (it only bypasses `enforcePlatformSessionOrExit`). Tests using repair-state must set `KAOLA_SESSION_ID`.

b. `scripts/kaola-workflow-claim.js:2599` — `cmdResume` ownership guard. After `const projectDir = path.join(mainWorktree, 'kaola-workflow', project)` (line 2599), insert before `scanPhaseArtifacts(projectDir)` (~8 lines):
```
const sessionId = currentSessionId(args, { fallback: false });
if (sessionId) {
  const resumeLock = readJsonFile(lockPath(coordRoot, project));
  if (resumeLock && resumeLock.session_id && resumeLock.session_id !== sessionId) {
    process.stdout.write(JSON.stringify({
      resumed: false,
      reason: 'session mismatch — project owned by ' + resumeLock.session_id
    }) + '\n');
    process.exitCode = 1;
    return;
  }
}
// No lock → permissive (legacy resume)
```

This requires `coordRoot = getCoordRoot()` to be available at `cmdResume`; verify it is not already initialized there. If not, add `const coordRoot = getCoordRoot();` after `const mainWorktree = findMainWorktree()`.

**Also sync** claim.js to plugin tree.

**Validation:** `node scripts/simulate-workflow-walkthrough.js` must exit 0. `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` must exit 0.

---

#### Task B8 — Full end-to-end suite green verification

**Write set:** none (verification-only step).

**Validation:**
1. `node scripts/simulate-workflow-walkthrough.js` — must exit 0 with "Workflow walkthrough simulation passed".
2. `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` — must exit 0.
3. `node scripts/validate-script-sync.js` — must exit 0.
4. `node scripts/validate-workflow-contracts.js` — must exit 0.
5. `node scripts/validate-kaola-workflow-contracts.js` (if it exists in the plugin scripts tree) — must exit 0.

If any step fails, escalate before B9.

---

#### Task B9 — One-shot stale state cleanup (maintenance, no source change)

**Write set:** none (filesystem operations on the working tree and git worktree registry).

**Commands** (must be run in order, from the repo root):

```bash
# 1. Remove registered closed-issue worktrees
git worktree remove --force kaola-workflow.kw/issue-40
git worktree remove --force kaola-workflow.kw/issue-42
git worktree remove --force kaola-workflow.kw/issue-46
git worktree prune

# 2. Archive step:complete orphan dirs (terminal state confirmed by advisor verification #4)
#    These have phase6-summary.md; cmdSweep B6 would auto-archive them, but do it manually now
#    as part of the one-shot cleanup before that code lands.
mkdir -p kaola-workflow/archive
mv kaola-workflow/codex-parity kaola-workflow/archive/codex-parity
mv kaola-workflow/cross-machine-followups kaola-workflow/archive/cross-machine-followups
mv kaola-workflow/minimal-ecc-config kaola-workflow/archive/minimal-ecc-config

# 3. Manual archive for issue-32 and issue-46 dirs (step:final-validation, not step:complete;
#    do NOT auto-archive via sweep; issues are closed, dir is stale evidence)
mv kaola-workflow/issue-32 kaola-workflow/archive/issue-32.stale-final-validation
mv kaola-workflow/issue-46 kaola-workflow/archive/issue-46.stale-final-validation
```

**Note:** `issue-46` workflow-state.md has `status:active` + stale label (label removal handled by cmdSweep first-pass once B4 lands). Archiving the dir does NOT remove the GitHub label; run `gh issue edit 46 --remove-label workflow:in-progress --remove-assignee @me` manually if label persists after B4 sweep runs.

**Branches intentionally NOT deleted:** `workflow/issue-40`, `workflow/issue-42`, `workflow/issue-46` are left in place. They were already merged or closed via the merge-sink path; no lock files exist for them; branches are cheap storage. Deleting them with `git branch -D` would discard merge history that is already final. If disk space becomes a concern, a separate housekeeping step can remove them.

**Validation:** `git worktree list --porcelain` — issue-40, issue-42, issue-46 must not appear. `ls kaola-workflow/` — none of the five dirs should remain (only `archive/`, `issue-51/`).

---

#### Task B10 — File follow-up GitHub issues

**Write set:** none (GitHub API operations).

**Commands:**
```bash
# Follow-up #N1: Roadmap concurrency
gh issue create --title "Roadmap concurrency: atomic writes for kaola-workflow-roadmap.js" \
  --body "writeIfDiff (lines 99–106), cmdGenerate (127–135), cmdInitIssue (182–212) in scripts/kaola-workflow-roadmap.js use plain writeFileSync with no atomic rename. Two concurrent startups can race on cmdInitIssue. Fix: writeFileAtomic helper using fs.openSync(tmp,'wx') + fs.renameSync. Deferred from #51 Strategy B (no active evidence of corruption)."

# Follow-up #N2: Prompt footprint
gh issue create --title "Prompt footprint: extract Session Heartbeat / Startup Receipt Guard / kaola_script via claim.js print-startup-block" \
  --body "~3,200 words repeated verbatim across 14 files (7 Claude command files + 7 Codex SKILL.md files). New subcommand cmdPrintStartupBlock --platform=claude|codex outputs the block for eval-shim injection. Deferred from #51 Strategy B (wasteful but not incorrect). Anchors: commands/kaola-workflow-phase{1-6}.md, commands/kaola-workflow-fast.md; plugins/kaola-workflow/skills/*/SKILL.md."
```

Save the returned issue numbers as #N1 and #N2 for Task B11.

---

#### Task B11 — Update #51 close comment

**Write set:** none (GitHub API operation).

```bash
gh issue comment 51 --body "Closing #51. Ships: closed-issue lifecycle cleanup (sweep/finalize/worktree-finalize/claimExplicitTarget), both simulation suites green, Codex ticker parity (H2), repair-state/cmdResume ownership guards, regression epics 20A/20B/20C. Deferred ACs: roadmap atomic writes → #N1, prompt footprint → #N2."
gh issue close 51
```

---

### Build Sequence

Dependency order, with RED/GREEN markers for TDD:

1. **B1** — H1 helper + H2 ticker fix + 9A3 env-gate. No RED needed (9A3 currently fails without env gate; this makes it pass). Run suite; 9A3 must go GREEN.
2. **B2** — Codex simulation path fix. Independent of B1. Run Codex suite; must go GREEN.
3. **B3** — Epic 20A inserted in RED state. Commit intentionally failing. Confirms test is exercising the right path before implementation.
4. **B4** — Implement closed-issue cleanup. Epic 20A turns GREEN. Test 7D label assertion added. Entire suite must exit 0 after this step. **This is the largest task; do not split its claim.js edits across commits.**
5. **B5** — Epic 20B inserted and verified. Expected to be immediately GREEN (existing `no_target` / `user_target_red` paths already block auto-claim). If GREEN on insert, no implementation change needed.
6. **B6** — Second-pass GC additive branch. Run suite after. Verify no existing tests break.
7. **B7** — repair-state.js + cmdResume guard. Parallel opportunity: B7a (repair-state.js) and B7b (claim.js cmdResume) touch disjoint files but claim.js must sync to plugin tree. Apply both, sync, run suite.
8. **B8** — End-to-end verification. Gate: all five validation commands must exit 0 before proceeding.
9. **B9** — One-shot stale state cleanup. Run after B8 (suite green) to avoid sweeping dirs that tests might touch.
10. **B10** — File follow-up GitHub issues. Non-blocking for code review.
11. **B11** — Close #51. Must be last.

**claim.js sync requirement:** Every task that modifies `scripts/kaola-workflow-claim.js` must also copy it to `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` before running `validate-script-sync.js`. Batch these as the last step within each task.

---

### Parallelization Plan

**Lane A — Independent of claim.js (can proceed in parallel with any claim.js work):**
- B2: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js:113` path fix
- B2: `scripts/validate-script-sync.js:24` comment update
- B7a: `scripts/kaola-workflow-repair-state.js:114–115` ownership refusal

**Lane B — claim.js serial lane (must serialize due to single-file edits + sync requirement):**
- B1 (H1 helper, H2 ticker) → B4 (closed-issue cleanup, cmdFinalize, cmdWorktreeFinalize, claimExplicitTarget guard) → B6 (second-pass GC) → B7b (cmdResume guard)

**Lane C — Test-file work (serializes on simulate-workflow-walkthrough.js):**
- B3 (Epic 20A RED) → B4 test 7D extension → B5 (Epic 20B) → B6 validation only

**True parallelism:** B2 + B7a can be done concurrently with B1 if two engineers work simultaneously. B3 must wait for B2 to complete (confirm Codex suite green before adding RED assertions to Claude suite). Within a single-engineer sequence, B1→B3→B4→B5→B6→B7→B8 is the natural flow.

---

### Data Flow

```
isIssueClosed(n) [new helper at :2107]
  └── called by: cmdSweep first-pass [closed bypass at :2125]
  └── called by: claimExplicitTarget [guard at :~1308]

cmdSweep first-pass [closed bypass] → removeWorktree + unlinkSync + gh cleanup (fast-path)
cmdSweep first-pass [existing gate] → shouldSweep + isRemoteStale → gh cleanup + unlinkSync (unchanged)
cmdSweep second-pass [additive branch] → step:complete + phase6-summary.md → archiveProjectDir('closed')
cmdSweep second-pass [existing path] → status:active + expired lease → archiveProjectDir('abandoned')

cmdFinalize [insert releaseSession before archiveProjectDir at :1947]
cmdWorktreeFinalize [remoteCleanup:false → true at :2761]
cmdWatchPr CLOSED [already correct at :2340; test 7D adds assertion]

cmdTicker [H2 at :2088–2092] → Codex sessions proceed to runTick; ticker late-yield path fires
claimExplicitTarget [closed guard at :~1308] → user_target_closed → cmdStartup generic refusal at :1447–1468

repair-state ownedByCurrentSession [:114–115] → empty sessionId now returns false
cmdResume ownership guard [insert at :2599] → lock mismatch → refusal JSON
```

---

### External Dependencies

No new external dependencies introduced. Existing dependencies:
- `gh` CLI — already used throughout; `gh issue view --json state` in `isIssueClosed`; `gh issue edit --remove-label/--remove-assignee` in cleanup paths.
- `git` — `git worktree remove --force` in B9 one-shot cleanup; `git worktree prune` already called in `cmdSweep`.
- `node` — all scripts.
- `ps` — `walkToClaudePid`; unchanged.

---

### Test File Locations (locked)

| Test / Epic | File | Lines | Notes |
|-------------|------|-------|-------|
| Test 9A3 env-gate | `scripts/simulate-workflow-walkthrough.js` | 2390 (spawn env) | Add `KAOLA_KERNEL_SESSION_SKIP:'1'` to env |
| Test 7D gh-shim extension + label assertion | `scripts/simulate-workflow-walkthrough.js` | 1437–1466 | Extend shim to record remove-label; add assert before 1465 |
| Epic 20A (stale-closed-issue) | `scripts/simulate-workflow-walkthrough.js` | before 6078 | RED at B3, GREEN at B4 |
| Epic 20B (post-completion no-auto-claim) | `scripts/simulate-workflow-walkthrough.js` | before 6078, after 20A | Expected GREEN on insert |
| Epic 20C (watch-pr CLOSED clears label) | `scripts/simulate-workflow-walkthrough.js` | before 6078, after 20B | Covered by test 7D extension; 20C is a formal regression name for the same path |

All new epics insert sequentially before line 6078 (`console.log('Workflow walkthrough simulation passed')`). The file is 6094 lines. Do not insert after 6078 (in the `finally` block).

---

### Edge Cases the Blueprint Handles

| Edge Case | Behavior |
|-----------|----------|
| `isIssueClosed` on OFFLINE | Returns `false` (fail-open). First line of helper: `if (OFFLINE \|\| issueNumber == null) return false`. |
| `isIssueClosed` on transient gh error | Returns `false` (catch block returns false). |
| `cmdSweep` closed-issue branch when `lock.issue_number == null` | The condition is `!OFFLINE && lock.issue_number != null && isIssueClosed(lock.issue_number)`. If `issue_number` is null, condition is false; fall through to existing 24h gate. |
| `removeWorktree` when worktree dir does not exist | `removeWorktree` already handles this (wraps in try/catch, returns `{removed:false}`). No change needed. |
| `git worktree remove --force` with uncommitted changes | Logs warning to stderr, proceeds. `--force` is explicit. Caller catches and continues. |
| Second-pass GC: `phase6-summary.md` missing | New branch checks `dirFiles.includes('phase6-summary.md')`; if absent, branch does not run. Dir is left alone. |
| `cmdWorktreeFinalize` remoteCleanup flip — no existing test asserts label-persists | Confirmed by advisor verification #3: test 7D asserts only lock-removed and branch-not-deleted. Flip is safe. Test 7D extension (B4) adds the explicit label-removal assertion. |
| `claimExplicitTarget` closed guard during OFFLINE | `isIssueClosed` returns `false` on OFFLINE; guard does not fire. Existing checks (classifier, `issueAlreadyClaimed`) still run. |
| `cmdResume` when no lock exists | Guard reads lock; if `readJsonFile` returns null → permissive. Resume proceeds. |
| `repair-state.js` empty sessionId + `KAOLA_KERNEL_SESSION_SKIP=1` | `KAOLA_KERNEL_SESSION_SKIP` only bypasses `enforcePlatformSessionOrExit`. `currentSessionId()` in repair-state reads env vars (KAOLA_SESSION_ID, CODEX_THREAD_ID, CLAUDE_SESSION_ID). Tests must set one of these to non-empty; they cannot rely on the skip flag alone. |
| Epic 20A/20B/20C use synthetic session IDs | All new test epics use `synthetic-` prefix session IDs for unconditional sweep (per `isSyntheticTestSession` at line 584–586). |

---

### Out-of-Scope Items

Per phase2-ideation.md Strategy B:

1. **Roadmap atomic-write refactor** (`scripts/kaola-workflow-roadmap.js:99–106, 127–135, 182–212`) → follow-up #N1.
2. **`cmdPrintStartupBlock` subcommand** and 14-file prompt refactor → follow-up #N2.
3. **Contract validator assertion updates** for heartbeat block → follow-up #N2.
4. **`kaola-workflow-compact-context.js` added to `validate-script-sync.js` allowlist** — path-fix at plugin simulation line 113 is used instead; sync check exclusion comment is updated (B2) but allowlist is unchanged.
5. **Doc-updater main-worktree isolation gap** (MEMORY-tracked; separate issue track).
6. **Phase artifact mirror/archive/finalize consolidation**.
7. **New `lifecycle-gc` subcommand** (folded into `cmdSweep`).
8. **`cmdWatchPr` CLOSED implementation change** — already correct at line 2340 (no `remoteCleanup:false`); only test 7D needs extension.
9. **`runTick` late-yield `remoteCleanup: false` at line 2055** — this is intentional (tiebreaker-yield must not clear the winner's label); add comment only to document intent, no behavioral change.

---

### Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| **`isIssueClosed` adds `gh issue view` per lock per sweep — sweep latency grows at scale** | Low (sweep is infrequent; closed issues accumulate only until swept) | Call `isIssueClosed` only when `!synthetic && !OFFLINE && lock.issue_number != null && !shouldSweep(lock)` — i.e., only for locks that would otherwise survive the sweep. Closed issues that also pass `shouldSweep` take the existing path and avoid the gh call. |
| **`cmdWorktreeFinalize` remoteCleanup flip relies on `gh issue edit --remove-label` idempotency** | Low (gh CLI is idempotent on label removal) | Confirmed safe by advisor verification #3. Test 7D extension adds explicit assertion. If gh returns non-zero on already-absent label, the existing try/catch in `releaseSession:1874` absorbs the error. |
| **H2 ticker Codex bypass allows ticker to outlive its session if Codex exits abruptly** | Medium | The existing `match` check at `runTick:2025` unlinks the pid file and exits when the lock disappears. The lock is removed by release/sweep. No new risk introduced; this is the existing mechanism. |

---

### Uncertain Items (for advisor challenge)

1. **`cmdResume` coordRoot availability**: `cmdResume` at line 2581 does not currently call `getCoordRoot()`. Phase 4 must add `const coordRoot = getCoordRoot();` before the ownership guard insert. Confirm no side-effect from calling `getCoordRoot()` in resume context.

2. **`cmdSweep` first-pass closed bypass and `postReleaseComment`**: the helper is used in the existing sweep path at line 2135. Confirm `postReleaseComment(issue, session, ':released-closed-issue')` is a valid reason string (no whitelist check expected, but verify).

3. **Epic 20C scope**: If test 7D extension (B4) fully covers the `cmdWatchPr CLOSED → label removed` contract, Epic 20C may be a named alias for the same test rather than a new test block. Phase 4 may choose to make Epic 20C a comment-only marker pointing to 7D rather than a separate assertion block.
