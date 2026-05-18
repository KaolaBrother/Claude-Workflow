# Phase 3 - Plan: issue-51

## Blueprint

### Files to Create
| File | Purpose | Key Interfaces |
|------|---------|----------------|
| (none) | All work is modifications to existing files | — |

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `scripts/kaola-workflow-claim.js` | H1 helper at `:2107`; H2 ticker Codex gate at `:2088–2092`; `claimExplicitTarget` closed guard inserted at `:~1308`; `cmdFinalize` `releaseSession(... 'finalized')` insert at `:1947` before `archiveProjectDir`; `cmdWorktreeFinalize` `remoteCleanup:false` → default `true` at `:2761`; `cmdSweep` first-pass closed bypass at `:2125–2127`; `cmdSweep` second-pass additive GC branch before `:2156`; `cmdResume` ownership guard at `:2599`; `runTick` clarifying comment at `:2055` | Lifecycle cleanup + Codex parity + closed-issue gate (Strategy B core) |
| `scripts/kaola-workflow-repair-state.js` | `ownedByCurrentSession:114–115` — `if (!sessionId) return true` → `return false` | Closes implicit-cross-session repair hole |
| `scripts/simulate-workflow-walkthrough.js` | 9A3 env-gate at `:2390` (add `KAOLA_KERNEL_SESSION_SKIP:'1'`); Epic 20A insertion before `:6078`; Epic 20B insertion before `:6078`; test 7D gh-shim extension + label assertion at `:1437–1466`; Epic 20C = comment-only marker pointing to 7D (avoid duplicate test) | Regression coverage + green simulation |
| `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | Line `:113` path fix — resolve compact-context script via `path.resolve(__dirname, '..', '..', '..')` (repo root) | Unbreak Codex simulation |
| `scripts/validate-script-sync.js` | Comment update at `:24` — clarify exclusion rationale | Documentation only |
| `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` | Sync after every claim.js edit (`scripts/validate-script-sync.js` requires byte-identical) | Sync requirement |

### Build Sequence
1. **B1** — H1 (`isIssueClosed`) helper + H2 (ticker Codex-safe gate) + 9A3 env-gate. No RED needed; 9A3 currently fails, this turns it GREEN.
2. **B2** — Codex simulation path fix at `:113` + comment update in `validate-script-sync.js`. Independent of B1; can be done in parallel.
3. **B3** — Epic 20A inserted RED (assertions fail before B4 lands).
4. **B4** — Implement closed-issue cleanup: `cmdSweep` first-pass closed bypass (includes `removeWorktree` explicit call), `cmdFinalize` releaseSession insert, `cmdWorktreeFinalize` remoteCleanup flip, `claimExplicitTarget` closed guard, test 7D gh-shim + label assertion. Epic 20A turns GREEN. NOTE: `cmdWatchPr:2340` is already correct (no `remoteCleanup:false`) per advisor verification — test 7D extension only.
5. **B5** — Epic 20B inserted; expected immediately GREEN (existing `cmdPickNext` no_target / `cmdStartup` `user_target_red` paths already block auto-claim per advisor V2). If GREEN on insert, log "test added, no implementation change needed" in phase4-progress.md.
6. **B6** — `cmdSweep` second-pass additive GC: archive dirs with `step:complete` AND `phase6-summary.md` present AND no lock. Hoist `stateContent` read above the new branch. Existing `phase*.md` guard and abandoned-lease path unchanged.
7. **B7** — Parallel-safe: `repair-state.js:114–115` ownership refusal AND `cmdResume:2599` ownership guard (different files; can apply concurrently). Ensure `coordRoot = getCoordRoot()` is available in `cmdResume`.
8. **B8** — End-to-end gate: `simulate-workflow-walkthrough.js`, `plugins/.../simulate-kaola-workflow-walkthrough.js`, `validate-script-sync.js`, `validate-workflow-contracts.js`, `validate-kaola-workflow-contracts.js` all must exit 0.
9. **B9** — One-shot stale state cleanup. `git status` each worktree first, capture output to `.cache/b9-cleanup-evidence.md`, THEN `git worktree remove --force` issue-40/42/46 + `git worktree prune`. Archive terminal-state orphan dirs (codex-parity, cross-machine-followups, minimal-ecc-config) into `kaola-workflow/archive/`. Manual archive for `issue-32`, `issue-46` with `.stale-final-validation` suffix.
10. **B10** — File follow-up GitHub issues #N1 (roadmap atomic) and #N2 (prompt-slim subcommand). Save numbers for B11.
11. **B11** — `#51` close comment listing deferred ACs with links to #N1 / #N2; then `gh issue close 51`. (Note: Phase 6 handles this via the sink-merge pipeline; Phase 4 implements the cleanup, Phase 5 reviews, Phase 6 finalizes.)

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| Lane A — Independent of claim.js | B2 (Codex sim path fix), B2b (validate-script-sync.js comment), B7a (repair-state.js) | Disjoint files; no claim.js edits |
| Lane B — claim.js serial | B1 → B4 → B6 → B7b | Single-file serialization required; sync to plugin tree after each |
| Lane C — Test file (simulate-workflow-walkthrough.js) serial | B3 (Epic 20A RED) → B4 (test 7D ext) → B5 (Epic 20B) → B6 (validation only) | Same file; insertions and edits must serialize |

Within a single-engineer flow, B1→B2→B3→B4→B5→B6→B7→B8 is the natural sequence.

### External Dependencies
- No new external deps.
- Existing: `gh` CLI (`issue view --json state` for H1; `issue edit --remove-label/--remove-assignee` for cleanup), `git` (`worktree remove --force`, `worktree prune`), `node`, `ps`.

## Task List

### Task B1: H1 helper + H2 ticker Codex-safe + 9A3 env-gate
- Files: `scripts/kaola-workflow-claim.js`, `scripts/simulate-workflow-walkthrough.js`, `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` (sync)
- Test File: `scripts/simulate-workflow-walkthrough.js:2390`
- Write Set: H1 insert at `:2107` (~10 lines); H2 gate at `:2088–2092` (~5 lines); 9A3 spawn env at `:2390` (add `KAOLA_KERNEL_SESSION_SKIP:'1'`)
- Depends On: none
- Parallel Group: Lane B (serial start)
- Action: MODIFY
- Implement:
  - H1: `function isIssueClosed(issueNumber) { if (OFFLINE || issueNumber == null) return false; try { const raw = ghExec(['issue','view',String(issueNumber),'--json','state']); if (!raw) return false; const data = JSON.parse(raw); return String(data.state || '').toLowerCase() === 'closed'; } catch (_) { return false; } }` — fail-open on errors.
  - H2: replace null-check return with OR-of-three gate per advisor V1 — `if (tickCtx.claudePid === null && args.runtime !== 'codex' && !process.env.CODEX_THREAD_ID && process.env.KAOLA_KERNEL_SESSION_SKIP !== '1') { stderr + return }`. When Codex/skip path detected, leave `tickCtx.claudePid = null` and proceed to `runTick`.
  - 9A3 env-gate: in the ticker spawn `env:` object near line 2390, add `KAOLA_KERNEL_SESSION_SKIP: '1'`.
- Mirror: `isRemoteStale:2096–2106` pattern for gh-error fail-open.
- Validate: `node scripts/simulate-workflow-walkthrough.js` (9A3 must pass), `node scripts/validate-script-sync.js` (exit 0).

### Task B2: Codex simulation path fix + sync-validator comment
- Files: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`, `scripts/validate-script-sync.js`
- Test File: same simulation file (self-validating)
- Write Set: line 113 path → repo-root resolution; `validate-script-sync.js:24` comment text
- Depends On: none (independent of all claim.js work)
- Parallel Group: Lane A
- Action: MODIFY
- Implement:
  - `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js:113` — replace `path.join(root, 'scripts/kaola-workflow-compact-context.js')` with `path.join(path.resolve(__dirname, '..', '..', '..'), 'scripts/kaola-workflow-compact-context.js')` (three levels up from `plugins/kaola-workflow/scripts/` reaches repo root). Or define a `repoRoot` constant near the existing `root` declaration.
  - `scripts/validate-script-sync.js:24` — update comment to "Excluded: `kaola-workflow-compact-context.js` is invoked from the Codex simulation via repo-root absolute path, not synced to the plugin tree."
- Mirror: existing `root` derivation at `plugins/.../simulate-kaola-workflow-walkthrough.js:7`.
- Validate: `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` (exit 0, no `Cannot find module` error).

### Task B3: Epic 20A in RED state
- File: `scripts/simulate-workflow-walkthrough.js`
- Test File: same
- Write Set: ~30 lines inserted before `:6078`
- Depends On: B1 (must pass), B2 (must pass)
- Parallel Group: Lane C serial
- Action: MODIFY
- Implement: Epic 20A "stale-closed-issue regression":
  - Setup: tmpdir + git init + write lock file with `issue_number:46, session_id:'synthetic-20a-'+Date.now(), worktree_path:<path>`, then create the worktree path on disk as a normal subdir (no git worktree register for synthetic case).
  - Mock gh: shim that returns `{"state":"CLOSED"}` for `gh issue view 46 --json state`; records `gh issue edit ... --remove-label` calls to a log file.
  - Action: run `node claim.js sweep`.
  - Asserts: lock file removed; `gh issue edit --remove-label workflow:in-progress` was called for issue 46; `gh issue edit --remove-assignee @me` was called; worktree path no longer exists.
  - Sub-assert for `claimExplicitTarget` closed guard: run `node claim.js startup --target-issue 46` with same gh shim; assert verdict `user_target_closed` in JSON output and `reasoning` contains "closed".
- Mirror: Epic 7D structure at `:1437–1466`.
- Validate: `node scripts/simulate-workflow-walkthrough.js` must FAIL at Epic 20A (confirms RED). `node scripts/validate-script-sync.js` must exit 0 (test file not in COMMON_SCRIPTS).

### Task B4: Implement closed-issue cleanup (Epic 20A → GREEN)
- Files: `scripts/kaola-workflow-claim.js`, `scripts/simulate-workflow-walkthrough.js`, `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` (sync)
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set:
  - `scripts/kaola-workflow-claim.js:2125–2127` — first-pass sweep closed bypass per advisor V4 composition: compute `const closedFastPath = !synthetic && !OFFLINE && lock.issue_number != null && isIssueClosed(lock.issue_number);` BEFORE the two `continue` lines; gate them with `if (!synthetic && !closedFastPath && !shouldSweep(lock)) continue;` etc. Then inside the cleanup loop, when `closedFastPath || (shouldSweep && isRemoteStale)`, perform the gh edit + assignee + postReleaseComment + `removeWorktree(coordRoot, lock.project, lock)` + `fs.unlinkSync(fp)`.
  - `scripts/kaola-workflow-claim.js:1947` — `cmdFinalize` insert `releaseSession(root, coordRoot, args.session, 'finalized');` before `archiveProjectDir`.
  - `scripts/kaola-workflow-claim.js:2761` — `cmdWorktreeFinalize` change `releaseSession(... 'worktree-finalized', { remoteCleanup: false })` → `releaseSession(... 'worktree-finalized')`.
  - `scripts/kaola-workflow-claim.js:~1308` — `claimExplicitTarget` closed guard: after `issueAlreadyClaimed` check, insert `if (!OFFLINE && isIssueClosed(targetIssue)) return { status: 'user_target_closed', issue: targetIssue, project: 'issue-' + targetIssue, reasoning: 'GitHub issue #' + targetIssue + ' is closed; cannot claim a closed issue' };` per advisor V3 fail-open requirement (already in `isIssueClosed`).
  - `scripts/kaola-workflow-claim.js:2055` — comment-only above `releaseSession(..., 'ticker-late-yield', { remoteCleanup: false })`: `// remoteCleanup:false intentional — tiebreaker-yield must not clear the winning session's label/assignee`.
  - `scripts/simulate-workflow-walkthrough.js:1437–1466` — test 7D gh-shim extension: change shim to log all `gh issue edit ...` calls to a temp file; after the `watch-pr` invocation at `:1459–1460`, add assertion `assert(ghLog.includes('--remove-label'), '7D: label must be removed on CLOSED');` before the existing branch-not-deleted assertion at line `:1466`.
  - Pre-flight greps (advisor V5): `grep -n postReleaseComment scripts/kaola-workflow-claim.js` to confirm no allowlist; if allowlist exists, reuse `:released-stale` instead of `:released-closed-issue`.
- Depends On: B1, B2, B3
- Parallel Group: Lane B/C
- Action: MODIFY
- Implement: per write set above. Apply all claim.js edits together, sync to plugin tree, run full suite.
- Mirror: existing `cmdSweep` first-pass cleanup pattern; existing `releaseSession` call in `cmdSweep`.
- Validate: `node scripts/simulate-workflow-walkthrough.js` must exit 0 (Epic 20A GREEN, test 7D pass, all existing tests still pass); `node scripts/validate-script-sync.js` exit 0; `node scripts/validate-workflow-contracts.js` exit 0; `node scripts/validate-kaola-workflow-contracts.js` exit 0.

### Task B5: Epic 20B (post-completion no-auto-claim)
- File: `scripts/simulate-workflow-walkthrough.js`
- Test File: same
- Write Set: ~20 lines inserted before `:6078` after Epic 20A
- Depends On: B4
- Parallel Group: Lane C
- Action: MODIFY
- Implement: Epic 20B "post-completion auto-claim refusal":
  - Setup: tmpdir + git init + simulate a finalized issue (synthetic session, archived dir, no lock).
  - Action: run `node claim.js pick-next` and `node claim.js startup` with no `--target-issue` flag and no `KAOLA_TARGET_ISSUE` env.
  - Asserts: output JSON shows `verdict: 'no_target'` OR a typed refusal; `claim: 'none'`; no lock file created.
- Mirror: existing pick-next/startup test cases.
- Validate: `node scripts/simulate-workflow-walkthrough.js` — Epic 20B passes. Per advisor V2: if it passes immediately, log "test added, no implementation change needed."

### Task B6: Second-pass GC additive branch
- Files: `scripts/kaola-workflow-claim.js`, `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` (sync)
- Test File: `scripts/simulate-workflow-walkthrough.js` (validation only, no new test required)
- Write Set: insert ~8-line branch in `cmdSweep` second pass at `:2156` (BEFORE the existing `phase*.md` guard at `:2170`); hoist `stateContent` read up
- Depends On: B4
- Parallel Group: Lane B
- Action: MODIFY
- Implement: new branch in second-pass loop body — `if (stepValue === 'complete' && dirFiles.includes('phase6-summary.md') && !fs.existsSync(lockPath(coordRoot, entry.name)) && !fs.existsSync(lockPath(root, entry.name))) { try { archiveProjectDir(root, entry.name, 'closed'); } catch (_) {} continue; }`. `step:final-validation` dirs do NOT match.
- Mirror: existing abandoned-lease path at `:2170–2180`.
- Validate: `node scripts/simulate-workflow-walkthrough.js` exit 0; verify codex-parity / cross-machine-followups / minimal-ecc-config would be auto-archived by this path (they all have `step:complete` + `phase6-summary.md`).

### Task B7: repair-state + cmdResume ownership guards
- Files: `scripts/kaola-workflow-repair-state.js`, `scripts/kaola-workflow-claim.js`, `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` (sync)
- Test File: `scripts/simulate-workflow-walkthrough.js` (existing or new assertions)
- Write Set:
  - **B7a** (Lane A — parallel-safe with claim.js): `scripts/kaola-workflow-repair-state.js:114–115` — `if (!sessionId) return true;` → `if (!sessionId) return false;`.
  - **B7b** (Lane B): `scripts/kaola-workflow-claim.js:~2599` — `cmdResume` ownership guard. Add `const coordRoot = getCoordRoot();` if not present, then insert before `scanPhaseArtifacts`: `const sessionId = currentSessionId(args, { fallback: false }); if (sessionId) { const resumeLock = readJsonFile(lockPath(coordRoot, project)); if (resumeLock && resumeLock.session_id && resumeLock.session_id !== sessionId) { process.stdout.write(JSON.stringify({ resumed: false, reason: 'session mismatch — project owned by ' + resumeLock.session_id }) + '\n'); process.exitCode = 1; return; } }`. Permissive when no lock.
- Depends On: B6 (sync ordering)
- Parallel Group: B7a in Lane A, B7b in Lane B
- Action: MODIFY
- Mirror: existing `ownedByCurrentSession` in claim.js (different from repair-state's) and `currentSessionId(args, {fallback: false})` callers.
- Validate: `node scripts/simulate-workflow-walkthrough.js` exit 0; `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` exit 0.

### Task B8: End-to-end suite gate
- Files: none (verification-only)
- Test File: all five validators
- Write Set: none
- Depends On: B7
- Parallel Group: serial gate
- Action: VERIFY
- Implement: run all five commands; each must exit 0:
  1. `node scripts/simulate-workflow-walkthrough.js`
  2. `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
  3. `node scripts/validate-script-sync.js`
  4. `node scripts/validate-workflow-contracts.js`
  5. `node scripts/validate-kaola-workflow-contracts.js`
- Validate: each command exit 0; if any fails, escalate before B9.

### Task B9: One-shot stale state cleanup (maintenance)
- Files: filesystem ops + `.cache/b9-cleanup-evidence.md` (NEW)
- Test File: N/A
- Write Set: filesystem state under `kaola-workflow/` and `.git/worktrees/`; audit file in `.cache/`
- Depends On: B8
- Parallel Group: serial after gate
- Action: MAINTENANCE
- Implement (per advisor edge-case requirement — audit trail FIRST):
  ```bash
  # 1. Capture audit trail BEFORE any destructive operation
  {
    echo "## B9 Cleanup Evidence"
    for wt in issue-40 issue-42 issue-46; do
      echo "### kaola-workflow.kw/$wt"
      cd "/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/$wt" 2>/dev/null && {
        echo "git status --short:"
        git status --short
        echo "HEAD:"
        git rev-parse HEAD
      }
      cd /Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow
    done
  } > kaola-workflow/issue-51/.cache/b9-cleanup-evidence.md

  # 2. Remove registered closed-issue worktrees
  git worktree remove --force /Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-40
  git worktree remove --force /Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-42
  git worktree remove --force /Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-46
  git worktree prune

  # 3. Archive terminal-state orphan dirs (in main worktree)
  mv kaola-workflow/codex-parity kaola-workflow/archive/codex-parity
  mv kaola-workflow/cross-machine-followups kaola-workflow/archive/cross-machine-followups
  mv kaola-workflow/minimal-ecc-config kaola-workflow/archive/minimal-ecc-config

  # 4. Manual archive for issue-32 / issue-46 (step:final-validation, closed remote)
  mv kaola-workflow/issue-32 kaola-workflow/archive/issue-32.stale-final-validation
  mv kaola-workflow/issue-46 kaola-workflow/archive/issue-46.stale-final-validation

  # 5. If labels persist on closed issues, run explicit cleanup
  gh issue edit 46 --remove-label workflow:in-progress --remove-assignee @me 2>/dev/null || true
  gh issue edit 32 --remove-label workflow:in-progress --remove-assignee @me 2>/dev/null || true
  ```

- Branches `workflow/issue-40`, `workflow/issue-42`, `workflow/issue-46` are NOT deleted (cheap storage; preserves merge history).
- Validate: `git worktree list --porcelain` does not list issue-40/42/46; `ls kaola-workflow/` shows only `archive/` and `issue-51/` (and `ROADMAP.md`, `.roadmap/`, `.sessions/`, `.tickers/`).

### Task B10: File follow-up GitHub issues
- Files: none (GitHub API)
- Depends On: B8 (defer until cleanup is green)
- Implement: Phase 6 owns the GitHub close + comment. Phase 5 review pass first; Phase 6 sink-merge will run `gh issue create` for #N1 (roadmap atomic) and #N2 (prompt-slim) and post the deferred-ACs comment.

### Task B11: Close #51
- Files: none (GitHub API)
- Depends On: B10
- Implement: Phase 6 step 7 owns this. The close comment must explicitly list "Deferred ACs (filed as follow-ups): roadmap concurrency #N1, prompt footprint #N2".

## Advisor Notes

The advisor (`/cache/advisor-plan.md`) approved the blueprint with:

- **Two scope reductions** (locked above): `cmdWatchPr:2340` is already correct — only test 7D extension needed; no new `cmdStartup` dispatch arm needed for `user_target_closed` (generic refusal at `:1447–1468` handles it).
- **Five Phase 4 verifications** (locked above): V1 H2 exact OR-of-three gate; V2 Epic 20B may pass immediately (don't add hardening); V3 `claimExplicitTarget` closed guard short-circuits OFFLINE; V4 `cmdSweep` first-pass gate composition as OR-not-AND; V5 `postReleaseComment` reason allowlist pre-flight grep.
- **One edge case the architect missed** (locked above): B9 worktree audit trail via `git status` capture to `.cache/b9-cleanup-evidence.md` BEFORE destructive operations.
- **Discipline note**: code-explorer made at least one stale-read error (`cmdWatchPr:2340`). Phase 4 must re-read every modification site before editing; do not take cached findings as ground truth.

No further architect revision needed. Phase 4 may proceed.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md (414 lines) | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | — | advisor approved without revision request |
