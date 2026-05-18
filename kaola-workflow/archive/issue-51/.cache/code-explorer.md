## Exploration: Issue #51 — Workflow Lifecycle Cleanup, Parallel-Session Safety, Prompt-Footprint Gaps

### Entry Points

- `scripts/kaola-workflow-claim.js` — central dispatch for all workflow subcommands (claim, release, heartbeat, sweep, status, finalize, worktree-finalize, watch-pr, pick-next, bootstrap, ticker, repair-state)
- `scripts/kaola-workflow-sink-merge.js` — post-merge cleanup: branch delete, issue close, push
- `scripts/kaola-workflow-roadmap.js` — per-issue file generation and ROADMAP.md updates
- `scripts/kaola-workflow-repair-state.js` — repair active workflow-state files across all projects
- `scripts/simulate-workflow-walkthrough.js` — integration test (6094 lines, sequential epics)
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` — Codex-specific integration test (1100 lines)
- `commands/kaola-workflow-phase{1-6}.md` and `commands/kaola-workflow-fast.md` — Claude command files
- `plugins/kaola-workflow/skills/*/SKILL.md` — Codex skill files

---

### Section 1: Closed-Issue Lifecycle Cleanup

**The problem:** GitHub `workflow:in-progress` label and assignee can persist after an issue is closed.

**Code paths that should clean up:**

`releaseSession()` at `scripts/kaola-workflow-claim.js:1858–1891` runs `gh issue edit --remove-label CLAIM_LABEL --remove-assignee @me` at line 1874. This is the only function that clears the label and assignee.

**Code paths that do NOT call `releaseSession` with remote cleanup:**

1. `cmdFinalize()` at `scripts/kaola-workflow-claim.js:1921–1953` calls `archiveProjectDir()` (line 1934) but never calls `releaseSession`. No label/assignee cleanup path exists.

2. `cmdWorktreeFinalize()` at `scripts/kaola-workflow-claim.js:2718–2775` calls `releaseSession` at line 2761 but passes `{remoteCleanup: false}` — explicitly skips label/assignee removal.

3. `runTick()` at `scripts/kaola-workflow-claim.js:2015–2063` fires "ticker-late-yield" `releaseSession` at line 2055 also with `{remoteCleanup: false}`.

4. `cmdWatchPr()` at `scripts/kaola-workflow-claim.js:2296–2354`: MERGED path calls `releaseSession(…, 'merged')` (line 2318, remoteCleanup defaults true — label IS cleared); CLOSED/aborted path at line 2329 calls `releaseSession(…, 'aborted', {remoteCleanup: false})` — label NOT cleared for aborted PRs.

5. `cmdSweep()` at `scripts/kaola-workflow-claim.js:2108–2206`: removes label at line 2130 and assignee at line 2133 ONLY when `isSyntheticTestSession(lock) || (shouldSweep(lock) && isRemoteStale(lock))`. A closed issue whose lock has expired but whose GitHub comment was recently updated is NOT swept by this gate.

**`cmdSweep` does not check if the GitHub issue is closed:**

`cmdSweep` at lines 2108–2206 iterates lock files and checks `shouldSweep` and `isRemoteStale`. There is no call to `gh issue view` or any check of `issue.state === 'CLOSED'` within the sweep path. A closed issue is swept only if it also passes the 24-hour dual cutoff on both `expires` and `last_heartbeat` (line 576–580) AND the 24-hour cutoff on GitHub comment `updated_at` (lines 2096–2106).

**`claimExplicitTarget()` does not guard against claiming a closed issue:**

`claimExplicitTarget()` at `scripts/kaola-workflow-claim.js:1304–1327` calls `issueAlreadyClaimed()` but has no call to the classifier's closed-issue check. The classifier at `scripts/kaola-workflow-classifier.js:409–412` returns `{verdict: 'red'}` for closed issues, but `claimExplicitTarget` does not invoke the classifier.

**Live stale-label evidence:**

- `kaola-workflow/issue-46/workflow-state.md`: `status: active`, `step: final-validation`, `issue_number: 46`, `expires: 2026-05-17T23:59:16` (expired). GitHub issue #46 is CLOSED. Issue #46 still carries the `workflow:in-progress` label and `KaolaBrother` as assignee as of this audit. Lock file `.git/kaola-workflow/.locks/issue-46.lock` does not exist. Session file `.git/kaola-workflow/.sessions/5d5060b2-....startup.json` exists with `claim: "acquired"`, `startup_completed: true`.

- `kaola-workflow/issue-32/workflow-state.md`: `status: active`, `step: final-validation`, `issue_number: 32`, `expires: 2026-05-16T14:40:19` (expired). GitHub issue #32 is CLOSED. No lock file. No stale label/assignee (label was cleared by some path, but project dir was not archived).

**Orphaned completed project dirs (never archived):**

- `kaola-workflow/codex-parity/workflow-state.md`: `status: active`, `step: complete`
- `kaola-workflow/cross-machine-followups/workflow-state.md`: `status: active`, `step: complete`
- `kaola-workflow/minimal-ecc-config/workflow-state.md`: `status: active`, `step: complete`

All three have `step: complete` but remain un-archived (no `.archive/` rename). `archiveProjectDir()` is only called from `cmdFinalize` and not from any automatic sweep path.

**`archiveProjectDir()` definition:** `scripts/kaola-workflow-claim.js:1893–1919` — writes status/step to workflow-state.md then renames dir under `.archive/`. Does not clear labels or assignees.

---

### Section 2: Failing / Environment-Conditional Validation Simulations

**Test 9A3 in `scripts/simulate-workflow-walkthrough.js`:**

Location: lines 2358–2404.

The test spawns `cmdTicker` with `--session sess-9a3-loser --interval 50`. It does NOT set `KAOLA_KERNEL_SESSION_FAKE_PID` or `KAOLA_KERNEL_SESSION_SKIP`.

`cmdTicker()` at `scripts/kaola-workflow-claim.js:2065–2094` calls `walkToClaudePid()` at line 2087. `walkToClaudePid()` at lines 180–195 walks up to 5 parent PIDs using `ps -o ppid=,comm=` and matches against `/claude/i` regex. When no Claude ancestor exists (CI, Codex, bare shell), this returns `null`. Lines 2088–2092 in `cmdTicker` then exit early without calling `releaseSession`. The lock file for `sess-9a3-loser` is never released. The assertion at line 2402 — `'9A3: lock file must be released by ticker late-yield'` — then fails.

This test passes when run from within Claude Code (Claude ancestor is in the process tree), fails on CI or Codex. The main walkthrough returned exit 0 when run inside Claude Code during this audit precisely because of this environment dependency.

**Codex simulation failure — missing `kaola-workflow-compact-context.js`:**

`plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` line 7:
```
const root = path.resolve(__dirname, '..')
```
This resolves to `plugins/kaola-workflow/`.

Line 113 then calls:
```
execFileSync(process.execPath, [path.join(root, 'scripts/kaola-workflow-compact-context.js')], ...)
```
This resolves to `plugins/kaola-workflow/scripts/kaola-workflow-compact-context.js`.

That file does not exist. Only `scripts/kaola-workflow-compact-context.js` (repo root) exists. `validate-script-sync.js` lines 13–40 explicitly excludes `kaola-workflow-compact-context.js` from the byte-identical sync requirement (line 24), so no sync check catches this drift.

Running `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` produces:
```
Error: Cannot find module '.../plugins/kaola-workflow/scripts/kaola-workflow-compact-context.js'
```

---

### Section 3: Parallel-Session / Codex Isolation Gaps

**Session identity precedence:**

`envSessionId()` at `scripts/kaola-workflow-claim.js:166–171`:
1. `KAOLA_SESSION_ID`
2. `CODEX_THREAD_ID`
3. `CLAUDE_SESSION_ID`
4. `''` (empty string fallback)

**Platform session derivation:**

`derivePlatformSessionId()` at `scripts/kaola-workflow-claim.js:213–244`: reads `.runtime/{pid}.identity` files, validates PID alive and start time match. Falls back to `walkToClaudePid()` to locate the Claude process PID, then looks for its identity file.

**Ticker Codex gap:**

`cmdTicker()` at `scripts/kaola-workflow-claim.js:2065–2094`: calls `walkToClaudePid()` at line 2087. If the result is `null` (no Claude ancestor in process tree — expected on Codex), lines 2088–2092 write a log message and `return` immediately. The ticker never starts its heartbeat loop and never calls `releaseSession`. This means Codex sessions that start a ticker subprocess will silently never heartbeat and never release their locks through the ticker late-yield mechanism.

**`repair-state.js` operates without session check:**

`kaola-workflow-repair-state.js` `ownedByCurrentSession()` at lines 114–118: if `sessionId` (from `currentSessionId()` at lines 73–78, same env-var precedence) is the empty string, the function returns `true` at line 115. This means if no env vars are set, `repair-state` treats all active projects as owned by the current session and will operate on all of them. There is no startup receipt check anywhere in `repair-state.js`.

**Worktree path naming:**

`worktreePathFor()` at `scripts/kaola-workflow-claim.js:588–590`:
```
path.join(path.dirname(root), path.basename(root) + '.kw', project)
```
Worktrees are isolated per-project under `{repo}.kw/{project}/`. Two parallel sessions working on different issues get separate worktrees. Two sessions claiming the same issue are gated by the lock file, not the worktree path.

---

### Section 4: Roadmap Concurrency Safety

**`scripts/kaola-workflow-roadmap.js` has no file locking anywhere:**

`writeIfDiff()` at lines 99–106: plain `fs.writeFileSync`. No atomic rename, no lockfile, no advisory lock.

`cmdInitIssue()` at lines 182–212: uses `fs.existsSync` then `fs.writeFileSync` — a classic TOCTOU race. Two concurrent `kaola-workflow-roadmap init-issue` invocations for the same issue number can both pass the `existsSync` check and both write.

`cmdGenerate()` at lines 127–135: reads all per-issue markdown files, builds the roadmap string, then calls `writeIfDiff`. No locking around the read-build-write cycle. A concurrent write to a per-issue file during `cmdGenerate` produces a silently inconsistent ROADMAP.md.

There is no locking mechanism anywhere in `kaola-workflow-roadmap.js`.

---

### Section 5: Prompt-Footprint / Repetition Analysis

**Claude command files — `## Session Heartbeat` block:**

The block is verbatim-identical across all seven Claude command files (confirmed by diff returning empty):

| File | Heartbeat block lines | Startup Receipt Guard line |
|------|----------------------|---------------------------|
| `commands/kaola-workflow-phase1.md` | 24–50 | 53 |
| `commands/kaola-workflow-phase2.md` | 28–54 | 55 |
| `commands/kaola-workflow-phase3.md` | 26–52 | 53 |
| `commands/kaola-workflow-phase4.md` | 16–42 | 43 |
| `commands/kaola-workflow-phase5.md` | 30–56 | 57 |
| `commands/kaola-workflow-phase6.md` | 48–74 | 75 |
| `commands/kaola-workflow-fast.md` | 20–46 | 47 |

**`kaola_script(){}` shell function repetition:**

The function is a single-line definition inlined wherever a script path is resolved. Occurrence counts per file:

| File | Occurrences | Lines |
|------|------------|-------|
| `commands/kaola-workflow-phase1.md` | 3 | 29, 260, 329 |
| `commands/kaola-workflow-phase2.md` | 1 | 33 |
| `commands/kaola-workflow-phase3.md` | 1 | 31 |
| `commands/kaola-workflow-phase4.md` | 1 | 21 |
| `commands/kaola-workflow-phase5.md` | 1 | 35 |
| `commands/kaola-workflow-phase6.md` | 4 | 53, 455, 635, 643 |
| `commands/kaola-workflow-fast.md` | 1 | 25 |
| `commands/workflow-init.md` | 2 | 221, 280 |
| `commands/workflow-next.md` | 3 | 81, 167, 228 |

**Codex skill files — different pattern, also repeated:**

Codex skill files use `claim_script="plugins/kaola-workflow/scripts/kaola-workflow-claim.js"` with a `find` fallback, NOT the `kaola_script(){}` shell function. Exception: `plugins/kaola-workflow/skills/kaola-workflow-fast/SKILL.md` line 23 uses the Claude-style `kaola_script(){}` block.

`## Session Heartbeat` is present in 7 Codex skill files:

| Skill | Heartbeat lines |
|-------|----------------|
| `kaola-workflow-execute/SKILL.md` | ~10 |
| `kaola-workflow-fast/SKILL.md` | ~18 |
| `kaola-workflow-finalize/SKILL.md` | ~18 |
| `kaola-workflow-ideation/SKILL.md` | ~10 |
| `kaola-workflow-plan/SKILL.md` | ~10 |
| `kaola-workflow-research/SKILL.md` | ~18 |
| `kaola-workflow-review/SKILL.md` | ~10 |

The Codex heartbeat block differs from the Claude heartbeat block (diff shows ~15 lines of divergence). Both clusters contain independent repetition. `## Startup Receipt Guard` is present in the same 7 Codex skill files and in all 7 Claude command files.

---

### Section 6: Stale State Inventory

**Live stale-label confirmed:**

- `kaola-workflow/issue-46/`: `status: active`, `step: final-validation`, GitHub issue #46 CLOSED, `workflow:in-progress` label AND `KaolaBrother` assignee still present. Lock file absent. Session startup file present with `claim: "acquired"`.

**Archived project dirs with no GitHub cleanup concern:**

Issue #32: `kaola-workflow/issue-32/workflow-state.md` has `status: active`, `step: final-validation`. GitHub issue #32 CLOSED. No lock file. Label and assignee already cleared (no stale label). Project dir not archived.

**Completed-but-not-archived project dirs:**

- `kaola-workflow/codex-parity/workflow-state.md`: `status: active`, `step: complete`
- `kaola-workflow/cross-machine-followups/workflow-state.md`: `status: active`, `step: complete`
- `kaola-workflow/minimal-ecc-config/workflow-state.md`: `status: active`, `step: complete`

These three have `step: complete` but were never renamed to `.archive/`. No lock files exist for any. No GitHub labels/assignees outstanding (these are named projects, not issue-number projects).

---

### Section 7: Test Coverage Insertion Point

**Regression tests insertion point:**

`scripts/simulate-workflow-walkthrough.js` line 6078: `console.log('Workflow walkthrough simulation passed')`.

New epic assertions should be inserted before line 6078 in the sequential `async function main()` block (line 144). All existing epics are sequential — there is no parallel test runner. The file is 6094 lines total.

**Test 9A3 environment gate:**

Lines 2358–2404. Must be protected by `KAOLA_KERNEL_SESSION_FAKE_PID` or `KAOLA_KERNEL_SESSION_SKIP` env var check to avoid CI/Codex false failures, or the ticker subprocess must be spawned with a way to inject a synthetic Claude PID.

---

### Key Files

| File | Role | Importance |
|------|------|------------|
| `scripts/kaola-workflow-claim.js` | Central claim/release/sweep/heartbeat/ticker/finalize | Critical — all lifecycle paths |
| `scripts/kaola-workflow-roadmap.js` | Per-issue markdown + ROADMAP.md generation | High — concurrency gap |
| `scripts/kaola-workflow-repair-state.js` | Cross-project state repair | Medium — no session guard |
| `scripts/kaola-workflow-sink-merge.js` | Post-merge cleanup | Medium — no label cleanup |
| `scripts/simulate-workflow-walkthrough.js` | Integration test (Claude) | High — 9A3 env gap |
| `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | Integration test (Codex) | High — broken module ref |
| `scripts/validate-script-sync.js` | Byte-identical sync check for 7 scripts | Medium — excludes compact-context |
| `commands/kaola-workflow-phase{1-6}.md` | Claude command files | Medium — repeated heartbeat block |
| `plugins/kaola-workflow/skills/*/SKILL.md` | Codex skill files | Medium — independent heartbeat repetition |
| `kaola-workflow/issue-46/workflow-state.md` | Stale active dir for closed issue | Evidence |

---

### Dependencies

External:
- `gh` CLI (GitHub label/assignee management, issue close, PR watch)
- `git` (worktree management, fetch, push, merge-base)
- `ps` (PID ancestry walk in `walkToClaudePid`)
- `node` (all scripts)

Internal:
- `kaola-workflow-claim.js` exports: `getCoordRoot`, `removeWorktree` (used by `sink-merge.js`)
- `kaola-workflow-classifier.js` — issue verdict (red/yellow/green); called by startup but NOT by `claimExplicitTarget`
- `.git/kaola-workflow/.locks/{project}.lock` — advisory lock file (coordRoot-based)
- `.git/kaola-workflow/.sessions/{sessionId}.json` and `.startup.json` — session state files
- `.runtime/{pid}.identity` — platform session identity files
- `kaola-workflow/{project}/workflow-state.md` — per-project state (not inside coordRoot)

---

### Recommendations for New Development

(Facts only — these emerge directly from the findings above, no design opinion.)

- The label/assignee cleanup gap is in `cmdFinalize` (missing `releaseSession` call) and `cmdWorktreeFinalize` (`remoteCleanup: false`). Any fix must touch `scripts/kaola-workflow-claim.js` lines 1921–1953 and 2718–2775.
- `cmdSweep` sweep gates (`shouldSweep` + `isRemoteStale`) do not include closed-issue state; a new check would need to call `gh issue view {issue_number} --json state`.
- `claimExplicitTarget` does not invoke the classifier; a closed-issue guard would need to replicate or call into `kaola-workflow-classifier.js:409–412`.
- The 9A3 test must be made environment-agnostic before it can run on CI or Codex.
- The Codex simulation script must reference `kaola-workflow-compact-context.js` via the repo root path, not via `path.join(root, 'scripts/...')` where `root` is the plugin directory.
- Roadmap write operations have no concurrency protection; an atomic-write pattern (`writeFileSync` to a temp file + `renameSync`) would close the TOCTOU gap for single-writer scenarios.
- The repeated `## Session Heartbeat` block exists verbatim in 14 files (7 Claude + 7 Codex) with Claude and Codex versions differing from each other.
