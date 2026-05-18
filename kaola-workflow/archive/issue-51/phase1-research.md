# Phase 1 - Research / Discovery: issue-51

## Deliverable
Close the workflow lifecycle, parallel-session, and prompt-footprint gaps documented in GitHub issue #51 by hardening `scripts/kaola-workflow-claim.js`, the simulation tests, and the related skill/command prompts. Specifically deliver: (a) closed-issue lifecycle cleanup (labels, assignees, archives, registered closed-issue worktrees) via `sweep`/`watch-pr`/`finalize` paths, (b) green walkthrough simulations for both Claude (`scripts/simulate-workflow-walkthrough.js`) and Codex (`plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`), (c) regression coverage for the stale-#46 case and the single-issue completion contract, (d) Codex-safe session/heartbeat plumbing (`CODEX_THREAD_ID` propagation, ticker without Claude ancestor), (e) atomic roadmap writes, (f) reduced prompt footprint by consolidating the repeated Session Heartbeat / Startup Receipt Guard / `kaola_script` helper blocks into script subcommands. Stale evidence preserved at `/tmp/kaola-issue-46-stale-evidence.lock.json` and `.cache/preserved-stale-evidence.md`.

## Why
The kaola-workflow system is supposed to be self-cleaning at end-of-work (Phase 6 archive + sink dispatch), to isolate parallel sessions deterministically, and to keep its prompt surface small. Today, closed issues leak `workflow:in-progress` labels and assignees, the local audit suite is not fully green, Codex sessions can claim without durable heartbeat, the roadmap can race, and the prompt budget across 18 files repeats ~5k words of identical boilerplate. Until #51 lands, future sessions can be confused by stale active folders, validators can pass while simulations fail, and Codex parity remains an unstated risk surface.

## Affected Area
- `scripts/kaola-workflow-claim.js` — sweep/finalize/watch-pr/ticker/repair-state/`claimExplicitTarget` (lines 576–580, 1304–1327, 1858–1953, 2015–2206, 2296–2354, 2718–2775)
- `scripts/kaola-workflow-roadmap.js` — `cmdInitIssue` and writers (no atomic rename)
- `scripts/kaola-workflow-repair-state.js` — `ownedByCurrentSession` early-true on empty sid
- `scripts/kaola-workflow-sink-merge.js` — post-merge cleanup path
- `scripts/kaola-workflow-classifier.js` — closed-issue verdict at lines 409–412
- `scripts/simulate-workflow-walkthrough.js` — case 9A3 ticker-late-yield (~lines 2358–2404) and post-completion auto-claim regression site
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` — missing `kaola-workflow-compact-context.js` path
- `scripts/validate-script-sync.js` — script sync coverage
- `commands/kaola-workflow-phase{1-6}.md`, `commands/workflow-init.md`, `commands/workflow-next.md`, `commands/kaola-workflow-fast.md`
- `plugins/kaola-workflow/skills/*/SKILL.md`, `plugins/kaola-workflow/commands/*` — Codex skill prompts
- Stale active project dirs to be addressed via lifecycle fix or follow-up: `kaola-workflow/{issue-32, issue-46, codex-parity, cross-machine-followups, minimal-ecc-config}/workflow-state.md`

## Key Patterns Found
1. Lifecycle cleanup is centralized in `releaseSession()` at `scripts/kaola-workflow-claim.js:1858–1891`, which runs `gh issue edit --remove-label ... --remove-assignee @me`. Three callers explicitly suppress it via `{remoteCleanup: false}`: `cmdWorktreeFinalize` (line 2761), `runTick` ticker-late-yield (line 2055), `cmdWatchPr` aborted-PR branch (line 2329). `cmdFinalize` (1921–1953) never calls `releaseSession` at all.
2. Sweep gating is dual-cutoff: `shouldSweep()` at lines 576–580 requires both `expires` AND `last_heartbeat` older than 24h; `isRemoteStale()` at lines 2096–2106 requires comment `updated_at` older than 24h. There is no closed-issue fast-path — closed issues remain claimed until the dual cutoff elapses.
3. `claimExplicitTarget()` at lines 1304–1327 calls `issueAlreadyClaimed()` but never invokes the classifier's closed-issue branch (`scripts/kaola-workflow-classifier.js:409–412`). A user can directly target a closed issue.
4. `walkToClaudePid()` at lines 180–195 matches `/claude/i` in the process ancestry via `ps -o ppid=,comm=`. Codex (no Claude ancestor) returns null, and `cmdTicker` exits at lines 2088–2092 without scheduling heartbeats — Codex sessions get no lease refresh.
5. `envSessionId()` at lines 166–171 resolves env precedence as `KAOLA_SESSION_ID || CODEX_THREAD_ID || CLAUDE_SESSION_ID`; the startup skill still depends on `claim.js session` running first, which is Claude-PID-oriented.
6. `repair-state` ownership guard (`ownedByCurrentSession` at lines 114–118) returns `true` when `sessionId === ''`, granting implicit access to any project when no env vars are set.
7. `cmdInitIssue()` at `scripts/kaola-workflow-roadmap.js:182–212` uses `existsSync` then `writeFileSync` with no atomic rename or file lock — parallel startup transactions can race.
8. Test 9A3 at `scripts/simulate-workflow-walkthrough.js:2358–2404` ("lock file must be released by ticker late-yield") asserts ticker behavior. The current failure trace is environment-dependent — needs `KAOLA_KERNEL_SESSION_FAKE_PID` or `KAOLA_KERNEL_SESSION_SKIP=1` to behave deterministically on CI/Codex.
9. Codex simulation at `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js:113` (and ~10 nearby callers) references `plugins/kaola-workflow/scripts/kaola-workflow-compact-context.js` which does NOT exist in the plugin script package. `scripts/validate-script-sync.js` excludes `kaola-workflow-compact-context.js` from its byte-identical sync check (so the gap is invisible to that validator).
10. Prompt repetition: `## Session Heartbeat` block, `## Startup Receipt Guard` block, and the `kaola_script(){ ... }` resolver helper appear together verbatim across 14 prompt files (7 Claude + 7 Codex). The Claude variant is byte-identical across all 7 Claude files; the Codex variant has ~15 lines of divergence from the Claude version but is byte-identical within the 7 Codex files. Combined repeat-block surface is ~3,200 words of the 19,846-word total.

## Test Patterns
- Framework: hand-rolled `assert` (Node built-in) with sequential epic functions. No `mocha`/`jest`/`vitest` used.
- Location: `scripts/simulate-workflow-walkthrough.js` (Claude integration, 6094 lines), `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` (Codex integration, 1100 lines). Static contract validators at `scripts/validate-workflow-contracts.js`, `scripts/validate-kaola-workflow-contracts.js`, `scripts/validate-script-sync.js`.
- Structure: each test file builds a temporary git repo under `os.tmpdir()`, exercises sub-commands via `execFileSync('node', [claimJs, ...])`, asserts on lock contents / GitHub mock state / stdout, then teardown. Epics are gated by string IDs like "9A3".
- Regression sites for #51: stale-#46 case sits at the seam between `cmdSweep` and `claimExplicitTarget`; the post-completion auto-claim block sits at the seam between `cmdFinalize` and the next call to `cmdPickNext`/`cmdStartup` from a fresh process.

## Config & Env
- Env vars: `KAOLA_SESSION_ID`, `CODEX_THREAD_ID`, `CLAUDE_SESSION_ID` (session resolution); `KAOLA_KERNEL_SESSION_SKIP`, `KAOLA_KERNEL_SESSION_FAKE_PID` (test overrides); `KAOLA_TARGET_ISSUE`, `KAOLA_SINK`, `KAOLA_PATH`, `KAOLA_WORKTREE_NATIVE`, `KAOLA_COORD_ROOT`, `KAOLA_ENFORCE_PLATFORM_SESSION`, `KAOLA_OFFLINE`.
- Filesystem layout: `.git/kaola-workflow/.locks/{project}.lock`, `.git/kaola-workflow/.sessions/{sid}.startup.json`, `.git/kaola-workflow/.runtime/{pid}.identity`, `.git/kaola-workflow/.tickers/{sid}.pid`. `kaola-workflow/{project}/workflow-state.md` lives in the WORKING TREE of the project's worktree (but currently lands in the main worktree when startup is run from there — known isolation gap).
- External binaries: `gh` (label/assignee/issue), `git` (worktree/branch/fetch), `ps`, `node`.
- Constants: `CLAIM_LABEL = "workflow:in-progress"`; 24-hour cutoffs in `shouldSweep` and `isRemoteStale`; 30-minute default lease expiry on heartbeat (`cmdWatchPr` line 2347).

## External Docs
N/A — internal patterns sufficient. No new framework, library, or external API behavior is in scope. `gh` CLI and `git` are already used throughout; their semantics for `issue edit --remove-label`, `issue close --comment`, `worktree prune`, and `branch -D` are well-known and stable.

## GitHub Issue
KaolaBrother/Kaola-Workflow#51

## Completeness Score
9/10 (goal:3, outcome:3, scope:1, constraints:2). The single deduction is on scope boundaries — the issue covers 11 acceptance criteria across 5 concern areas, which is large for a single workflow cycle. Phase 2 will explicitly choose between (a) attacking all 11 ACs in one cycle and (b) recommending a split, then advisor-confirm before locking strategy.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | kaola-workflow/issue-51/.cache/code-explorer.md (274 lines) | |
| docs-lookup | N/A | recorded above | internal Node/git/gh patterns sufficient; no external library behavior in scope |

## Notes / Future Considerations
- The stale `issue-46` lock had to be deleted manually before startup would accept the #51 target — that is itself a #51 finding (sweep's 24h dual-cutoff does not handle closed issues). The deleted lock contents are preserved at `/tmp/kaola-issue-46-stale-evidence.lock.json` for AC verification in Phase 5 and to confirm #46 regression-test inputs in Phase 3/4.
- The current branch (`workflow/issue-51`) on the worktree `kaola-workflow.kw/issue-51` is empty — the `kaola-workflow/issue-51/` directory was created in the main worktree because startup ran from there. The known "isolation tree gap" (doc-updater + phase artifacts in main worktree) is relevant but is not in #51's ACs; defer to a follow-up issue unless Phase 2 expands scope.
- The session ID derivation is fragile under fresh shells: each `node claim.js session` call without env vars may regenerate a different ID. For #51 work this session, the explicit `KAOLA_SESSION_ID=4dfea60e-7f46-46db-a0b5-3435fab8330c` is persisted in `.kw-env` and threaded via `--session` flag.
- `validate-script-sync.js` deliberately excludes `kaola-workflow-compact-context.js` from sync coverage — extending its coverage (or porting the script to the plugin tree) is the AC for the Codex simulation.
