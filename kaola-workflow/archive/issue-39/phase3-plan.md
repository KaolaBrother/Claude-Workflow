# Phase 3 - Plan: issue-39

## Blueprint

### Files to Modify

| File | Changes | Why |
|------|---------|-----|
| `scripts/kaola-workflow-classifier.js` | Task A: +1 line existsSync guard; Task B: 2 regex replacements + remove COARSE_AREAS + remove 2 `.has()` filters | Bug 2 + Bug 1 fixes |
| `plugins/kaola-workflow/scripts/kaola-workflow-classifier.js` | Byte-identical mirror after each task | Plugin parity |
| `scripts/kaola-workflow-claim.js` | Task C: +4 lines orphan-exit guard in cmdTicker | Bug 3 fix |
| `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` | Byte-identical mirror after Task C | Plugin parity |
| `scripts/simulate-workflow-walkthrough.js` | Task B: add Cases 6H and 6I; Task C: add Case 6J | Regression tests |
| `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | Semantic mirror of Cases 6H, 6I, 6J (different filename — not byte-diff) | Plugin parity |

### Build Sequence

1. **Task A** — Bug 2: existsSync guard in lock loop (classifier.js) — no dependencies
2. **Task B** — Bug 1: generalize regexes + remove COARSE_AREAS (classifier.js + tests 6H/6I) — depends on Task A (same file)
3. **Task C** — Bug 3: orphan-exit guard in cmdTicker (claim.js + test 6J) — independent of A/B (different file)

### Parallelization Plan

| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| Serial | A → B | Both modify `kaola-workflow-classifier.js` |
| Parallel | C alongside A | `kaola-workflow-claim.js` is disjoint from classifier |

Task C and Task A can start simultaneously. Tasks B and C both add test cases to `simulate-workflow-walkthrough.js` — sequence C after B to avoid write conflicts, or implement C's test after B completes.

### External Dependencies

None. All fixes use standard Node.js `fs`, `process`, and `child_process` APIs.

---

## Task List

### Task A: Bug 2 — Missing existsSync Guard

- **File:** `scripts/kaola-workflow-classifier.js`
- **Write Set:** `scripts/kaola-workflow-classifier.js`, `plugins/kaola-workflow/scripts/kaola-workflow-classifier.js`
- **Depends On:** none
- **Parallel Group:** serial (Group 1, step 1)
- **Action:** MODIFY

**Implement:**

Find the `for (const lock of claimedLocks)` loop. After the `isSafeName` check and `projectDir` derivation (which will be at approximately lines 264–266), insert exactly one line:

```js
if (!fs.existsSync(projectDir)) continue;
```

The surrounding context before the insert is:
```js
for (const lock of claimedLocks) {
  if (!isSafeName(lock.project)) continue;
  const projectDir = path.join(root, 'kaola-workflow', lock.project);
  // ← INSERT HERE
  // (rest of loop: file reads, anyClaimedAtPhaseLeTwo, overlap checks unchanged)
```

No other lines change.

**Mirror:** `cp scripts/kaola-workflow-classifier.js plugins/kaola-workflow/scripts/kaola-workflow-classifier.js`

**Validate:**
```bash
node scripts/simulate-workflow-walkthrough.js
diff scripts/kaola-workflow-classifier.js plugins/kaola-workflow/scripts/kaola-workflow-classifier.js
```

---

### Task B: Bug 1 — Generalize FILE_PATH_REGEX, Remove COARSE_AREAS

- **File:** `scripts/kaola-workflow-classifier.js`, `scripts/simulate-workflow-walkthrough.js`
- **Write Set:** `scripts/kaola-workflow-classifier.js`, `plugins/kaola-workflow/scripts/kaola-workflow-classifier.js`, `scripts/simulate-workflow-walkthrough.js`, `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- **Depends On:** Task A
- **Parallel Group:** serial (Group 1, step 2)
- **Action:** MODIFY

**Implement — classifier changes:**

**Part 1:** Replace `FILE_PATH_REGEX` (line ~122):
```js
// OLD:
const FILE_PATH_REGEX = /(?:^|[^A-Za-z0-9_./-])((?:plugins\/kaola-workflow|scripts|commands|hooks|kaola-workflow)(?:\/[A-Za-z0-9_.-]+)*\/[A-Za-z0-9_.-]*[A-Za-z0-9_-])/g;
// NEW:
const FILE_PATH_REGEX = /(?:^|[^A-Za-z0-9_./-])([A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)+)/g;
```

**Part 2:** Replace `AREA_PATH_REGEX` (line ~123):
```js
// OLD:
const AREA_PATH_REGEX = /(?:^|[^A-Za-z0-9_./-])((?:plugins\/kaola-workflow(?:\/(?:scripts|skills|agents|config))?|scripts|commands|hooks|kaola-workflow))\/(?=$|[^A-Za-z0-9_./-])/g;
// NEW:
const AREA_PATH_REGEX = /(?:^|[^A-Za-z0-9_./-])([A-Za-z0-9_-]+)\/(?=$|[^A-Za-z0-9_./-])/g;
```

**Part 3:** Delete the entire `COARSE_AREAS` block (lines ~124–134):
```js
// DELETE entire block:
const COARSE_AREAS = new Set([
  'plugins/kaola-workflow',
  'scripts',
  'commands',
  ...
]);
```

**Part 4:** In `extractCoarseAreas()`, remove `COARSE_AREAS.has()` guards:
```js
// BEFORE:
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

// AFTER:
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

`SHARED_INFRA` (line ~252) is NOT touched.

**Implement — test cases 6H and 6I:**

Add both cases after the existing Epic Case 6 test block (after the last 6G case), before any "Epic Case 7" block. They share the outer `try/finally` structure of other Epic Case 6 blocks.

**Case 6H** (insert first):
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
    // Claimed lock's phase3 plan references src/foo.ts
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

**Case 6I** (insert after 6H):
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

**Mirror classifier:** `cp scripts/kaola-workflow-classifier.js plugins/kaola-workflow/scripts/kaola-workflow-classifier.js`

**Mirror test:** Add semantically identical 6H and 6I cases to `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`. The plugin test file uses a different `classifierScript` path variable — use its equivalent.

**Implementer check (verify before writing):** Run the full existing suite (6A–6F) locally after changing regexes. The new AREA_PATH_REGEX is greedier and could match `word/` in non-path contexts. If any existing test fails, diagnose before continuing.

**Validate:**
```bash
node scripts/simulate-workflow-walkthrough.js
diff scripts/kaola-workflow-classifier.js plugins/kaola-workflow/scripts/kaola-workflow-classifier.js
```

---

### Task C: Bug 3 — Orphaned Ticker Self-Termination

- **File:** `scripts/kaola-workflow-claim.js`, `scripts/simulate-workflow-walkthrough.js`
- **Write Set:** `scripts/kaola-workflow-claim.js`, `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`, `scripts/simulate-workflow-walkthrough.js`, `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- **Depends On:** none (disjoint from Tasks A/B; sequence test case after Task B's test changes are committed)
- **Parallel Group:** parallel with Task A; serialize test case write after Task B
- **Action:** MODIFY

**Implement — claim.js change:**

In `cmdTicker()` (line 1873), insert 4 lines after line 1895 (`tickCtx.claudePid = walkToClaudePid();`) and before line 1896 (`runTick(tickCtx);`):

```js
if (tickCtx.claudePid === null) {
  process.stderr.write('ticker: no Claude ancestor at startup; orphaned, exiting\n');
  try { fs.unlinkSync(pidPath); } catch (_) {}
  return;
}
```

The surrounding context after the insert:
```js
tickCtx.claudePid = walkToClaudePid();  // null if not under Claude
if (tickCtx.claudePid === null) {
  process.stderr.write('ticker: no Claude ancestor at startup; orphaned, exiting\n');
  try { fs.unlinkSync(pidPath); } catch (_) {}
  return;
}
runTick(tickCtx);
```

**Note:** `acquirePidFile` at line 1889 writes the PID file before this check runs. The `try { fs.unlinkSync(pidPath); }` correctly removes it. `enforcePlatformSessionOrExit` at line 1890 is a no-op by default (`KAOLA_ENFORCE_PLATFORM_SESSION` is not `'1'`).

**Implement — test Case 6J (revised — advisor-corrected):**

Add after Cases 6H and 6I:

```js
// 6J: ticker orphan-exit — spawned without Claude ancestor self-terminates and removes PID file
{
  const epic6JTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kaola-workflow-epic6j-'));
  const stderrFile6J = path.join(epic6JTmp, 'ticker-stderr.txt');
  try {
    const claimScript6J = path.join(__dirname, 'kaola-workflow-claim.js');
    const coordRoot6J = path.join(epic6JTmp, '.git');
    fs.mkdirSync(path.join(coordRoot6J, 'kaola-workflow', '.tickers'), { recursive: true });
    const sessionId6J = 'sess-6j-orphan';
    const pidFile6J = path.join(coordRoot6J, 'kaola-workflow', '.tickers', sessionId6J + '.pid');

    // Use (cmd &) subshell pattern: the inner subshell exits immediately after fork,
    // breaking the ancestor chain before walkToClaudePid() runs.
    // Stderr captured to file (not /dev/null) so we can assert the orphan message.
    const spawnScript = [
      `(nohup "${process.execPath}" "${claimScript6J}" ticker`,
      `  --session "${sessionId6J}"`,
      `  --interval 60000`,
      `  </dev/null 2>"${stderrFile6J}" &)`,
      `; sleep 0.05`  // brief pause so nohup can write to the PID file
    ].join(' ');
    spawnSync('sh', ['-c', spawnScript], {
      cwd: epic6JTmp,
      encoding: 'utf8',
      env: {
        ...process.env,
        KAOLA_WORKFLOW_OFFLINE: '0',
        HOME: epic6JTmp
      }
    });

    // Wait up to 1500ms for ticker to exit and remove its PID file
    let elapsed = 0;
    let pidFileGone = false;
    while (elapsed < 1500) {
      if (!fs.existsSync(pidFile6J)) { pidFileGone = true; break; }
      spawnSync('sh', ['-c', 'sleep 0.1']);
      elapsed += 100;
    }
    assert(pidFileGone,
      'Epic Case 6J: orphaned ticker must remove its PID file within 1500ms; file still exists at ' + pidFile6J);

    // Assert orphan-exit message in captured stderr
    const stderr6J = fs.existsSync(stderrFile6J)
      ? fs.readFileSync(stderrFile6J, 'utf8')
      : '';
    assert(stderr6J.includes('no Claude ancestor at startup'),
      'Epic Case 6J: ticker stderr must contain "no Claude ancestor at startup", got: ' + stderr6J);
  } finally {
    fs.rmSync(epic6JTmp, { recursive: true, force: true });
  }
}
```

**Implementation notes:**
- `(cmd &)` subshell: the parens create a fork that exits immediately after backgrounding, severing the direct parent before `walkToClaudePid()` runs at line 1895
- `KAOLA_KERNEL_SESSION_SKIP=1` is NOT needed: `enforcePlatformSessionOrExit` in cmdTicker (line 1890) returns early when `KAOLA_ENFORCE_PLATFORM_SESSION !== '1'` (default)
- `sleep 0.05` gives nohup time to write the PID file before we start polling
- Stderr captured to `stderrFile6J` (not `/dev/null`) so the assertion proves the orphan path fired, not just any crash
- `__dirname` resolves to `scripts/` since the test file is in `scripts/` — verify the actual path variable used in the test file and substitute accordingly

**Mirror claim:** `cp scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js`

**Mirror test:** Add semantically identical 6J case to `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`.

**Validate:**
```bash
node scripts/simulate-workflow-walkthrough.js
diff scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js
```

---

## Advisor Notes

- All three source fixes (1A/2A/3A) endorsed without modification
- Case 6J revised: `(cmd &)` subshell pattern + stderr captured to file + assert `'no Claude ancestor at startup'` message
- `KAOLA_KERNEL_SESSION_SKIP=1` removed from 6J env (not needed; `enforcePlatformSessionOrExit` is no-op by default)
- Reasoning string `'exact file path'` confirmed at classifier line 342 — Case 6H assertion is correct
- Plugin parity `diff` added explicitly to every task's validate step
- Greedier AREA_PATH_REGEX: run full 6A–6F suite immediately after Bug 1 changes (noted as implementer check in Task B)

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | — | Advisor endorsed with targeted fix synthesized; no architect re-run needed |
