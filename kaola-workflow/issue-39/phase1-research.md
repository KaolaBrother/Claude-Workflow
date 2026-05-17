# Phase 1 - Research / Discovery: issue-39

## Deliverable
Fix three compounding bugs in `scripts/kaola-workflow-classifier.js` and `scripts/kaola-workflow-claim.js` that cause the classifier to override correct priority ranking and claim the wrong GitHub issue in host-project deployments.

## Why
In any host-project deployment (non-Kaola-Workflow repos), the startup priority ranking correctly identifies P0/P1/P2/P3 issues but the classifier red-lists them all via three independent bugs. The lowest-priority surviving issue is claimed instead of the highest. The behavior is invisible — startup reports `claim: "acquired"` and `verdict: "green"` — so the bug is hard to detect and causes wasted work cycles.

## Affected Area
- `scripts/kaola-workflow-classifier.js` — Bug 1 (FILE_PATH_REGEX, line 122), Bug 2 (phase-folder existence check, line 278)
- `scripts/kaola-workflow-claim.js` — Bug 3 (ticker orphan, `cmdTicker`/`runTick`/`shouldSweep`)
- `plugins/kaola-workflow/scripts/kaola-workflow-classifier.js` — mirror of above (must be kept in sync)
- `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` — mirror of above
- `scripts/simulate-workflow-walkthrough.js` — regression tests (Epic Case 6 for classifier)
- `~/.config/kaola-workflow/config.json` — needs new `path_roots` field for Bug 1

## Key Patterns Found

1. **FILE_PATH_REGEX / COARSE_AREAS hardcoded** (`scripts/kaola-workflow-classifier.js:122–134`): Only matches `plugins/kaola-workflow`, `scripts`, `commands`, `hooks`, `kaola-workflow` prefixes. Host-project paths never match → `noPathInfo = true` → conservative-red fires.

2. **Missing-folder treated as phase ≤ 2** (`scripts/kaola-workflow-classifier.js:264–278`): `anyClaimedAtPhaseLeTwo` set via `!fs.existsSync(phase3-plan.md)` with no prior check for `fs.existsSync(projectDir)`. Archived/removed project directories are indistinguishable from active early-phase projects.

3. **Orphaned ticker** (`scripts/kaola-workflow-claim.js` `cmdTicker`/`runTick:1824`): `walkToClaudePid()` returns `null` when not under Claude. Guard `if (tickCtx.claudePid && ...)` skips the PID-death check entirely. `shouldSweep` requires both `expires` and `last_heartbeat` to be >24h old — orphaned ticker refreshes both every 15 min forever.

4. **Config extension point** (`scripts/kaola-workflow-claim.js:72` `readOrCreateConfig()`): Existing hook for adding new config fields. Used by Bug 1 fix to add `path_roots` array.

5. **`isPidAlive(pid)`** (`scripts/kaola-workflow-claim.js:1467`): Already available, used in handoff liveness checks. Bug 3 fix can reuse this for `process.ppid` fallback.

## Test Patterns
- **Framework**: Hand-rolled, no external library
- **Location**: `scripts/simulate-workflow-walkthrough.js`
- **Structure**: `assert(condition, message)` throws on failure. Tests use `fs.mkdtempSync` temp dirs, spawn classifier/claim as child processes via `execFileSync`, assert on JSON stdout.
- **Classifier tests**: Epic Case 6 (6A–6F, 6E′, ~line 890). Case 6C5 covers conservative-red path.
- **New tests needed**: Case 6G (host-project issue with no matching paths + no active project dir → green), Case 6H (archived projectDir + stale lock → not treated as phase ≤ 2).
- **Mirror**: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` must stay in sync.

## Config & Env
- `~/.config/kaola-workflow/config.json` — `parallel_mode` field; needs new `path_roots` array field
- `KAOLA_WORKFLOW_OFFLINE=1` — disables GitHub API calls in classifier
- `readOrCreateConfig()` at `scripts/kaola-workflow-claim.js:72` — config load hook
- Lock files: `.git/kaola-workflow/.locks/{project}.lock` — JSON with `project`, `expires`, `last_heartbeat`, `worktree_path`, `branch` fields. No PID field.
- Ticker PID files: `.git/kaola-workflow/.tickers/{sessionId}.pid`

## External Docs
None — all fixes are in internal Node.js scripts using standard library (`fs`, `process`, `child_process`).

## GitHub Issue
KaolaBrother/Kaola-Workflow#39

## Completeness Score
10/10

- Goal clarity: 3/3 — three discrete, well-scoped bugs with exact file:line references
- Expected outcome: 3/3 — classifier returns correct verdicts for host-project issues; stale locks don't survive; ticker exits when parent dies
- Scope boundaries: 2/2 — two source files + mirrors + tests; no architectural changes
- Constraints: 2/2 — must not break existing kaola-workflow self-hosting tests (Epic Case 6); must mirror plugin copy; hand-rolled test framework

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | all internal Node.js code; no external library/API behavior needed |

## Notes / Future Considerations
- Bug 1 fix option A (recommended): add `path_roots` to config.json (default: empty array) and extend `FILE_PATH_REGEX`/`COARSE_AREAS` to include host-configured roots. Fallback: accept any `word/word` token as a path when `path_roots` is empty (generic host mode).
- Bug 1 fix option B: when `noPathInfo === true` and no `area:*` labels exist, default to `green` rather than conservative-red. Simpler but less precise — loses the host-overlap protection.
- Bug 2: also check `workflow-state.md` `status: closed|archived` as an alternative terminal signal when projectDir exists but in archive.
- Bug 3: also fix `sweep` to cross-check `.tickers/*.pid` files and kill/expire locks whose ticker PID is dead — defense-in-depth.
- Issue #40 filed: Phase 4/6 branch-discipline gap (commits to main instead of feature branch) — separate from this issue.
