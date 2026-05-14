# Phase 3 - Plan: pr-sink

## Design Adjustments from Phase 2

Phase 2 specified `workflow-next-pr.md` would write `sink: pr` directly to the `## Sink` block of `workflow-state.md`. Phase 3 architect identified this is infeasible: on **new work**, `workflow-state.md` does not exist before `claim` runs. The Sink block is created by `claim.js updateSinkLease()` at claim time.

**Phase 3 mechanism**: `workflow-next-pr.md` sets `KAOLA_SINK=pr` in the environment → `workflow-next.md` Startup Step 0 reads `KAOLA_SINK` and passes `--sink ${KAOLA_SINK:-merge}` to `claim` → `claim.js updateSinkLease()` writes `sink: pr` to the `## Sink` block. Backward compat: absent `sink:` defaults to `merge` in all readers.

## Blueprint

### Files to Create

| File | Purpose | Key Interfaces |
|------|---------|----------------|
| `scripts/kaola-workflow-sink-pr.js` | PR-based sink: push branch, `gh pr create`, record PR URL in lock + state + summary, optionally enable auto-merge | `parseArgs`, `readConfig`, `ghExec`, `getRoot`, `patchLockFile`, `updateStateSinkBlock`, `appendSummary`, `main` |
| `commands/workflow-next-pr.md` | Thin wrapper ≤40 lines: sets `KAOLA_SINK=pr`, delegates to `/workflow-next` | markdown command file only |

### Files to Modify

| File | Changes | Why |
|------|---------|-----|
| `scripts/kaola-workflow-claim.js` | 6 changes: `--sink` flag, `sink` field in lockData, full `## Sink` block rebuild, `releaseSession` helper extraction, `cmdWatchPr`, dispatcher registration | Core state machine for PR lease lifecycle |
| `commands/kaola-workflow-phase6.md` | Step 8 renamed to `## Step 8 - Sink`; conditional `case "$SINK_KIND"` dispatch defaulting to `merge` | Enable PR sink without breaking existing merge sink |
| `commands/workflow-next.md` | `watch-pr` invocation between sweep and classify; `KAOLA_SINK_FLAG` propagation to `claim` call | Enforce sweep → watch-pr → classify → claim order; consume KAOLA_SINK env var |
| `install.sh` | Add `kaola-workflow-sink-pr.js` to script copy loop | Install sink-pr.js on user systems |
| `scripts/validate-workflow-contracts.js` | 16 new assertions; update existing Step 8 heading assertion; bump workflow-next.md cap 240→250 | Static contract enforcement for all new components |
| `scripts/simulate-workflow-walkthrough.js` | Epic Case 7 (sub-tests 7G, 7A, 7B, 7C, 7D, 7E, 7F in that order) | Dynamic integration coverage for PR sink scenarios |
| `README.md` | Document `/workflow-next-pr`, `sink-pr.js`, `pr_auto_merge`, `watch-pr` | User-facing documentation |
| `CHANGELOG.md` | `[Unreleased]` entries for all new/modified components | Release tracking |

### Build Sequence

1. T1 — `scripts/kaola-workflow-claim.js` (chokepoint: all other tasks depend on claim.js changes)
2. T2 + T3 + T6 + T9 (parallel, disjoint write sets, all depend on T1 complete)
3. T4 + T5 (parallel, both reference claim.js and sink-pr.js; depend on T1+T2+T3)
4. T7 + T8 (parallel, depend on all above; T7 static, T8 dynamic)

### Parallelization Plan

| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| G1 (serial) | T1 | Chokepoint — 6 changes to claim.js |
| G2 (parallel) | T2, T3, T6, T9 | Disjoint files: new script, new command file, install.sh, docs |
| G3 (parallel) | T4, T5 | Both reference claim.js + sink-pr.js; disjoint target files |
| G4 (parallel) | T7, T8 | Static contracts vs dynamic integration; disjoint write sets |

### External Dependencies

- `gh` CLI (already project dependency) — `gh pr create`, `gh pr view --json state,mergedAt,url,number,closedAt`, `gh pr merge --auto --squash --delete-branch`
- `git` binary — `git push origin {branch}`, `git branch -D`
- Node.js builtins: `fs`, `path`, `os`, `child_process`
- No npm packages

---

## Task List

### Task T1: kaola-workflow-claim.js — 6 changes
- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js` (Epic Case 7G validation)
- Write Set: `scripts/kaola-workflow-claim.js`
- Depends On: none
- Parallel Group: G1 (serial chokepoint)
- Action: MODIFY
- Validate: `node scripts/simulate-workflow-walkthrough.js` (7G sub-test after T1 complete)

**T1.1 — `parseArgs` sink flag** (in the `for` loop):
```js
if (argv[i] === '--sink' && argv[i + 1]) { args.sink = argv[++i]; continue; }
```
Enum validation in `cmdClaim`: `assert(!args.sink || ['merge','pr'].includes(args.sink), '--sink must be "merge" or "pr"');`

**T1.2 — `cmdClaim` lockData fields** (add to lockData object):
```js
sink: (args.sink === 'pr') ? 'pr' : 'merge',
pr_url: null,
pr_number: null,
```

**T1.3 — `buildSinkBlock` helper + `updateSinkLease` rebuild**

New `buildSinkBlock(lockData)` function (~10 lines):
- computes branchName: `workflow/issue-{N}-{project}` or `lockData.branch || workflow/{project}`
- lines array: `## Sink`, `branch:`, `issue_number:`, `claimed_at:`, `sink: (lockData.sink || 'merge')`
- conditionally appends `pr_url:` and `pr_number:` if present and non-zero
- returns `lines.join('\n')`

`updateSinkLease` uses regex replace to rebuild full `## Sink` + `## Lease` blocks from lockData.

**T1.4 — `releaseSession(root, sessionId, reason)` helper**

Extracted from `cmdRelease` body. Returns `boolean`. On no match: stderr + return false. On success: remove GH label (try/catch), unlink lock file, unlink session file, return true. `cmdRelease` becomes thin wrapper.

**T1.5 — `cmdWatchPr()` function** (add explicit OFFLINE guard at top):
```js
function cmdWatchPr() {
  if (OFFLINE) return;
  const args = parseArgs(process.argv.slice(3));
  const root = getRoot();
  const dir = locksDir(root);
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.lock'));
  for (const f of files) {
    // parse lock, skip if sink !== 'pr' || !pr_url || !isSafeName
    // gh pr view --json state,mergedAt,url,number,closedAt
    // MERGED: releaseSession() + git branch -D {branch} (try/catch)
    // CLOSED: releaseSession(id, 'aborted') — no branch delete
    // OPEN: Object.assign({}, lock, {last_heartbeat, expires}) → write + updateLeaseInPlace
  }
}
```
Optional `--issue N` for targeted testing.

**T1.6 — dispatcher** (in `main()`):
```js
if (sub === 'watch-pr') return cmdWatchPr();
```

---

### Task T2: kaola-workflow-sink-pr.js (new)
- File: `scripts/kaola-workflow-sink-pr.js`
- Test File: `scripts/simulate-workflow-walkthrough.js` (Epic Case 7A, 7B, 7F)
- Write Set: `scripts/kaola-workflow-sink-pr.js`
- Depends On: T1 (lock file schema; OFFLINE const pattern)
- Mirror: `scripts/kaola-workflow-sink-merge.js:1-174`
- Parallel Group: G2
- Action: CREATE
- Validate: `node scripts/simulate-workflow-walkthrough.js` (7A, 7B, 7F sub-tests)

Key function signatures:
```js
function parseArgs(argv) → { branch: string, issue: number|undefined, project: string }
function readConfig() → { pr_auto_merge: boolean }
function ghExec(args) → string  // OFFLINE guard returns '', throws on gh failure
function getRoot() → string
function patchLockFile(root, project, prUrl, prNumber) → void  // Object.assign; try/catch if absent
function updateStateSinkBlock(stateFile, prUrl, prNumber) → void  // regex replace ## Sink block
function appendSummary(summaryFile, prUrl, prNumber) → void  // appendFileSync, creates if absent
function main() → void
```

`main()` flow:
1. OFFLINE early return: write `OFFLINE_PLACEHOLDER`/`0` to lock + state + summary, exit 0
2. Validate args (`--branch` not TBD, `--project` safe name, `--issue` positive int)
3. `git push origin {branch}`
4. `gh pr create --head {branch} --base main --fill [--body 'Closes #{issue}']` → `prUrl`
5. Assert `prUrl.startsWith('https://')`
6. Parse `prNumber` from URL (`/pull/N` regex, fallback `0`)
7. `patchLockFile(root, project, prUrl, prNumber)`
8. `updateStateSinkBlock(stateFile, prUrl, prNumber)`
9. `appendSummary(summaryFile, prUrl, prNumber)`
10. If `config.pr_auto_merge`: `ghExec(['pr','merge',prUrl,'--auto','--squash','--delete-branch'])` (non-fatal)

OFFLINE: write `pr_url: OFFLINE_PLACEHOLDER`, `pr_number: 0` to lock + state + summary, return.

Error paths:
- `--branch TBD` → assert fires, exit 1
- `git push` fails → exit 1
- `gh pr create` returns non-URL → assert fires, exit 1
- lock file missing (e.g., OFFLINE or test setup) → patchLockFile try/catch skips silently
- `## Sink` block absent → updateStateSinkBlock regex match fails, write skipped
- `gh pr merge --auto` fails → stderr warning + exit 0 (non-fatal)

---

### Task T3: workflow-next-pr.md (new, ≤40 lines)
- File: `commands/workflow-next-pr.md`
- Test File: `scripts/validate-workflow-contracts.js` (line count assertion)
- Write Set: `commands/workflow-next-pr.md`
- Depends On: none (markdown only)
- Parallel Group: G2
- Action: CREATE
- Validate: `node scripts/validate-workflow-contracts.js` (routerPrLines <= 40 assertion)

Content requirements:
- Frontmatter: `description`, `argument-hint`
- Description: what this wrapper does vs `/workflow-next`
- Behavior: (1) set `KAOLA_SINK=pr`, (2) delegate to `/workflow-next`
- Startup block: `export KAOLA_SINK=pr`
- Contract: must remain ≤40 lines; must not touch workflow-state.md directly

---

### Task T4: kaola-workflow-phase6.md — Step 8 dispatch
- File: `commands/kaola-workflow-phase6.md`
- Test File: `scripts/validate-workflow-contracts.js` (SINK_KIND + heading assertions)
- Write Set: `commands/kaola-workflow-phase6.md`
- Depends On: T2 (references sink-pr.js by name), T3
- Parallel Group: G3
- Action: MODIFY
- Validate: `node scripts/validate-workflow-contracts.js` (assertIncludes checks)

Replace `## Step 8 - Sink Merge` with `## Step 8 - Sink`. New bash snippet:
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
      --branch "$SINK_BRANCH" $SINK_ISSUE_FLAG --project {project}
    ;;
  merge|*)
    node ~/.claude/kaola-workflow/scripts/kaola-workflow-sink-merge.js \
      --branch "$SINK_BRANCH" $SINK_ISSUE_FLAG --project {project}
    ;;
esac
```

Exit code documentation for both scripts included. Note: lease stays alive after sink-pr.js exits 0.

---

### Task T5: workflow-next.md — watch-pr + KAOLA_SINK_FLAG
- File: `commands/workflow-next.md`
- Test File: `scripts/validate-workflow-contracts.js` (watch-pr + KAOLA_SINK assertions)
- Write Set: `commands/workflow-next.md`
- Depends On: T1 (claim.js watch-pr subcommand must exist)
- Parallel Group: G3
- Action: MODIFY
- Validate: `node scripts/validate-workflow-contracts.js` (assertIncludes + cap ≤250)

Changes in Startup Step 0 bash block, inside the existing CLAIM_JS + KAOLA_SESSION_ID guard, after `node "$CLAIM_JS" sweep`:

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

Current line count: 237/240. T5 adds ~6 lines → estimated ~243. T7 bumps cap to 250 (10-line headroom).

---

### Task T6: install.sh — add sink-pr.js
- File: `install.sh`
- Test File: `scripts/validate-workflow-contracts.js` (assertIncludes)
- Write Set: `install.sh`
- Depends On: T2 (file must exist to be worth copying)
- Parallel Group: G2
- Action: MODIFY
- Validate: `node scripts/validate-workflow-contracts.js`

Add after the `kaola-workflow-sink-merge.js` entry in the copy loop:
```bash
  "$SOURCE_SCRIPTS_DIR"/kaola-workflow-sink-pr.js \
```

---

### Task T7: validate-workflow-contracts.js — assertions
- File: `scripts/validate-workflow-contracts.js`
- Test File: itself
- Write Set: `scripts/validate-workflow-contracts.js`
- Depends On: T1–T6 all complete
- Parallel Group: G4
- Action: MODIFY
- Validate: `node scripts/validate-workflow-contracts.js` (all assertions pass)

New assertions (16 total):
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
assertIncludes('scripts/kaola-workflow-claim.js', "'sink:'");  // in buildSinkBlock output
assertIncludes('scripts/kaola-workflow-sink-pr.js', 'KAOLA_WORKFLOW_OFFLINE');
assertIncludes('scripts/kaola-workflow-sink-pr.js', 'OFFLINE_PLACEHOLDER');
assertIncludes('scripts/kaola-workflow-sink-pr.js', 'pr_auto_merge');
assertIncludes('commands/workflow-next.md', 'watch-pr');
assertIncludes('commands/workflow-next.md', 'KAOLA_SINK');
```

Existing assertion update: change `'## Step 8 - Sink Merge'` → `'## Step 8 - Sink'`.
Cap update: change `routerLines <= 240` → `routerLines <= 250`.

---

### Task T8: simulate-workflow-walkthrough.js — Epic Case 7
- File: `scripts/simulate-workflow-walkthrough.js`
- Test File: itself
- Write Set: `scripts/simulate-workflow-walkthrough.js`
- Depends On: T1 (claim.js runtime), T2 (sink-pr.js runtime), all G2/G3 complete
- Parallel Group: G4
- Action: MODIFY
- Validate: `node scripts/simulate-workflow-walkthrough.js` (all sub-tests pass)

Sandbox setup (shared):
- `fs.mkdtempSync` → `epic7Tmp`
- `git init --bare remote.git` + `git init work` + `git config user.email/name` + initial commit + push
- gh shim at `epic7Tmp/bin/gh` (chmod 755, prepend to PATH via env override)
- Config isolation: `HOME = epic7Tmp`

Sub-tests run **in order 7G, 7A, 7B, 7C, 7D, 7E, 7F** (7G first to prove claim --sink pr works):

**7G** (foundational): `claim --sink pr` → `lock.sink === 'pr'`, state `## Sink` contains `sink: pr`

**7A**: gh shim returns `https://github.com/test/repo/pull/42` for `pr create`. Pre-condition: 7G wrote lock with `sink:pr`. Assert: phase6-summary.md contains URL; `## Sink` block contains `pr_url: https://...`; lock JSON has `pr_url`.

**7B**: Config at `epic7Tmp/.config/kaola-workflow/config.json` → `{ pr_auto_merge: true }`. gh shim logs calls. Assert: shim log contains `pr merge`.

**7C**: gh shim returns `{"state":"MERGED",...}`. Pre-condition: lock file with `sink:pr`, `pr_url`, local branch exists. Assert: lock file removed; session file removed; `git show-ref {branch}` fails.

**7D**: gh shim returns `{"state":"CLOSED","mergedAt":null,...}`. Assert: lock file removed; branch still exists (show-ref succeeds).

**7E**: gh shim returns `{"state":"OPEN",...}`. Assert: lock file still exists; `lock.last_heartbeat` >= original; `lock.expires` > original.

**7F**: `KAOLA_WORKFLOW_OFFLINE=1`. Assert: exit 0; summary contains `OFFLINE_PLACEHOLDER`; `## Sink` block contains `pr_url: OFFLINE_PLACEHOLDER`; gh shim log empty.

gh shim construction: shell script that parses first two args (`pr create`, `pr view`, `pr merge`) and writes to `{epic7Tmp}/gh-calls.log`. Returns appropriate JSON for `pr view`. Handles `pr view <url>` (positional arg).

---

### Task T9: README.md + CHANGELOG.md
- File: `README.md`, `CHANGELOG.md`
- Write Set: both files
- Depends On: T2, T3 (must exist before documentation references them)
- Parallel Group: G2
- Action: MODIFY
- Validate: none (docs only)

README additions:
- `/workflow-next-pr` command entry in scripts/commands table
- `pr_auto_merge` config key: location, type boolean, default false, effect
- `watch-pr` subcommand: what it does, when it runs, three PR states it handles
- Note on lease lifecycle

CHANGELOG `## Unreleased` entries (6 bullets for all new/modified components).

---

## Advisor Notes

Three items from advisor gate incorporated above:
1. Design pivot documented in "Design Adjustments from Phase 2" section
2. `commands/workflow-next.md` added to Files-to-Modify (was absent from Phase 1)
3. `workflow-next.md` cap bumped 240→250 in T7 (T5 adds ~6 lines, current 237)

Minor non-blocking advisor concerns applied to task specs:
- `cmdWatchPr` has explicit `if (OFFLINE) return;` at top (T1.5)
- Epic Case 7 sub-test order: 7G, 7A, 7B, 7C, 7D, 7E, 7F (T8)
- T7 verifies old assertion string exists before update

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | advisor confirmed no revision needed | Blueprint implementable as-is with 3 plan-level items incorporated |
