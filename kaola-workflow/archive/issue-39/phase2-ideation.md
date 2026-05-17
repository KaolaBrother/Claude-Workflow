# Phase 2 - Ideation: issue-39

## Approaches Evaluated

### Bug 2 — Missing project folder treated as phase ≤ 2

#### Option 2A (Selected): Skip entire lock when projectDir is missing
- Summary: Add `if (!fs.existsSync(projectDir)) continue;` at line 267, immediately after the `isSafeName` check
- Pros: One line, zero blast radius, self-documenting, existing 6C5 test remains green (mkdirSync creates the dir, so existsSync returns true)
- Cons: None
- Risk: Low
- Complexity: Small (~1 line)

#### Option 2B: Guard only the phase-≤-2 trigger
- Summary: Wrap only the `anyClaimedAtPhaseLeTwo = true` assignment with the existsSync check
- Pros: Narrower change
- Cons: Leaves the rest of the lock loop running for a projectDir that doesn't exist — conceptually wrong
- Risk: Low
- Complexity: Small

#### Option 2C: Augment lock validation in `readLockFiles()`
- Summary: Filter locks with missing projectDirs inside `readLockFiles()` before they reach the classifier loop
- Pros: Earlier filtering
- Cons: Wide blast radius — changes meaning of `readLockFiles()` for all callers; High risk
- Risk: High
- Complexity: Medium

### Bug 1 — FILE_PATH_REGEX hardcoded to Kaola-Workflow directories

#### Option 1A (Selected): Generalize the regex + drop the allow-list
- Summary: Replace `FILE_PATH_REGEX`/`AREA_PATH_REGEX`/`COARSE_AREAS` with a generic `word/word...` pattern; remove `COARSE_AREAS.has()` at lines 169 and 176; keep `SHARED_INFRA` (line 252) for overlap detection
- Pros: Host-project-agnostic, ~6 lines changed, no new config keys, URL false-positives already excluded by prefix anchor (`:` or `.` before first segment already excluded)
- Cons: None; existing tests still pass (6C5 fires conservative-red because candidate body has no paths, not because COARSE_AREAS matched)
- Risk: Low
- Complexity: Small (~6 lines)

#### Option 1B: Dynamic allow-list from `fs.readdirSync(root)`
- Summary: Build the allow-list by reading the repo root at runtime
- Pros: Fully dynamic
- Cons: Breaks existing tests (dirs not in mkdtempSync); Medium risk; more lines
- Risk: Medium
- Complexity: Medium

#### Option 1C: Inverted noise exclusion
- Summary: Keep current allow-list, add a negative list of noise tokens (URLs, package names)
- Pros: Surgical change
- Cons: Unbounded negative list; cannot enumerate all non-path tokens; Medium risk
- Risk: Medium
- Complexity: Medium

#### Option 1D (rejected, config-driven): Config `path_roots` allow-list
- Summary: Add a `path_roots` array to `config.json`; extend FILE_PATH_REGEX/COARSE_AREAS to include those roots; default to generic mode when empty
- Pros: Smaller behavior change for self-hosting users who rely on the current allow-list semantics
- Cons: More lines, new config key with no current demand, existing tests already pin self-hosting behavior without the allow-list (6C5 fires because candidate body has no paths at all, not because COARSE_AREAS matched)
- Rejection reason: Adds complexity with no measurable benefit — the allow-list is not the reason 6C5 passes. Documented here per advisor.
- Risk: Medium
- Complexity: Medium

### Bug 3 — Orphaned ticker keeps stale locks alive

#### Critical constraint: `nohup ... & disown` → `process.ppid === 1` after disown
`process.ppid` fallback CANNOT distinguish orphaned from normal ticker. Fix must use `walkToClaudePid()` at startup.

#### Option 3A (Selected): Exit immediately when no Claude ancestor at startup
- Summary: At `cmdTicker` line ~1895, after `walkToClaudePid()` returns null, log to stderr, unlink the PID file, and return
- Pros: Self-healing — phase wrapper auto-respawns ticker on next phase invocation; transient `ps` failure corrected on next wake; existing `runTick` guard at line 1824 still handles "died after boot" case; ~4 lines
- Cons: Transient false-positive exit if `ps` is slow at startup (mitigated by auto-respawn)
- Risk: Low
- Complexity: Small (~4 lines)

#### Option 3B: JSONL staleness check
- Summary: Read Claude's JSONL conversation log and exit if no recent entry
- Pros: Doesn't require live process inspection
- Cons: Couples ticker to Claude on-disk format; timing-dependent; brittle; Medium risk
- Risk: Medium
- Complexity: Medium

#### Option 3C: Wall-clock cap (~4h)
- Summary: Ticker exits after 4 hours regardless of Claude liveness
- Pros: Trivial
- Cons: Masks the bug rather than fixing it; orphaned ticker still runs for up to 4h; Medium risk
- Risk: Medium
- Complexity: Small

## Advisor Findings

Advisor endorsed all three selected options (1A / 2A / 3A) with no blocked decisions.

**Validated traces:**
- 2A: 6C5 trace confirmed — mkdirSync creates earlyDir, existsSync returns true, falls through to existing logic, conservative-red fires. PASS.
- 1A: Regex generalization preserves all 6A–6C5 traces. Symmetric extraction (same regex on candidate and claimed) means host-project overlap detection works without the allow-list.
- 3A: `process.ppid === 1` after disown correctly ruled out. Exit-at-startup + auto-respawn is self-healing for transient ps failures.

**Gotchas for Phase 4:**
1. **5-hop ceiling in `walkToClaudePid`**: Verify actual process-tree depth is ≤5 hops ticker→claude in deployment. If a wrapper script or systemd adds depth, ticker self-exits even when Claude is alive. Auto-respawn masks this but creates a tight loop. Run `pstree` check during Phase 4 testing.
2. **Case 6J test isolation**: Subprocess spawned from inside Claude session will have Claude as ancestor — orphan-exit path won't fire. Test MUST use `detached: true` + `process.disconnect()` or `setsid` to break the ancestor chain.
3. **Plugin parity**: Run `diff scripts/kaola-workflow-classifier.js plugins/kaola-workflow/scripts/kaola-workflow-classifier.js` before Phase 4 to confirm current parity. Add explicit parity diff to Phase 4 task list.

## Selected Approach

| Bug | Option | Files | Lines | Risk |
|-----|--------|-------|-------|------|
| Bug 2 | 2A: skip lock when projectDir missing | classifier + plugin mirror | ~1 | Low |
| Bug 1 | 1A: generalize regex + drop allow-list | classifier + plugin mirror | ~6 | Low |
| Bug 3 | 3A: exit at startup if no Claude ancestor | claim + plugin mirror | ~4 | Low |

Phasing order: Bug 2 → Bug 1 → Bug 3 (smallest risk first, then most regression surface, then new test pattern).

## Out of Scope (explicit)

- No new subcommands, config keys (`path_roots`), or env vars
- No `readLockFiles()` semantic changes
- No `walkToClaudePid()` changes (5-hop ceiling noted but not changed)
- No `cmdSweep` expansion for missing-dir locks
- No lock-file schema changes
- No URL/import-path filtering for Bug 1
- No config-driven `path_roots` allow-list (Option 1D)

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
