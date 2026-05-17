# Code Explorer: Issue #40 — Worktree-Native Workflow Contract Gaps

## Entry Points

- `npm test` runs `validate-script-sync.js` → `validate-workflow-contracts.js` → `simulate-workflow-walkthrough.js` sequentially
- `/workflow-next` slash command triggered by the user inside a Claude Code session
- `KAOLA_WORKTREE_NATIVE=1` env flag at `commands/workflow-next.md:63` selects the native branch
- `node scripts/kaola-workflow-claim.js pick-next|resume|worktree-status|worktree-finalize` subcommands (lines 2444-2447)

---

## Flaw 1 — `npm test` fails: `validate-workflow-contracts.js` out of sync

**Bug 1a — Root validator fails on its own (`validate-workflow-contracts.js:268`):**
`kaola-workflow-classifier.js` has `plugins/kaola-workflow` at line 134 but the test asserts escaped form `plugins\/kaola-workflow`. This content check is failing before reaching the plugin parity loop.

**Bug 1b — `validate-script-sync.js` flags plugin-copy drift:**
The root copy (lines 323-335) has the parity loop with assertions for `cmdPickNext`, `cmdResume`, `cmdWorktreeStatus`, `cmdWorktreeFinalize`, `"if (sub === 'pick-next')"`, etc. in the plugin copy. The plugin copy (lines 323-325) has pre-Issue-37 weaker assertions: `assertIncludes('scripts/kaola-workflow-claim.js', 'pick-next')` (substring only). Root copy (line 340) adds `assertIncludes('commands/kaola-workflow-phase4.md', "git worktree list --porcelain")`; plugin copy lacks this.

Fix: `cp scripts/validate-workflow-contracts.js plugins/kaola-workflow/scripts/validate-workflow-contracts.js`

**Relevant files:**
- `scripts/validate-workflow-contracts.js` (lines 318-342)
- `plugins/kaola-workflow/scripts/validate-workflow-contracts.js` (lines 318-330)
- `scripts/validate-script-sync.js` (lines 32-40 define `COMMON_SCRIPTS` sync list)

---

## Flaw 2 — Native `/workflow-next` exits after `pick-next` JSON

**Location:** `commands/workflow-next.md:63`

```bash
[ "${KAOLA_WORKTREE_NATIVE:-0}" = "1" ] && { node "$CLAIM_JS" pick-next --session "$KAOLA_STARTUP_SESSION" --runtime claude ${KAOLA_SINK:+--sink $KAOLA_SINK} 2>&1; exit 0; } || true
```

The `exit 0` is unconditional after `pick-next`. The `pick-next` JSON (fields: `verdict`, `issue`, `project`, `branch`, `worktree_path`, `session`, `runtime`, `sink`) is printed to stdout but nothing reads or acts on it.

**Mirror:** Legacy path at lines 64-73 assigns `STARTUP_OUT=$(node ... startup ...)` and uses it downstream. The native path needs the same outer shell structure.

---

## Flaw 3 — Codex `kaola-workflow-next` skill has no worktree-native path

**Location:** `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md:39-51`

Startup section unconditionally calls `startup` with `--runtime codex` (line 44). No `KAOLA_WORKTREE_NATIVE` branch, no `pick-next` invocation, and no worktree routing. `validate-kaola-workflow-contracts.js` (Codex-side, 245 lines) has zero assertions for `pick-next`, `worktree-finalize`, `KAOLA_WORKTREE_NATIVE`, or `cmdPickNext`.

---

## Flaw 4 — Native `pick-next` does not create a startup receipt

**`cmdPickNext` (lines 2183-2233):** Calls `provisionWorktree`, labels GitHub issue, emits JSON. Never calls `writeStartupReceipt`.

**`writeStartupReceipt` (line 529):** Called by `cmdStartup` (lines 1245, 1266, 1287), `cmdHandoff` (line 1628). Not called by `cmdPickNext`.

**`cmdVerifyStartup` (lines 493-527):** Reads receipt via `readStartupReceipt`, calls `startupReceiptAuthorizesProject` which requires:
- `receipt.startup_completed === true`
- `receipt.session === sessionId`
- `receipt.claim` in `{'acquired', 'owned'}`
- For `claim === 'acquired'`: `receipt.selected_project === project && receipt.project === project`

All six phase commands have the verify-startup guard. In the native flow, `pick-next` never writes `.sessions/{sessionId}.startup.json`, so `verify-startup` exits 2 on every phase command permanently blocking phase work.

**Test gap:** Epic Case 17 (lines 4850-4991) tests 17A-K but never calls `verify-startup` after a `pick-next`.

---

## Flaw 5 — JS issue-selection logic is dangerously duplicated

**`cmdStartup` issue selection path (lines 1211-1303):**
- `fetchOpenIssueRecords(root)` → returns `{status, issues}` with full label/assignee data
- `sortIssueRecords(issueFetch.issues, { topTierLabels })` → sorts by `workflow:queued` first, then P0-P3 priority tiers, then issue number
- `readPriorityConfig(root)` → reads `~/.config/kaola-workflow/config.json` + `kaola-workflow/config.json`
- `classifyIssueCandidate(classifierScript, issueNumber)` → invokes `kaola-workflow-classifier.js classify --issue N`

**`cmdPickNext` issue selection path (lines 2183-2233):**
- `fetchOpenIssues(root, OFFLINE)` — simpler function (lines 2159-2181) that returns bare `{number}` objects with no label data
- `buildClaimedBranchSet(root, OFFLINE)` → branch name dedup only (lines 2138-2156)
- **Never calls** `readPriorityConfig`, `sortIssueRecords`, `classifyIssueCandidate`, or `runBootstrapClaim`

Result: `pick-next` ignores P0-P3 priority labels, `workflow:queued` ordering, blocked/yellow verdicts, shared-infrastructure warnings, and classifier skip reasons.

**Mirror:** `runStartupClaimFirstAvailable` function at lines 1190-1208 is the correct per-issue classify-then-claim loop.

---

## Flaw 6 — `worktree-finalize` fails when run from inside the issue worktree

**`cmdWorktreeFinalize` (lines 2397-2423):**
```js
const root = getRoot();  // ← line 2402, always getRoot()
const worktreePath = worktreePathFor(root, args.project);
```

**`getRoot()` (lines 83-92):** Runs `git rev-parse --show-toplevel`. When invoked from inside `{main}/.kw/{project}/`, returns the worktree's own directory, not the main repo root.

**`worktreePathFor(root, project)` (lines 587-589):**
```js
return path.join(path.dirname(root), path.basename(root) + '.kw', project);
```
If `root` = `/tmp/main/.kw/issue-N`, then `worktreePathFor` computes `/tmp/main/.kw.kw/issue-N` — wrong path.

**Fix:** Replace `getRoot()` with `findMainWorktree() || getRoot()`, mirroring `commitWorktreeArtifacts` (line 2371).

---

## Flaw 7 — Native `resume` advances phases based only on artifact existence

**`cmdResume` (lines 2283-2320) calls `scanPhaseArtifacts(projectDir)` (lines 2265-2281):**
```js
const PHASE_ARTIFACTS = [
  { file: 'phase4-progress.md', phase: 4, next: '/kaola-workflow-phase5 {project}' },
  ...
];
const found = PHASE_ARTIFACTS.find(e => fs.existsSync(path.join(projectDir, e.file)));
```

Does not read `workflow-state.md`. Does not check: `status: active` vs `status: released`, pending compliance gates, `next_command` or `step` fields, or whether `phase4-progress.md` has all tasks complete.

**`projectDir` source:** `path.join(mainWorktree, 'kaola-workflow', project)` — correctly reads from main worktree.

---

## Flaw 8 — Native `pick-next` bypasses startup's priority/classifier/skip logic

Documented in Flaw 5. Key comparison table:

| | `cmdStartup` | `cmdPickNext` |
|---|---|---|
| Issue fetch | `fetchOpenIssueRecords` (with labels) | `fetchOpenIssues` (bare numbers) |
| Priority sort | `sortIssueRecords({topTierLabels})` | None |
| Classifier | `classifyIssueCandidate` per issue | None |
| Blocked tracking | `blocked.push(...)` | None |
| Skipped tracking | `skipped.push(...)` | None |
| Claim | `runBootstrapClaim` | `provisionWorktree` directly |
| Yellow-verdict cache | Yes (writes `parallel-classifier.md`) | No |

---

## Flaw 9 — Active workflow state placement is ambiguous

- `cmdPickNext` provisions worktree at `{main}/../{basename}.kw/{project}`. No `kaola-workflow/{project}/workflow-state.md` written in main worktree.
- `cmdStartup` / `cmdClaim` writes `workflow-state.md` to `{root}/kaola-workflow/{project}/workflow-state.md` (main worktree, line 1439).
- `cmdResume` reads `projectDir` from `mainWorktree` (line 2301), expects state in main worktree.
- `commitWorktreeArtifacts` (lines 2364-2395) copies `kaola-workflow/{project}/` from main to issue worktree — only invoked by `worktree-finalize`.

Gap: between `pick-next` (no state written) and `worktree-finalize` (sync occurs), phase commands writing artifacts to `cwd/kaola-workflow/{project}/` inside the issue worktree produce state in the worktree branch but not in the main worktree, so `resume` can't find it.

---

## Flaw 10 — Cleanup/archive not mandated in native flow

**`cmdFinalize` (lines 1729-1761):** Archives `kaola-workflow/{project}/` to `kaola-workflow/archive/{project}/`, unlocks lock file. **`cmdWorktreeFinalize` (lines 2397-2423):** Commits artifacts only. Does NOT call `archiveProjectDir`, `releaseSession`, or `removeWorktree`.

The legacy flow terminates with `finalize` (archive + release). The native flow has no equivalent mandated termination sequence.

---

## Flaw 11 — Orphan detection is incomplete

**Existing:**
1. `cmdSweep` second pass (lines 1964-1989): Scans `kaola-workflow/` dirs, archives if no lock file and `expires` < 30 min ago.
2. `cmdTicker` exits if Claude PID is gone (line 1897).
3. `removeWorktree` defers via `.pending-removal/` if cwd is inside worktree (line 639).

**Gaps:**
- Worktrees created by `pick-next` not tracked in `.locks/`. Sweep GC checks lock file presence but `pick-next` writes no `expires` in `workflow-state.md` either (Flaw 9), so GC skips at line 1985: `if (!expiresStr) continue`.
- No scheduled scan of `git worktree list --porcelain` for worktrees with no corresponding `.lock` or active `workflow-state.md`.
- `drainPendingRemovals` only called from `cmdSweep` (line 1962), which only runs during startup.

---

## Architecture Reference

- **`getRoot()` vs `getCoordRoot()`:** `getRoot()` = `git rev-parse --show-toplevel` (worktree-local). `getCoordRoot()` = `git --git-common-dir` (shared across worktrees). Locks, sessions, tickers, receipts live under `coordRoot`. Phase artifacts live under `root` (main worktree).
- **`worktreePathFor(root, project)`:** `path.join(path.dirname(root), path.basename(root) + '.kw', project)`. Must receive main worktree root.
- **Startup receipt pattern:** `writeStartupReceipt(coordRoot, sessionId, data)` → `{coordRoot}/kaola-workflow/.sessions/{sessionId}.startup.json`. Fields: `startup_completed: true`, `session`, `written_at`, `claim` (`"acquired"` | `"owned"` | `"none"`), `project`, `selected_project`, `issue`, `selected_issue`, `verdict`, `skipped[]`, `blocked[]`, `ranking[]`.
- **`verify-startup` contract:** `authorized: true` requires `startup_completed === true`, `session === sessionId`, `claim` in `{acquired, owned}`, and project match. Exit code 2 on failure.
- **`findMainWorktree()` (line 2236):** Parses `git worktree list --porcelain` to find main worktree path — safe to call from any worktree.
- **Drift guard:** `validate-script-sync.js` enforces byte-identity for 7 files. The two simulate files are intentionally excluded.

---

## Key File Summary

| File | Role |
|------|------|
| `scripts/kaola-workflow-claim.js` | All subcommand implementations; `cmdPickNext` (2183), `cmdResume` (2283), `cmdWorktreeFinalize` (2397), `cmdStartup` (1211), `cmdVerifyStartup` (493), `writeStartupReceipt` (529), `findMainWorktree` (2236) |
| `scripts/validate-workflow-contracts.js` | Root contract validator; lines 318-342 parity loop plugin copy lacks |
| `plugins/kaola-workflow/scripts/validate-workflow-contracts.js` | Stale; lines 323-325 have pre-37 weaker assertions |
| `scripts/validate-script-sync.js` | Byte-equality drift guard for 7 common scripts |
| `commands/workflow-next.md` | Router; KAOLA_WORKTREE_NATIVE branch at line 63; `exit 0` after pick-next |
| `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` | Codex router skill; no KAOLA_WORKTREE_NATIVE path |
| `scripts/simulate-workflow-walkthrough.js` | Epic Case 17 (lines 4822-5003); tests 17A-K; missing 17L (verify-startup after pick-next), 17M (finalize from inside worktree) |
| `scripts/validate-kaola-workflow-contracts.js` | Codex-side validator (245 lines); zero pick-next/worktree-native assertions |
| `commands/kaola-workflow-phase1.md` | Phase guard template; Startup Receipt Guard at lines 53-65 |

---

## Env Vars / Config

- `KAOLA_WORKTREE_NATIVE` — enables native pick-next path in router
- `KAOLA_SESSION_ID` — session identity
- `KAOLA_COORD_ROOT` — override for coord root
- `KAOLA_WORKFLOW_OFFLINE` — skip network calls
- `KAOLA_SINK` — sink type (merge|pr)
- `KAOLA_ENFORCE_PLATFORM_SESSION` — enforces platform session check
- `~/.config/kaola-workflow/config.json` + `kaola-workflow/config.json` — priority top-tier labels

---

## Test Structure

- Framework: hand-rolled `assert()` throws, `execFileSync` for subprocess tests
- Location: `scripts/simulate-workflow-walkthrough.js`
- Structure: numbered cases (1-17+), each with setup → action → assertion pattern
- Epic Case 17 (lines 4822-5003): worktree-native scenarios 17A-K
- Missing: 17L (verify-startup after pick-next), 17M (finalize from inside worktree)
- Codex: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` (intentionally different, not synced)
