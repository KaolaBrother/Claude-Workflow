# Phase 1 - Research / Discovery: cross-machine-followups

## Deliverable

Apply 9 tech-debt hardening items deferred from the cross-machine-hardening review (issue #9):
- MEDIUM-2: strengthen Test 9B2 with a liveness assertion
- MEDIUM-4: log adoption push failures to stderr instead of swallowing them
- LOW-1: remove dead tautology condition in runTick
- LOW-2: add SIGINT/SIGHUP handlers to cmdTicker for clean PID file removal
- LOW-3: upgrade 12 phase shims from PID-file-existence check to PID-liveness check
- LOW (fd): fix acquirePidFile to return boolean instead of closed fd integer
- L1 (security): add `g` flag to updateLeaseInPlace regex replaces
- L2 (security): add `--` separator to git push in handleTiebreakerYield
- I1 (security): re-assert Number.isFinite on match.issue_number in runTick

## Why

These items improve robustness (test coverage accuracy, stale PID resilience), observability (visible push failures), and defensive consistency (security hygiene). None block functionality but each reduces a concrete risk or confusion surface.

## Affected Area

Primary:
- `scripts/kaola-workflow-claim.js` — all 8 claim.js items (MEDIUM-4, LOW-1, LOW-2, LOW-fd, L1, L2, I1, plus runTick fix)
- `scripts/simulate-workflow-walkthrough.js` — MEDIUM-2 (Test 9B2 liveness assertion)

Secondary (LOW-3 — 12 files, identical pattern):
- `commands/kaola-workflow-phase1.md` (line 31)
- `commands/kaola-workflow-phase2.md` (line 35)
- `commands/kaola-workflow-phase3.md` (line 33)
- `commands/kaola-workflow-phase4.md` (line 23)
- `commands/kaola-workflow-phase5.md` (line 37)
- `commands/kaola-workflow-phase6.md` (line 38)
- `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md` (line 29)
- `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md` (line 21)
- `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md` (line 21)
- `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md` (line 21)
- `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md` (line 21)
- `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` (line 29)

## Key Patterns Found

1. **Dead condition removal pattern** (`scripts/kaola-workflow-claim.js:467`): `if (!match || match.session_id !== tickCtx.session)` — second clause is tautological; pattern is to simplify to `if (!match)`.

2. **Signal handler pattern** (`scripts/kaola-workflow-claim.js:523`): existing `process.on('SIGTERM', function() { try { fs.unlinkSync(pidPath); } catch (_) {} process.exit(0); })` — mirror for SIGINT and SIGHUP.

3. **PID liveness check pattern** (shell, 12 files): replace `if [ ! -f "$_TICKER_PID_FILE" ]` with `if [ ! -f "$_TICKER_PID_FILE" ] || ! kill -0 "$(cat "$_TICKER_PID_FILE" 2>/dev/null)" 2>/dev/null`.

4. **Boolean return from acquirePidFile** (`scripts/kaola-workflow-claim.js:459`): return `true` instead of the closed fd integer; caller at line 522 already uses `=== null` sentinel.

5. **Test liveness assertion** (`scripts/simulate-workflow-walkthrough.js:1608`): after reading new PID from pidFile9b2, add `assert(canKill(newPid), '9B2: ticker must still be running')` — use `process.kill(newPid, 0)` wrapped in try/catch.

6. **Regex g-flag pattern** (`scripts/kaola-workflow-claim.js:183-184`): `content.replace(/^expires:.*$/gm, ...)` — add `g` to both multiline replaces.

7. **git push `--` separator** (`scripts/kaola-workflow-claim.js:228`): `execFileSync('git', ['push', 'origin', '--', branch], ...)`.

8. **Number.isFinite guard** (`scripts/kaola-workflow-claim.js:494`): replace truthy `match.issue_number` check with `Number.isFinite(match.issue_number)`.

## Test Patterns

- Framework: hand-rolled `assert()` (claim.js:10-13), no external test framework
- Location: `scripts/simulate-workflow-walkthrough.js` (Claude), `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` (Codex)
- Structure: sequential try/catch blocks; Epic 9 = outer block with shared temp dir, inner blocks per sub-test (9A1..9D, 9B2 at lines 1575–1610)
- Success signal: "Workflow walkthrough simulation passed" + exit 0
- Command: `node scripts/simulate-workflow-walkthrough.js`

## Config & Env

- `KAOLA_WORKFLOW_OFFLINE=1` — disables all GitHub API calls; used in all test cases
- `.tickers/{session}.pid` — PID file path inside `kaola-workflow/` root; created by acquirePidFile

## External Docs

N/A — all patterns are internal. Node.js `process.kill(pid, 0)` and `fs.closeSync` are standard APIs; no external docs needed.

## GitHub Issue

KaolaBrother/Kaola-Workflow#12

## Completeness Score

10/10
- Goal clarity: 3/3 (9 items with exact file, line, fix description)
- Expected outcome: 3/3 (checklist in issue; each item has pass/fail criterion)
- Scope boundaries: 2/2 (claim.js + test file + 12 shims; no new dependencies)
- Constraints: 2/2 (test suites must pass; no new npm deps; immutable patterns preferred)

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | — | Internal patterns only; Node.js std APIs; no external library docs needed |

## Notes / Future Considerations

- LOW-3 touches 12 files with mechanical identical changes — suitable for batching in one tdd-guide task
- The `kill -0` check in shell can race if the PID is recycled immediately after the old process exits; this is a known and accepted limitation of PID-file based liveness checks
- MEDIUM-2 liveness assertion: the test spawns a ticker that runs indefinitely (interval=999999999); after the 3000ms timeout and process.kill, we need to read the PID file before killing the process
