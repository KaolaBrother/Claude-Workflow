# Code Architect Cache — issue-39

## Design Decisions

- Bug 2 before Bug 1: both touch `kaola-workflow-classifier.js`, so they must serialize. Bug 2 is a 1-line guard; implementing it first keeps the diff minimal and lets Bug 1's regex changes be reviewed cleanly.
- Bug 1 is highest regression surface: replacing two regexes and removing `COARSE_AREAS` affects every path-extraction call. Tests 6B, 6C, 6C2, 6C3, 6C4, 6C5 all exercise these paths and must keep passing.
- Bug 3 is disjoint (different source file, different test case): it forms a parallel group with Tasks 1+2 and can be implemented in any order relative to them, but all three tasks must land before the PR is merged.
- Mirror semantics: `kaola-workflow-classifier.js` and `kaola-workflow-claim.js` copies must be byte-identical after each task. The test file `simulate-workflow-walkthrough.js` mirrors to `simulate-kaola-workflow-walkthrough.js` — different filename, so semantic equivalence only (same cases added, not byte-for-byte).

---

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `scripts/kaola-workflow-classifier.js` | Bug 2 guard (1 line), then Bug 1 regex + COARSE_AREAS removal (~6 lines) | 1, 2 |
| `plugins/kaola-workflow/scripts/kaola-workflow-classifier.js` | Byte-identical mirror of above after each task | 1, 2 |
| `scripts/kaola-workflow-claim.js` | Bug 3 orphan-exit guard (~4 lines) in `cmdTicker` | 3 |
| `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` | Byte-identical mirror of above | 3 |
| `scripts/simulate-workflow-walkthrough.js` | Add Cases 6H, 6I (after existing 6G), 6J (after 6I) | 2, 3 |
| `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | Semantic mirror of Cases 6H, 6I, 6J | 2, 3 |

---

## Data Flow

```
classify(issue, claimedLocks, root)
  └─ scanClaimedOverlap(...)
       ├─ [Bug 2 guard] if !fs.existsSync(projectDir) → skip lock (line ~266)
       ├─ extractFilePaths(text)      ← uses FILE_PATH_REGEX [Bug 1: generalized]
       └─ extractCoarseAreas(text)    ← uses AREA_PATH_REGEX + COARSE_AREAS filter [Bug 1: filter removed]

cmdTicker()                           [Bug 3]
  ├─ walkToClaudePid() → null when disowned
  └─ [Bug 3 guard] if null → print stderr + unlink pidPath + return
```

---

## Build Sequence

1. Task A — Bug 2 (classifier.js projectDir guard)
2. Task B — Bug 1 (classifier.js regex generalization + COARSE_AREAS removal) — depends on Task A completing on same file
3. Task C — Bug 3 (claim.js orphan-exit guard) — independent of A and B, parallel group

---

## Parallelization Groups

| Group | Tasks | Constraint |
|-------|-------|------------|
| Serial Group 1 | Task A then Task B | Share `kaola-workflow-classifier.js` write |
| Parallel Group 2 | Task C | Disjoint write set from Group 1 |

Task C can be started simultaneously with Task A, but both touch `simulate-workflow-walkthrough.js` for their respective test cases. Tasks B and C add test cases to `simulate-workflow-walkthrough.js` so they must be merged sequentially or coordinated.

---

## Task A — Bug 2: Missing `existsSync` Guard in Lock Loop

**File:** `scripts/kaola-workflow-classifier.js`

**Exact location:** Inside the `for (const lock of claimedLocks)` loop in `scanClaimedOverlap`, after the `isSafeName` check and `projectDir` derivation. Currently lines 264–266:

```js
for (const lock of claimedLocks) {
  if (!isSafeName(lock.project)) continue;
  const projectDir = path.join(root, 'kaola-workflow', lock.project);
```

**Change:** Insert one line immediately after `projectDir` is defined:

```js
if (!fs.existsSync(projectDir)) continue;
```

Lines after it (file reads, `anyClaimedAtPhaseLeTwo` assignment, overlap checks) remain unchanged.

**No test case for Task A alone.** Test coverage comes from Case 6I added in Task B.

**Mirror:** Byte-identical copy to plugin path.

**Validate:** `node scripts/simulate-workflow-walkthrough.js` must exit 0.

---

## Task B — Bug 1: Generalize File-Path Regexes, Remove COARSE_AREAS

**File:** `scripts/kaola-workflow-classifier.js`

**Depends on:** Task A (same file).

**Part 1 — Replace FILE_PATH_REGEX (line 122):**

Current:
```js
const FILE_PATH_REGEX = /(?:^|[^A-Za-z0-9_./-])((?:plugins\/kaola-workflow|scripts|commands|hooks|kaola-workflow)(?:\/[A-Za-z0-9_.-]+)*\/[A-Za-z0-9_.-]*[A-Za-z0-9_-])/g;
```

Replace with:
```js
const FILE_PATH_REGEX = /(?:^|[^A-Za-z0-9_./-])([A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)+)/g;
```

**Part 2 — Replace AREA_PATH_REGEX (line 123):**

Current:
```js
const AREA_PATH_REGEX = /(?:^|[^A-Za-z0-9_./-])((?:plugins\/kaola-workflow(?:\/(?:scripts|skills|agents|config))?|scripts|commands|hooks|kaola-workflow))\/(?=$|[^A-Za-z0-9_./-])/g;
```

Replace with:
```js
const AREA_PATH_REGEX = /(?:^|[^A-Za-z0-9_./-])([A-Za-z0-9_-]+)\/(?=$|[^A-Za-z0-9_./-])/g;
```

**Part 3 — Remove COARSE_AREAS (lines 124–134):**

Delete the entire `const COARSE_AREAS = new Set([...])` block.

**Part 4 — Remove COARSE_AREAS.has() filters in `extractCoarseAreas`:**

Change:
```js
function extractCoarseAreas(text) {
  const areas = new Set();
  for (const filePath of extractFilePaths(text)) {
    const area = areaForPath(filePath);
    if (COARSE_AREAS.has(area)) areas.add(area);
  }
  const source = String(text || '');
  let match;
  AREA_PATH_REGEX.lastIndex = 0;
  while ((match = AREA_PATH_REGEX.exec(source)) !== null) {
    const area = normalizeRepoPath(match[1]);
    if (COARSE_AREAS.has(area)) areas.add(area);
  }
  return areas;
}
```

To:
```js
function extractCoarseAreas(text) {
  const areas = new Set();
  for (const filePath of extractFilePaths(text)) {
    areas.add(areaForPath(filePath));
  }
  const source = String(text || '');
  let match;
  AREA_PATH_REGEX.lastIndex = 0;
  while ((match = AREA_PATH_REGEX.exec(source)) !== null) {
    const area = normalizeRepoPath(match[1]);
    if (area) areas.add(area);
  }
  return areas;
}
```

**SHARED_INFRA (line 252) is NOT modified.** It remains `new Set(['scripts', 'hooks', 'plugins/kaola-workflow/scripts'])`.

**Regression check:** Cases 6B, 6C, 6C2, 6C3, 6C4, 6C5 must all still pass.

### Test Case 6H — Bug 1 regression (host-path overlap → red)

Insert after existing cases, before Case 6I:

```js
// 6H: red — host-project path src/foo.ts in both candidate and claimed lock → exact overlap
{
  const epic6HTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kaola-workflow-epic6h-'));
  try {
    const locksDir6H = locksDirFor(epic6HTmp);
    const claimedDir6H = path.join(epic6HTmp, 'kaola-workflow', 'host-claimed');
    fs.mkdirSync(locksDir6H, { recursive: true });
    fs.mkdirSync(claimedDir6H, { recursive: true });
    fs.writeFileSync(path.join(locksDir6H, 'host-claimed.lock'), JSON.stringify({
      project: 'host-claimed', session_id: 'sess-6h', issue_number: 60,
      claimed_at: new Date().toISOString(),
      expires: new Date(Date.now() + 3600000).toISOString(),
      last_heartbeat: new Date().toISOString()
    }, null, 2));
    fs.writeFileSync(path.join(claimedDir6H, 'phase3-plan.md'),
      '# Phase 3\nTouches: src/foo.ts\n');
    const roadmapDir6H = path.join(epic6HTmp, 'kaola-workflow', '.roadmap');
    fs.mkdirSync(roadmapDir6H, { recursive: true });
    fs.writeFileSync(path.join(roadmapDir6H, 'issue-60.md'),
      'issue: #60\ntitle: host feature\nstatus: open\nworkflow_project: —\nnext_step: ready\nbody: Modifies src/foo.ts\n');
    const out6H = execFileSync(process.execPath, [classifierScript, 'classify', '--issue', '60'],
      { cwd: epic6HTmp, encoding: 'utf8', env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' } });
    const r6H = JSON.parse(out6H.trim());
    assert(r6H.verdict === 'red',
      'Epic Case 6H: exact file path overlap on host-project path must yield red, got ' + r6H.verdict);
    assert(r6H.reasoning.includes('exact file path'),
      'Epic Case 6H: reasoning must mention "exact file path", got: ' + r6H.reasoning);
  } finally {
    fs.rmSync(epic6HTmp, { recursive: true, force: true });
  }
}
```

### Test Case 6I — Bug 2 regression (missing projectDir → green)

```js
// 6I: green — garbage lock whose projectDir does NOT exist on disk; no path info
{
  const epic6ITmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kaola-workflow-epic6i-'));
  try {
    const locksDir6I = locksDirFor(epic6ITmp);
    fs.mkdirSync(locksDir6I, { recursive: true });
    fs.writeFileSync(path.join(locksDir6I, 'ghost-project.lock'), JSON.stringify({
      project: 'ghost-project', session_id: 'sess-6i', issue_number: 50,
      claimed_at: new Date().toISOString(),
      expires: new Date(Date.now() + 3600000).toISOString(),
      last_heartbeat: new Date().toISOString()
    }, null, 2));
    const roadmapDir6I = path.join(epic6ITmp, 'kaola-workflow', '.roadmap');
    fs.mkdirSync(roadmapDir6I, { recursive: true });
    fs.writeFileSync(path.join(roadmapDir6I, 'issue-50.md'),
      'issue: #50\ntitle: no metadata\nstatus: open\nworkflow_project: —\nnext_step: ready\n');
    const out6I = execFileSync(process.execPath, [classifierScript, 'classify', '--issue', '50'],
      { cwd: epic6ITmp, encoding: 'utf8', env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' } });
    const r6I = JSON.parse(out6I.trim());
    assert(r6I.verdict === 'green',
      'Epic Case 6I: missing projectDir must skip lock; expected green, got ' + r6I.verdict);
  } finally {
    fs.rmSync(epic6ITmp, { recursive: true, force: true });
  }
}
```

**Mirror:** Byte-identical copy to plugin path.

**Validate:**
```
node scripts/simulate-workflow-walkthrough.js
diff scripts/kaola-workflow-classifier.js plugins/kaola-workflow/scripts/kaola-workflow-classifier.js
```

---

## Task C — Bug 3: Orphaned Ticker Self-Termination

**File:** `scripts/kaola-workflow-claim.js`

**Parallel group:** Independent of Tasks A and B.

**Exact location:** `cmdTicker` function, after `tickCtx.claudePid = walkToClaudePid();` and before `runTick(tickCtx);`.

**Change:** Insert 4 lines:

```js
if (tickCtx.claudePid === null) {
  process.stderr.write('ticker: no Claude ancestor at startup; orphaned, exiting\n');
  try { fs.unlinkSync(pidPath); } catch (_) {}
  return;
}
```

### Test Case 6J — Bug 3 regression (orphan ticker exits within 1000ms)

```js
// 6J: ticker orphan-exit — spawned without Claude ancestor self-terminates and removes PID file
{
  const epic6JTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kaola-workflow-epic6j-'));
  try {
    const claimScript6J = path.join(root, 'scripts', 'kaola-workflow-claim.js');
    const coordRoot6J = path.join(epic6JTmp, '.git');
    fs.mkdirSync(path.join(coordRoot6J, 'kaola-workflow', '.tickers'), { recursive: true });
    const sessionId6J = 'sess-6j-orphan';
    const pidFile6J = path.join(coordRoot6J, 'kaola-workflow', '.tickers', sessionId6J + '.pid');

    const spawnScript = [
      `nohup "${process.execPath}" "${claimScript6J}" ticker`,
      `--session "${sessionId6J}"`,
      `--interval 60000`,
      `</dev/null >/dev/null 2>&1 & disown; echo $!`
    ].join(' ');
    const shResult = spawnSync('sh', ['-c', spawnScript], {
      cwd: epic6JTmp,
      encoding: 'utf8',
      env: {
        ...process.env,
        KAOLA_WORKFLOW_OFFLINE: '0',
        KAOLA_ENFORCE_PLATFORM_SESSION: '0',
        KAOLA_KERNEL_SESSION_SKIP: '1',
        HOME: epic6JTmp
      }
    });
    const tickerPid = parseInt((shResult.stdout || '').trim(), 10);
    assert(Number.isFinite(tickerPid) && tickerPid > 0,
      'Epic Case 6J: sh must emit ticker PID, got: ' + shResult.stdout);

    let elapsed = 0;
    let pidFileGone = false;
    while (elapsed < 1000) {
      if (!fs.existsSync(pidFile6J)) { pidFileGone = true; break; }
      spawnSync('sh', ['-c', 'sleep 0.1']);
      elapsed += 100;
    }
    assert(pidFileGone,
      'Epic Case 6J: orphaned ticker must remove its PID file within 1000ms; file still exists at ' + pidFile6J);
    let tickerAlive = false;
    try { process.kill(tickerPid, 0); tickerAlive = true; } catch (_) {}
    assert(!tickerAlive,
      'Epic Case 6J: orphaned ticker process PID ' + tickerPid + ' must be dead');
  } finally {
    fs.rmSync(epic6JTmp, { recursive: true, force: true });
  }
}
```

**Key notes:**
- `KAOLA_KERNEL_SESSION_SKIP=1` bypasses `enforcePlatformSessionOrExit` (would exit 3 without Claude ancestor).
- `nohup ... & disown` causes `process.ppid === 1` after shell exits. `walkToClaudePid()` returns null because `next <= 1` triggers null path.
- Do NOT use `spawn(..., { detached: true })` inside test — leaves test process as parent (ppid = test), whose ancestor chain includes Claude.
- Busy-wait via `spawnSync('sh', ['-c', 'sleep 0.1'])` — no `setTimeout`/timer dependency.

**Mirror:** Byte-identical copy to plugin path. Semantic copy of 6J test case to `simulate-kaola-workflow-walkthrough.js`.

**Validate:**
```
node scripts/simulate-workflow-walkthrough.js
diff scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js
```

---

## Out-of-Scope Items

- No changes to `walkToClaudePid` (5-hop ceiling known but not in scope)
- No changes to `cmdSweep` to handle missing-dir locks
- No `readLockFiles` semantic changes
- No lock-file schema changes
- No new subcommands, config keys, or env vars
- No URL/import-path filtering in the regex
- No config-driven `path_roots` allow-list
