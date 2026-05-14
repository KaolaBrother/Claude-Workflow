# Code Architect: pr-sink

## Design Decisions

- **Sink propagation mechanism**: `workflow-next-pr.md` sets the environment variable `KAOLA_SINK=pr` before delegating to `/workflow-next`. Startup Step 0 in `workflow-next.md` passes `--sink ${KAOLA_SINK:-merge}` to `claim`. This avoids needing `workflow-state.md` to exist before claim runs (which it doesn't on new work). `updateSinkLease` in `claim.js` then writes the `sink:` field to the `## Sink` block at claim time. This is the only mechanism; the wrapper never touches state files directly.

- **Lock file schema**: The `.lock` JSON object gains two new fields: `sink` (string, `'merge'|'pr'`, default `'merge'`, written at claim time) and `pr_url` / `pr_number` (written later by `sink-pr.js` via direct lock file patch). `watch-pr` reads both fields from the lock file.

- **`releaseSession` extraction**: Signature `releaseSession(root, sessionId, reason = 'released')` — returns `boolean`. On lock-not-found: writes to stderr, returns `false`. On success: removes GH label (unconditionally, ignore errors), unlinks lock file, unlinks session file, returns `true`. `cmdRelease` becomes a thin wrapper calling `releaseSession(root, args.session)`.

- **`updateSinkLease` extension strategy**: Always rebuild the entire `## Sink` block on each update (mirror the existing `## Lease` rebuild pattern). All fields — `branch:`, `issue_number:`, `claimed_at:`, `sink:`, `pr_url:` (optional), `pr_number:` (optional) — are rebuilt from `lockData`. `sink-pr.js` patches the lock JSON directly and then updates the state file's Sink block itself (no cross-module dependency).

- **Phase 6 dispatch**: A `case "$SINK_KIND"` bash snippet replaces the unconditional `sink-merge.js` invocation. Absent `sink:` in the Sink block defaults to `merge` for backward compat.

- **Config**: `pr_auto_merge` is read by `sink-pr.js` independently using the same CONFIG_PATH pattern. `sink-pr.js` carries its own `readConfig()` with `pr_auto_merge: false` added to defaults. Avoids coupling to classifier.js.

- **`watch-pr` insertion point**: Added to `workflow-next.md` Startup Step 0, between sweep and the classifier `if` block, guarded by `KAOLA_WORKFLOW_OFFLINE !== '1'`.

- **`sink-pr.js` lock patching**: After `gh pr create` returns a URL, `sink-pr.js` reads the lock file for the given `--project`, patches it with `pr_url` and `pr_number` (immutably via `Object.assign`), writes it back, and then updates the `## Sink` block in `workflow-state.md` and appends a line to `phase6-summary.md`.

---

## Files to Create

| File | Purpose | Priority |
|------|---------|----------|
| `scripts/kaola-workflow-sink-pr.js` | PR-based sink: push branch, `gh pr create`, record PR URL in lock + state + summary, optionally enable auto-merge | P0 |
| `commands/workflow-next-pr.md` | Thin wrapper: sets `KAOLA_SINK=pr`, delegates to `/workflow-next`; max 40 lines | P0 |

---

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `scripts/kaola-workflow-claim.js` | (1) Add `--sink` flag to `parseArgs`; (2) Add `sink` field to `lockData` in `cmdClaim`; (3) Rebuild full `## Sink` block in `updateSinkLease` including `sink:`, `pr_url:`, `pr_number:`; (4) Extract `releaseSession(root, sessionId, reason)` helper from `cmdRelease` body; (5) Add `cmdWatchPr` function; (6) Register `watch-pr` in `main` dispatcher | P0 |
| `commands/kaola-workflow-phase6.md` | Replace unconditional `sink-merge.js` invocation in Step 8 (~lines 427-452) with `case "$SINK_KIND"` dispatch defaulting to `merge`. Rename section to `## Step 8 - Sink` | P1 |
| `commands/workflow-next.md` | Add `watch-pr` invocation + `KAOLA_SINK_FLAG` propagation to `claim` call in Startup Step 0 bash block | P1 |
| `install.sh` | Add `kaola-workflow-sink-pr.js` to script copy loop after `kaola-workflow-sink-merge.js` | P1 |
| `scripts/validate-workflow-contracts.js` | Add 15 new assertions; update existing Step 8 heading assertion | P2 |
| `scripts/simulate-workflow-walkthrough.js` | Add Epic Case 7 (sub-tests 7A–7G) | P2 |
| `README.md` | Document `/workflow-next-pr`, `sink-pr.js`, `pr_auto_merge` config, `watch-pr` behavior | P3 |
| `CHANGELOG.md` | Add `[Unreleased]` entries for pr-sink feature | P3 |

---

## Data Flow

```
/workflow-next-pr
  → sets KAOLA_SINK=pr in environment
  → delegates to /workflow-next
      → Startup Step 0:
          node claim.js sweep
          node claim.js watch-pr          ← new, OFFLINE-guarded
          (classify loop)
          node claim.js claim --sink pr   ← lockData.sink = 'pr'
              → updateSinkLease writes sink: pr to ## Sink block
      → ...phases 1-5...
      → Phase 6 Step 8:
          reads sink: field from ## Sink block → SINK_KIND=pr
          node sink-pr.js --branch ... --issue ... --project ...
              → git push origin {branch}
              → gh pr create → pr_url, pr_number
              → patch lock file: { ...lock, pr_url, pr_number }
              → update ## Sink block in workflow-state.md
              → append pr_url to phase6-summary.md
              → if config.pr_auto_merge: gh pr merge --auto --squash --delete-branch
              → exit 0

/workflow-next (subsequent runs):
  → Startup Step 0:
      node claim.js watch-pr              ← scans ALL .lock files with sink:pr + pr_url
          → gh pr view --json state,mergedAt,url,number,closedAt
          → MERGED: releaseSession(), git branch -D {branch}
          → CLOSED (no merge): releaseSession(id, 'aborted'), no branch delete
          → OPEN: update last_heartbeat + expires in lock file
```

---

## Build Sequence

1. **T1** — `scripts/kaola-workflow-claim.js` (6 changes): dependency chokepoint
2. **Parallel after T1** (disjoint write sets):
   - T2: `scripts/kaola-workflow-sink-pr.js` (new)
   - T3: `commands/workflow-next-pr.md` (new)
   - T6: `install.sh` (1-line addition)
   - T9: `README.md` + `CHANGELOG.md`
3. **Parallel after T1+T2+T3** (disjoint write sets):
   - T4: `commands/kaola-workflow-phase6.md` (references both script names)
   - T5: `commands/workflow-next.md` (references claim.js watch-pr)
4. **Parallel after all above** (static + dynamic):
   - T7: `scripts/validate-workflow-contracts.js`
   - T8: `scripts/simulate-workflow-walkthrough.js`

---

## Task Definitions

### Task T1 — `kaola-workflow-claim.js` (six changes)

Write set: `scripts/kaola-workflow-claim.js`

**T1.1 — `parseArgs` sink flag** (inside the existing `for` loop ~line 58):
```js
if (argv[i] === '--sink' && argv[i + 1]) { args.sink = argv[++i]; continue; }
```

**T1.2 — `cmdClaim` lockData** (add to `lockData` object literal ~line 197):
```js
sink: (args.sink === 'pr') ? 'pr' : 'merge',
pr_url: null,
pr_number: null,
```

**T1.3 — `updateSinkLease` full Sink block rebuild**

New helper + updated function:
```js
function buildSinkBlock(lockData) {
  const branchName = lockData.issue_number != null
    ? 'workflow/issue-' + lockData.issue_number + '-' + lockData.project
    : (lockData.branch || 'workflow/' + lockData.project);
  const lines = [
    '## Sink',
    'branch: ' + branchName,
    'issue_number: ' + (lockData.issue_number != null ? lockData.issue_number : 'unset'),
    'claimed_at: ' + lockData.claimed_at,
    'sink: ' + (lockData.sink || 'merge'),
  ];
  if (lockData.pr_url) lines.push('pr_url: ' + lockData.pr_url);
  if (lockData.pr_number != null && lockData.pr_number !== 0) lines.push('pr_number: ' + lockData.pr_number);
  return lines.join('\n');
}
```

`updateSinkLease` rebuilds full `## Sink` + `## Lease` blocks from lockData using regex replace.

**T1.4 — `releaseSession` helper extraction**

New function `releaseSession(root, sessionId, reason)`:
- `readLockFiles(root)` to find match
- guard `isSafeName`
- if not OFFLINE + issue_number: try `ghExec(['issue', 'edit', ..., '--remove-label', 'workflow:in-progress'])`
- `fs.unlinkSync(lockPath(root, match.project))`
- `fs.unlinkSync(sessionPath(root, sessionId))`
- returns `true`
- no-match: stderr + returns `false`

`cmdRelease` becomes wrapper calling `releaseSession(root, args.session)`.

**T1.5 — `cmdWatchPr` function**

Scans ALL `.lock` files in `locksDir(root)`:
- filter: `lock.sink !== 'pr'` → skip
- filter: `!lock.pr_url` → skip
- filter: `!isSafeName(lock.project)` → skip
- `ghExec(['pr', 'view', lock.pr_url, '--json', 'state,mergedAt,url,number,closedAt'])`
- MERGED: `releaseSession()` + `git branch -D {branch}`
- CLOSED: `releaseSession(id, 'aborted')` — no branch delete
- OPEN: `Object.assign({}, lock, { last_heartbeat, expires })` → write lock file + `updateLeaseInPlace`

Optional `--issue N` for targeted testing only.

**T1.6 — dispatcher**

Add `if (sub === 'watch-pr') return cmdWatchPr();` in `main()`.

---

### Task T2 — `scripts/kaola-workflow-sink-pr.js` (new file)

Write set: `scripts/kaola-workflow-sink-pr.js`

Imports: `fs`, `path`, `os`, `child_process`

Functions:
- `parseArgs(argv)` → `{ branch, issue, project }` (mirror sink-merge.js)
- `readConfig()` → `{ pr_auto_merge: false }` default; reads/creates CONFIG_PATH
- `ghExec(args)` → string; throws on failure; OFFLINE guard returns `''`
- `getRoot()` → git rev-parse --show-toplevel or cwd
- `patchLockFile(root, project, prUrl, prNumber)` → reads lock JSON, `Object.assign({}, lock, {pr_url, pr_number})`, writes back
- `updateStateSinkBlock(stateFile, prUrl, prNumber)` → regex replace `## Sink` block, adds/updates `pr_url:` and `pr_number:` lines
- `appendSummary(summaryFile, prUrl, prNumber)` → `fs.appendFileSync` creates if absent
- `main()` → full flow; OFFLINE writes placeholders and returns

OFFLINE guard at top of main: write `OFFLINE_PLACEHOLDER`/`0` to lock + state + summary, exit 0, no gh/git calls.

---

### Task T3 — `commands/workflow-next-pr.md` (new, max 40 lines)

Sets `KAOLA_SINK=pr` in the environment, then delegates to `/workflow-next`. Must not touch workflow-state.md directly. Contains only: frontmatter, description, behavior prose, startup bash (`export KAOLA_SINK=pr`), and contract note.

---

### Task T4 — `commands/kaola-workflow-phase6.md` Step 8 dispatch

Replace Step 8 `## Step 8 - Sink Merge` with `## Step 8 - Sink`:

```bash
SINK_BRANCH=$(grep '^branch:' kaola-workflow/{project}/workflow-state.md | awk '{print $2}')
SINK_ISSUE=$(grep '^issue_number:' kaola-workflow/{project}/workflow-state.md | awk '{print $2}')
SINK_KIND=$(awk '/^## Sink/,0' kaola-workflow/{project}/workflow-state.md | grep '^sink:' | awk '{print $2}')
SINK_KIND=${SINK_KIND:-merge}
SINK_ISSUE_FLAG=""
[ "$SINK_ISSUE" != "unset" ] && SINK_ISSUE_FLAG="--issue $SINK_ISSUE"

case "$SINK_KIND" in
  pr)
    node ~/.claude/kaola-workflow/scripts/kaola-workflow-sink-pr.js \
      --branch "$SINK_BRANCH" \
      $SINK_ISSUE_FLAG \
      --project {project}
    ;;
  merge|*)
    node ~/.claude/kaola-workflow/scripts/kaola-workflow-sink-merge.js \
      --branch "$SINK_BRANCH" \
      $SINK_ISSUE_FLAG \
      --project {project}
    ;;
esac
```

---

### Task T5 — `commands/workflow-next.md` watch-pr + KAOLA_SINK_FLAG

Within Startup Step 0 bash block, after `node "$CLAIM_JS" sweep`, before the classifier loop:

```bash
if [ "${KAOLA_WORKFLOW_OFFLINE:-0}" != "1" ]; then
  node "$CLAIM_JS" watch-pr 2>/dev/null || true
fi
```

Also add `KAOLA_SINK_FLAG` to the `claim` call:
```bash
KAOLA_SINK_FLAG=""
[ -n "${KAOLA_SINK:-}" ] && KAOLA_SINK_FLAG="--sink $KAOLA_SINK"
node "$CLAIM_JS" claim --session "$KAOLA_SESSION_ID" --project "$KAOLA_PROJ" --issue "$KAOLA_PICK" $KAOLA_SINK_FLAG
```

---

### Task T6 — `install.sh`

Add `kaola-workflow-sink-pr.js` to script copy loop after `kaola-workflow-sink-merge.js`.

---

### Task T7 — `validate-workflow-contracts.js` assertions

15 new assertions (after existing multi-session block):
```js
assert(exists('scripts/kaola-workflow-sink-pr.js'), ...);
assertIncludes('install.sh', 'kaola-workflow-sink-pr.js');
assertIncludes('commands/kaola-workflow-phase6.md', 'kaola-workflow-sink-pr.js');
assertIncludes('commands/kaola-workflow-phase6.md', 'SINK_KIND');
assertIncludes('commands/kaola-workflow-phase6.md', '## Step 8 - Sink');
assert(exists('commands/workflow-next-pr.md'), ...);
const routerPrLines = read('commands/workflow-next-pr.md').split(/\r?\n/).length;
assert(routerPrLines <= 40, ...);
assertIncludes('scripts/kaola-workflow-claim.js', 'watch-pr');
assertIncludes('scripts/kaola-workflow-claim.js', 'releaseSession');
assertIncludes('scripts/kaola-workflow-claim.js', 'sink:');
assertIncludes('scripts/kaola-workflow-sink-pr.js', 'KAOLA_WORKFLOW_OFFLINE');
assertIncludes('scripts/kaola-workflow-sink-pr.js', 'OFFLINE_PLACEHOLDER');
assertIncludes('scripts/kaola-workflow-sink-pr.js', 'pr_auto_merge');
assertIncludes('commands/workflow-next.md', 'watch-pr');
assertIncludes('commands/workflow-next.md', 'KAOLA_SINK');
```

Also update existing assertion: `assertIncludes('commands/kaola-workflow-phase6.md', '## Step 8 - Sink')` (was `'## Step 8 - Sink Merge'`).

---

### Task T8 — `simulate-workflow-walkthrough.js` Epic Case 7

7 sub-tests (7A–7G) using:
- `fs.mkdtempSync` sandbox
- git bare remote + clone scaffold (same as Epic Cases 2–4)
- gh shim at `{sandbox}/bin/gh` (same as Epic Case 6E)
- `HOME` override to `epic7Tmp` for config isolation in 7B

Sub-tests:
- 7A: `gh pr create` called, PR URL written to summary + Sink block + lock
- 7B: `pr_auto_merge: true` → `gh pr merge` called
- 7C: watch-pr MERGED → lock removed, branch deleted
- 7D: watch-pr CLOSED → lock removed, branch preserved
- 7E: watch-pr OPEN → lock updated, heartbeat + expires refreshed
- 7F: OFFLINE → `OFFLINE_PLACEHOLDER` written, no gh calls
- 7G: `--sink pr` to claim → `lock.sink === 'pr'`, state contains `sink: pr`

---

### Task T9 — `README.md` + `CHANGELOG.md`

README: new `/workflow-next-pr`, `pr_auto_merge`, `watch-pr` documentation.
CHANGELOG: 6 new `[Unreleased]` bullet points for all new/modified components.

---

## Parallelization Groups

| Group | Tasks | Why Safe |
|-------|-------|----------|
| G1 (serial) | T1 | Chokepoint: all other tasks reference claim.js changes |
| G2 (parallel, after G1) | T2, T3, T6, T9 | Disjoint files |
| G3 (parallel, after G2) | T4, T5 | Both reference claim.js + sink-pr.js as prerequisites |
| G4 (parallel, after G3) | T7, T8 | Static vs dynamic; disjoint write sets |

---

## Required Imports and External Dependencies

**`kaola-workflow-sink-pr.js`:** `fs`, `path`, `os`, `child_process` — all Node.js builtins. External: `gh` CLI, `git` binary. No npm packages.

**`kaola-workflow-claim.js` additions:** No new imports. `execFileSync` already imported.

**`commands/workflow-next-pr.md`:** No script imports (markdown command file). Shell builtins only.

---

## Edge Cases per Task

### T1
- `--sink foo` → assert fires, exit 1
- `updateSinkLease` when state file absent → `fs.existsSync` check returns early
- `watch-pr` while OFFLINE → `ghExec` empty string → JSON.parse throws → caught → stderr + continue
- `releaseSession` with already-deleted lock → `readLockFiles` returns no match → false
- branch field absent from lock → fallback to computed `workflow/issue-N-project`
- `git branch -D` on already-deleted branch → try/catch, silently ignored

### T2
- `--branch TBD` → assert fires
- `git push` fails → throws → exit 1
- `gh pr create` returns non-URL → assert fires → exit 1
- `/pull/N` absent from URL → `prNumber = 0`
- lock file missing → try/catch, silently skipped
- Sink block absent → regex match fails, write skipped
- `phase6-summary.md` absent → `appendFileSync` creates it
- `pr_auto_merge: true` + `gh pr merge --auto` fails → stderr warning + exit 0 (non-fatal)
- Config missing/corrupted → defaults to `{ pr_auto_merge: false }`

### T3
- Does not exist before T3 runs → created fresh; no backward compat concern

### T4
- `SINK_KIND` empty (backward compat) → `${SINK_KIND:-merge}` defaults to `merge`
- `SINK_BRANCH` empty → downstream script fails with `--branch` assertion

### T5
- `watch-pr` subcommand not available (older install) → `|| true` prevents startup failure
- `KAOLA_SINK` unset → `KAOLA_SINK_FLAG` is empty string, claim defaults to `merge`

### T7
- Existing `assertIncludes(..., '## Step 8 - Sink Merge')` MUST be changed to `'## Step 8 - Sink'`

### T8
- `HOME` override in 7B for config isolation
- git user config in sandbox
- gh shim must parse `pr view <url>` (positional URL arg)
- 7E heartbeat comparison uses `>=`

---

## Date

2026-05-15T10:15:00Z
