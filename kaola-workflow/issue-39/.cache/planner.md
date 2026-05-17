# Planner Cache — issue-39

## Key Pre-Flight Finding
Ticker spawned via `nohup node ... & disown` in phase4.md. **After `disown`, `process.ppid === 1` (init).** This rules out a naive `process.ppid` fallback for Bug 3. The fix must detect orphan at startup via `walkToClaudePid() === null`, not via ppid.

---

## Bug 1 — FILE_PATH_REGEX hardcoded to Kaola-Workflow directories

### Options
**Option 1A (Recommended): Generalize the regex + drop the allow-list**
- Replace FILE_PATH_REGEX/AREA_PATH_REGEX/COARSE_AREAS with a generic `segment/segment...` pattern
- Remove `COARSE_AREAS.has()` filter at lines 169 and 176
- Any first-path-component becomes a candidate area
- Risk: Low. URL false-positives unlikely (prefix anchor already excludes `:` or `.` before path)
- Complexity: ~6 lines changed

**Option 1B: Dynamic allow-list from `fs.readdirSync(root)`** — breaks existing tests (dirs not in mkdtempSync); Medium risk

**Option 1C: Inverted noise exclusion** — unbounded negative list; Medium risk

### Recommendation: 1A
Changes:
- `scripts/kaola-workflow-classifier.js` lines 122–134: new generic regexes, remove COARSE_AREAS
- Remove `COARSE_AREAS.has(area)` at lines 169 and 176
- Keep SHARED_INFRA (line 252) — intentional overlap detection

Existing test trace: 6A-6C5 all still pass (6C5 still fires conservative-red because candidate body has no paths at all)

New test: **Case 6H** — host-project body with `src/foo.ts`; claimed `src/foo.ts` → overlap → red

---

## Bug 2 — Missing project folder treated as phase ≤ 2

### Options
**Option 2A (Recommended): Skip the entire lock when projectDir is missing**
```js
if (!fs.existsSync(projectDir)) continue;
```
One line at line 267 (after `isSafeName` check). Risk: Low. ~1 line.

**Option 2B: Guard only the phase-≤-2 trigger** — noisier, leaves rest of loop running; trivial but conceptually messier

**Option 2C: Augment lock validation in `readLockFiles()`** — wide blast radius; High risk

### Recommendation: 2A
One line. Existing 6C5 still passes (earlyDir is mkdirSync'd → existsSync returns true → falls through to existing logic).

New test: **Case 6I** — garbage lock with missing project dir + candidate with no paths/labels → green (was: red before fix)

---

## Bug 3 — Orphaned ticker keeps stale locks alive

### Critical constraint
Ticker is `nohup ... & disown` → `process.ppid === 1` after disown. `process.ppid` fallback does NOT work.

### Options
**Option 3A (Recommended): Exit immediately when no Claude ancestor at startup**
At `cmdTicker` line 1895, after `walkToClaudePid()` returns null:
```js
if (tickCtx.claudePid === null) {
  process.stderr.write('ticker: no Claude ancestor at startup; orphaned, exiting\n');
  try { fs.unlinkSync(pidPath); } catch (_) {}
  return;
}
```
- Risk: Low. Phase wrapper auto-respawns ticker if PID file missing.
- Self-healing: false-positive exit (ps transient fail) corrected on next phase invocation
- Complexity: ~4 lines

**Option 3B: JSONL staleness check** — couples to Claude on-disk format; timing-dependent; Medium risk

**Option 3C: Wall-clock cap (~4h)** — masks, doesn't fix; Medium risk

### Recommendation: 3A
Existing `runTick` guard at line 1824 (`if (tickCtx.claudePid && !isPidAlive(tickCtx.claudePid))`) keeps working for "ancestor existed at boot but died later."

New test: **Case 6J** — spawn ticker subprocess with no Claude ancestor; verify exits within ~500ms, PID file removed

---

## Phasing (independently mergeable, in order)

| Phase | Bug | Files | Lines | Risk |
|-------|-----|-------|-------|------|
| 1 | Bug 2 | classifier + plugin mirror | ~2 | Low |
| 2 | Bug 1 | classifier + plugin mirror | ~8 | Medium |
| 3 | Bug 3 | claim + plugin mirror | ~6 | Low |

---

## New Tests Required

| Case | Bug | Description |
|------|-----|-------------|
| 6H | Bug 1 | host-project path `src/foo.ts` overlap detected → red |
| 6I | Bug 2 | garbage lock, missing projectDir + no paths → green |
| 6J | Bug 3 | orphan ticker exits within ~500ms with no Claude ancestor |

---

## Explicit NOT to Build
- No new subcommands, config keys, env vars
- No `readLockFiles()` semantic changes
- No `walkToClaudePid()` changes
- No `cmdSweep` expansion for missing-dir locks
- No lock-file schema changes
- No URL/import-path filtering for Bug 1

## Success Criteria
- `node scripts/simulate-workflow-walkthrough.js` exits 0
- Existing 6A–6G remain green
- New 6H, 6I, 6J pass
- `diff scripts/kaola-workflow-classifier.js plugins/kaola-workflow/scripts/kaola-workflow-classifier.js` → zero output
- `diff scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js` → zero output
