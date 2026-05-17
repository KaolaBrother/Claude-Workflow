# Code Explorer Cache — issue-39

## Bug 1 — FILE_PATH_REGEX hardcoded to Kaola-Workflow directories

**Location**: `scripts/kaola-workflow-classifier.js` lines 122–134

```js
const FILE_PATH_REGEX = /(?:^|[^A-Za-z0-9_./-])((?:plugins\/kaola-workflow|scripts|commands|hooks|kaola-workflow)(?:\/[A-Za-z0-9_.-]+)*\/[A-Za-z0-9_.-]*[A-Za-z0-9_-])/g;
const AREA_PATH_REGEX = /(?:^|[^A-Za-z0-9_./-])((?:plugins\/kaola-workflow(?:\/(?:scripts|skills|agents|config))?|scripts|commands|hooks|kaola-workflow))\/(?=$|[^A-Za-z0-9_./-])/g;
const COARSE_AREAS = new Set([
  'scripts', 'commands', 'hooks', 'kaola-workflow',
  'plugins/kaola-workflow', 'plugins/kaola-workflow/scripts',
  'plugins/kaola-workflow/skills', 'plugins/kaola-workflow/agents',
  'plugins/kaola-workflow/config'
]);
```

Both regexes only match paths rooted at Kaola-Workflow's own directory names. In host projects referencing `src/`, `lib/`, `crates/`, etc., both return empty. `extractFilePaths()` and `extractCoarseAreas()` return empty Sets.

**noPathInfo and conservative-red** (lines 349–352):
```js
const noPathInfo = candidateAreas.size === 0 && candidateAreaLabels.size === 0;
if (noPathInfo && claimedLocks.length > 0 && anyClaimedAtPhaseLeTwo) {
  return { verdict: 'red', reasoning: 'no extractable file paths or area labels; claimed project in phase <= 2; conservative red' };
}
```

`candidateAreaLabels` also requires `area:*` style GitHub labels — absent in most host projects.

**SHARED_INFRA** (line ~252): also references hardcoded paths, needs parallel fix.

## Bug 2 — Missing project folder treated as phase ≤ 2

**Location**: `scripts/kaola-workflow-classifier.js` lines 264–278

```js
for (const lock of claimedLocks) {
  if (!isSafeName(lock.project)) continue;
  const projectDir = path.join(root, 'kaola-workflow', lock.project);

  let phase3Content = '';
  let phase1Content = '';
  try { phase3Content = fs.readFileSync(path.join(projectDir, 'phase3-plan.md'), 'utf8'); } catch (_) {}
  try { phase1Content = fs.readFileSync(path.join(projectDir, 'phase1-research.md'), 'utf8'); } catch (_) {}

  const combined = phase3Content + phase1Content;
  const claimedPaths = extractFilePaths(combined);
  const claimedAreas = extractCoarseAreas(combined);
  const claimedAreaLabels = parseAreaLabelsFromText(combined);

  if (!fs.existsSync(path.join(projectDir, 'phase3-plan.md'))) anyClaimedAtPhaseLeTwo = true;
```

No check for `fs.existsSync(projectDir)`. When folder is archived/removed, `phase3-plan.md` is absent → `anyClaimedAtPhaseLeTwo = true`. This is wrong for completed/archived projects.

**Fix target**: Insert `if (!fs.existsSync(projectDir)) continue;` before line 278 (or treat as terminal).
Alternative: read `workflow-state.md` `status:` field for `closed`/`archived` and skip.

## Bug 3 — Orphaned ticker keeps stale locks alive

**Location**: `scripts/kaola-workflow-claim.js`

`cmdTicker` (lines 1873–1897):
```js
function cmdTicker() {
  if (OFFLINE) return;
  const args = parseArgs(process.argv.slice(3));
  tickCtx.claudePid = walkToClaudePid();  // null if not under Claude
  runTick(tickCtx);
}
```

`walkToClaudePid()` (lines 179–193): walks ≤5 ancestors looking for process with `comm` matching `/claude/i`. Returns `null` if not found.

`runTick` PID check (line 1824):
```js
if (tickCtx.claudePid && !isPidAlive(tickCtx.claudePid)) { /* exit */ }
```
Guard: `tickCtx.claudePid &&` — when `null`, check is skipped entirely. Ticker runs forever.

Each tick (lines 1839–1847) writes fresh `last_heartbeat` and `expires` (+2h). Interval: 15 min.

**`shouldSweep`** (lines 575–578):
```js
function shouldSweep(lock) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return new Date(lock.expires).getTime() < cutoff &&
    new Date(lock.last_heartbeat).getTime() < cutoff;
}
```
Both `expires` and `last_heartbeat` must be >24h old. Orphaned ticker refreshes both every 15min → never swept.

`sweep` also calls `isRemoteStale(lock)` which checks GitHub API — ticker refreshes that too every ~4 ticks.

**Fix target**: When `claudePid === null`, fall back to watching `process.ppid` via `isPidAlive()` (already available at line 1467). Exit when parent dies.

## Lock File Structure

Example (`.git/kaola-workflow/.locks/issue-39.lock`):
```json
{
  "project": "issue-39",
  "session_id": "50e5aca5-418d-49b1-9c21-c575c9a5d6c5",
  "machine_id": "269df7a8-f7f5-4f7c-aa1d-82aff10f0a4e",
  "claimed_at": "2026-05-17T08:56:59.177Z",
  "expires": "2026-05-17T10:58:12.909Z",
  "last_heartbeat": "2026-05-17T08:58:12.909Z",
  "issue_number": 39,
  "claim_comment_id": "4470019736",
  "sink": "merge",
  "pr_url": null,
  "pr_number": null,
  "runtime": "claude",
  "worktree_path": "/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-39",
  "branch": "workflow/issue-39",
  "owner_session_id": "unverified"
}
```
No PID field in lock. Ticker PID stored separately at `.tickers/{sessionId}.pid`. Sweep never reads `.tickers/` for lock expiry decisions.

## Project Folder Existence Check

No explicit `fs.existsSync(projectDir)` in classifier. Only implicit: `readFileSync` throws (caught silently) then `existsSync` on `phase3-plan.md` returns false. These are indistinguishable from "project exists but hasn't reached phase 3."

In `cmdSweep`: second-pass GC loop iterates `kaola-workflow/` subdirs to archive orphaned active dirs, but main lock-file loop has no folder-existence awareness.

## Test Structure

**Framework**: Hand-rolled, no external library.
**Runner**: `scripts/simulate-workflow-walkthrough.js`
**Pattern**: `function assert(condition, message)` throws on failure. Tests use `fs.mkdtempSync` temp dirs, spawn classifier/claim as child processes via `execFileSync`, assert on JSON stdout.

**Classifier tests**: Epic Case 6 (cases 6A–6F, 6E′) starting at line ~890.
- Case 6C5 (~line 979–994): exercises conservative-red path — creates `early-project` lock with only `phase1-research.md`, issue body with no paths. Expects `verdict === 'red'`. This is the correct designed behavior for self-hosting but incorrect for host projects.

New tests needed:
- Case 6G: host-project issue with no kaola-workflow paths → should NOT be conservative-red when projectDir missing (Bug 2 fix)
- Case 6H: archived project folder (missing from active dirs) → lock should be treated as terminal

## Config and Environment Variables

**Config**: `~/.config/kaola-workflow/config.json`
Current content: `{ "parallel_mode": "auto" }`
- `parallel_mode: "auto"` → normal classifier run
- Any other value → classifier short-circuits to `green` (lines 373–377)
- No `path_roots` field exists yet → needed for Bug 1 fix

**Env vars**: `KAOLA_WORKFLOW_OFFLINE=1` — disables GitHub API calls.

**Config hook**: `readOrCreateConfig()` (line 72) — right place to add `path_roots` field.

## Key Files

| File | Role |
|------|------|
| `scripts/kaola-workflow-classifier.js` | FILE_PATH_REGEX, noPathInfo, conservative-red, Bug 1 & 2 |
| `scripts/kaola-workflow-claim.js` | cmdTicker, runTick, shouldSweep, isPidAlive, Bug 3 |
| `scripts/simulate-workflow-walkthrough.js` | all integration tests, Epic Case 6 for classifier |
| `~/.config/kaola-workflow/config.json` | config, needs `path_roots` field |
