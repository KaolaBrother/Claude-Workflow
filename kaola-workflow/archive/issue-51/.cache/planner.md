# Phase 2 — Planner: issue-51 (Workflow lifecycle cleanup, parallel-session safety, prompt footprint)

## Context

Issue #51 lists 11 acceptance criteria across 5 concern areas (closed-issue lifecycle, validation suite green, parallel-session/Codex parity, regression coverage, prompt footprint). Phase 1 research is grounded in `kaola-workflow/issue-51/phase1-research.md` and `.cache/code-explorer.md`. Stale evidence preserved at `.cache/preserved-stale-evidence.md` and `/tmp/kaola-issue-46-stale-evidence.lock.json`.

Three planning constraints up front:
1. The 9A3 simulation failure AND the Codex ticker-no-heartbeat gap have the SAME root cause (`cmdTicker` at `scripts/kaola-workflow-claim.js:2087–2092` exits when `walkToClaudePid()` returns null). They are one fix, not two.
2. `claimExplicitTarget` and `cmdSweep` should share a single `isIssueClosed(n)` helper modeled on `kaola-workflow-classifier.js:402–407`, not reimplement the gh call twice.
3. The lifecycle-axis variation must be about WHERE the GC runs (sweep / new subcommand / per-caller), not about how closure is detected.

## Shared helper anchors (used by all strategies)

These atomic deltas appear in every strategy; only the call-sites and surrounding orchestration differ:

- **H1 — `isIssueClosed(issueNumber)` helper**: new ~10-line function in `scripts/kaola-workflow-claim.js` near `isRemoteStale` (insertion point: `scripts/kaola-workflow-claim.js:2106` immediately after `isRemoteStale`). Wraps `ghExec(['issue','view',String(n),'--json','state'])`, returns `true` iff `state.toLowerCase() === 'closed'`, returns `false` on OFFLINE / fetch failure / parse error (fail-open: don't sweep on transient gh failures).
- **H2 — ticker Claude-PID gate softened**: at `scripts/kaola-workflow-claim.js:2087–2092`, replace `if (claudePid === null) { exit }` with a runtime-aware branch. If `args.runtime === 'codex'` OR `process.env.CODEX_THREAD_ID` is set OR `process.env.KAOLA_KERNEL_SESSION_SKIP === '1'`, set `tickCtx.claudePid = null` (skip ancestor-liveness check inside `runTick:2016–2019`) and proceed. The existing `runTick` guard `if (tickCtx.claudePid && !isPidAlive(...))` already short-circuits when `claudePid` is null, so the loop runs and the late-yield path at `:2052–2058` fires correctly.
- **H3 — atomic write helper for roadmap**: new `writeFileAtomic(filePath, content)` in `scripts/kaola-workflow-roadmap.js` (insertion point: replace `writeIfDiff:99–106`). Writes to `${filePath}.tmp-${pid}-${Date.now()}` then `fs.renameSync`. Uses `fs.openSync(tmp, 'wx', 0o644)` to refuse to clobber an in-flight temp file from a concurrent writer. `cmdInitIssue:182–212`, `cmdGenerate:127–135`, and `cmdMigrate:137–164` all route writes through `writeFileAtomic`.

These anchors are the same across strategies. The strategies differ on (a) which ACs ship now vs. later, (b) test-first vs. fix-first, (c) where the GC orchestration lives.

---

## Strategy A — All 11 ACs in one cycle; sweep-owned GC; fix-then-test

### Summary
Land every AC of issue #51 in one workflow cycle. Closed-issue lifecycle is collapsed into `cmdSweep` (one entry point, gh-called once per lock). Prompt-slimming uses a new `claim.js print-startup-block --platform=claude|codex` subcommand referenced from a single `eval "$(node ...)"` shim in each of the 14 prompt files.

### Concrete file/line changes

**Lifecycle cleanup (ACs 1, 4):**
- `scripts/kaola-workflow-claim.js:1947` — `cmdFinalize`: insert `releaseSession(root, coordRoot, args.session, 'finalized')` BEFORE the `archiveProjectDir` call so labels/assignee are cleared on every finalize.
- `scripts/kaola-workflow-claim.js:2761` — `cmdWorktreeFinalize`: change `{ remoteCleanup: false }` to `{ remoteCleanup: true }`.
- `scripts/kaola-workflow-claim.js:2329–2341` — `cmdWatchPr` CLOSED branch: drop the `{ remoteCleanup: false }` argument on the aborted-PR `releaseSession` call.
- `scripts/kaola-workflow-claim.js:2055` — `runTick` late-yield: KEEP `{ remoteCleanup: false }` (intentional tiebreaker-yield). Document the intent inline with a one-line comment.
- `scripts/kaola-workflow-claim.js:2125–2138` — `cmdSweep` first pass: add closed-issue fast-path bypassing the 24h dual cutoff (uses H1).
- `scripts/kaola-workflow-claim.js:2156–2181` — `cmdSweep` second-pass GC: extend with `step:complete` gate to archive orphan dirs.
- `scripts/kaola-workflow-claim.js:1304–1327` — `claimExplicitTarget`: closed-issue guard returning `user_target_closed`.

**Validation suite green (AC2):**
- `scripts/kaola-workflow-claim.js:2087–2092` — apply H2 (ticker Codex-safe).
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js:113` — change path to repo-root `scripts/kaola-workflow-compact-context.js`.
- `scripts/validate-script-sync.js:24` — update comment.

**Parallel-session / Codex parity (AC3):**
- `scripts/kaola-workflow-repair-state.js:114–118` — ownership refusal when sessionId is empty.
- `scripts/kaola-workflow-claim.js:2581–2618` — `cmdResume`: ownership guard.
- `scripts/kaola-workflow-roadmap.js:99–106, 127–135, 182–212` — H3 (atomic roadmap writes).

**Regression coverage (AC5):**
- `scripts/simulate-workflow-walkthrough.js:2358–2404` — make test 9A3 environment-agnostic with `KAOLA_KERNEL_SESSION_SKIP=1`.
- `scripts/simulate-workflow-walkthrough.js` before `:6078` — Epic 20A (stale-closed-issue), Epic 20B (post-completion auto-claim refusal), Epic 20C (watch-pr CLOSED clears label).
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js:113` — fixed by the path change.

**Prompt footprint (AC8–11):**
- `scripts/kaola-workflow-claim.js` — new `cmdPrintStartupBlock()` subcommand.
- 14 prompt files replace heartbeat blocks with `eval "$(node ... print-startup-block --platform=claude)"`.
- `scripts/validate-workflow-contracts.js`, `scripts/validate-kaola-workflow-contracts.js` — update assertions.

### Pros
- Single landing satisfies all 11 ACs; no follow-up issues.
- Closed-issue cleanup centralized in one entry point.
- Prompt-slim via subcommand makes Claude/Codex divergence machine-checkable.

### Cons
- Large diff: ~600–900 lines across 25+ files.
- Contract validator update is coupled to prompt-slim.
- Prompt-slim changes the runtime contract (prompts depend on working `node` + claim.js at startup).

### Risk: High
### Complexity: XL

---

## Strategy B — Core lifecycle + Codex parity + validation green NOW; prompt-slim and roadmap-atomic as follow-up issues (RECOMMENDED)

### Summary
Land the ACs that unblock real workflow correctness in this cycle: closed-issue cleanup, validation suite green, Codex ticker, regression coverage. File two new GitHub issues for prompt-footprint and roadmap concurrency, which are real but not blocking forward work.

### In-scope this cycle
- All `scripts/kaola-workflow-claim.js` changes at: `:1304–1327`, `:1947`, `:2055` (comment only), `:2087–2092`, `:2125–2181`, `:2329–2340`, `:2581–2618`, `:2761`, plus H1 helper near `:2106`.
- `scripts/kaola-workflow-repair-state.js:114–118` — ownership refusal.
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js:113` — path fix.
- `scripts/validate-script-sync.js:24` — comment update only.
- `scripts/simulate-workflow-walkthrough.js:2358–2404` — 9A3 env-gate.
- `scripts/simulate-workflow-walkthrough.js` before `:6078` — new Epic 20A + 20B + 20C.

### Deferred (file follow-up issues)
- **Follow-up #N1 — Roadmap concurrency atomic writes**: H3 applied to `scripts/kaola-workflow-roadmap.js`. Not blocking (theoretical TOCTOU).
- **Follow-up #N2 — Prompt footprint subcommand + 14-file refactor + contract validator updates**. Not blocking (wasteful but not incorrect).

### Pros
- Reviewable PR (~12 files, ~250 lines).
- Every change maps to a user-observable bug.
- Lease fits.
- Follow-ups are honest about scope.
- Codex parity (H2) lands NOW because it's the same fix as 9A3.

### Cons
- #51 closes with explicit follow-up issues; user must accept that "11 ACs in one cycle" is too large.
- Two extra issues to manage.
- Prompt budget stays bloated until follow-up.

### Risk: Medium
### Complexity: M

### AC mapping
Ships ACs 1, 2, 3, 4, 5, 6 (lifecycle, validation, Codex parity, repair/resume ownership, regression coverage, claimExplicitTarget closed guard). Defers ACs 7 (roadmap atomic) and 8–11 (prompt footprint).

### Order of operations
1. **Task B1**: H1 helper + H2 ticker fix + 9A3 env-gate.
2. **Task B2**: Codex simulation path fix.
3. **Task B3**: Epic 20A (stale-closed-issue regression) in RED.
4. **Task B4**: Implement closed-issue cleanup: `cmdFinalize:1947`, `cmdWorktreeFinalize:2761`, `cmdWatchPr:2340`, `cmdSweep:2125–2138` first-pass closed gate, `claimExplicitTarget:1310`. Epic 20A passes GREEN.
5. **Task B5**: Epic 20B (post-completion auto-claim refusal) in RED, verify already GREEN or harden refusal path.
6. **Task B6**: Extend `cmdSweep:2156–2181` second-pass GC with `step:complete` gate.
7. **Task B7**: `repair-state.js:114–118` + `cmdResume:2599` ownership guards.
8. **Task B8**: Run both simulation suites end-to-end.
9. **Task B9**: One-shot cleanup of orphan dirs via cmdSweep.
10. **Task B10**: File follow-up issues #N1, #N2.

### Out of scope (in Strategy B)
- Roadmap atomic-write refactor → follow-up #N1.
- `cmdPrintStartupBlock` subcommand → follow-up #N2.
- 14 prompt file rewrites → follow-up #N2.
- Contract validator assertion updates → follow-up #N2.
- Doc-updater main-worktree isolation gap (MEMORY-tracked).
- Phase artifact mirror/archive/finalize consolidation.

---

## Strategy C — Test-first all 11 ACs; new `lifecycle-gc` subcommand; tooling-light prompt trim

### Summary
Land all 11 ACs with strict TDD ordering. Closed-issue cleanup extracted into new `lifecycle-gc` subcommand (not in sweep). Prompt-slim is verbatim trim (no new subcommand).

### Concrete file/line changes
- **lifecycle approach (axis difference)**: NEW `cmdLifecycleGc()` subcommand instead of extending `cmdSweep`. `cmdSweep:2108–2206` UNCHANGED.
- `commands/kaola-workflow-phase6.md` + Codex skill add `node scripts/kaola-workflow-claim.js lifecycle-gc` to Phase 6 sequence.
- Same H2, H3, per-caller fixes, simulation path fix.
- Test-first: All Epic 20A/B/C/D/E committed in RED state before fixes.
- Prompt-slim: ~30% reduction via verbatim trim (no new subcommand).

### Pros
- TDD discipline.
- `lifecycle-gc` is discoverable callable entry point.
- Prompt-slim reversible.
- All 11 ACs ship.

### Cons
- Two cleanup entry points (`sweep` + `lifecycle-gc`); Phase 6 must call both.
- Prompt-slim saves much less (~12% vs ~36% in A).
- TDD-first adds RED commits in git log.
- `lifecycle-gc` not auto-invoked, so closed-issue label leakage still happens unless Phase 6 reliably runs it.

### Risk: Medium
### Complexity: L

---

## Recommended Option: **Strategy B**

### Rationale

11 ACs in one cycle blows the lease and produces a giant unreviewable PR. Strategy A's diff spans 25+ files including two contract validators and 14 prompt files; the contract-validator + prompt-slim coupling means a single regression in `cmdPrintStartupBlock` breaks startup for both runtimes. Strategy C's TDD-first discipline is good but its dual-entry-point creates a discoverability tax.

Strategy B ships exactly the ACs that have direct stale-state evidence today:
- Issue #46 label/assignee still on closed issue → cmdSweep + cmdFinalize + cmdWorktreeFinalize + cmdWatchPr fixes.
- 9A3 environment-conditional failure → H2 + env-gate.
- Codex ticker silent → same H2.
- Codex simulation broken → path fix.
- `claimExplicitTarget` can claim closed issues → H1 + line-1310 guard.
- `repair-state` operates without session → ownership refusal.
- Five orphan dirs persist as `status:active` + `step:complete` → sweep second-pass extension.

The roadmap concurrency gap is theoretical (no observed corruption). The prompt-slim is wasteful but not incorrect.

Strategy B's PR is ~12 files / ~250 lines, reviewable in one sitting. The two follow-up issues capture deferred work with concrete file:line anchors.

### Explicit items NOT to build in the recommended scope

1. `cmdPrintStartupBlock` subcommand and 14-file prompt refactor → follow-up #N2.
2. Roadmap atomic-write refactor → follow-up #N1.
3. Contract validator assertion updates for heartbeat block.
4. Adding `kaola-workflow-compact-context.js` to validate-script-sync allowlist (using path-fix instead).
5. Doc-updater main-worktree isolation gap.
6. Phase artifact mirror/archive/finalize consolidation.
7. New `lifecycle-gc` subcommand (folded into cmdSweep).
8. Test 9A3 alternative fixes (H2 env-gate is the chosen approach).

### Missing facts (Phase 3 must verify)

1. **"Registered closed-issue worktrees: issue-40, issue-42, issue-46"** — Phase 3 must run `git worktree list --porcelain` and `ls -la .git/worktrees/` as Task 0 and document actual state. If those worktrees ARE registered, `cmdSweep:2125–2138` must call `removeWorktree(coordRoot, lock.project, lock)` explicitly for closed-issue locks.

2. **`cmdPickNext` fresh-without-target behavior** — Grep `--target-issue` in `cmdPickNext`/`cmdStartup` near `:1300–1340`. If Epic 20B finds auto-pick when env unset, harden the refusal path.

3. **`user_target_closed` in `cmdStartup` error-message dispatch** — Grep `claimResult.status ===` in `cmdStartup:1329+` to find switch arms; add new arm.

4. **Issue #32 label state** — Phase 3 should run `gh issue view 32 --json labels` for completeness, but not blocking.
