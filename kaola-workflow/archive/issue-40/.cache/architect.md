# Code Architect Blueprint: Issue #40 — Worktree-Native Workflow Contract Gaps

## Ambiguity Resolutions

**Ambiguity 1 — `selectFirstClaimable` signature.**
Signature: `(classifierScript, issues, claimer, sinks)` where `sinks = { skipped: [], blocked: [] }` is optional. When absent (pick-next), classify-and-skip logging is silently dropped. When provided (startup), arrays are mutated in place to feed the receipt.

**Ambiguity 2 — pick-next claimer strategy.**
`cmdPickNext`'s claimer calls `runBootstrapClaim`, which shells to `cmdClaim`, which provisions the worktree and writes lock file. After `selectFirstClaimable` returns a pick, `cmdPickNext` reads back the lock file at `lockPath(coordRoot, project)` to extract `worktree_path`. No double-provision.

**Ambiguity 3 — workflow-state.md write in pick-next.**
Post-write augmentation: `cmdPickNext` reads the file written by `cmdClaim` → `updateSinkLease`, then does a regex replace to set/overwrite `phase: 1`, `step: claimed`, and `expires:` while preserving all Sink and Lease fields. Same read-modify-write pattern as `updateLeaseInPlace`.

**Ambiguity 4 — Codex validator location.**
`scripts/validate-kaola-workflow-contracts.js` (root `scripts/`, NOT inside `plugins/`).

**`archiveProjectDir` idempotency.**
Already idempotent: returns `{ skipped: 'source-missing' }` if archive already exists. No code change required.

## Files to Create
None — all work modifies existing files.

## Files to Modify

| File | Changes | Phase |
|------|---------|-------|
| `plugins/kaola-workflow/scripts/validate-workflow-contracts.js` | Replace with byte-identical copy of root validator | A1 |
| `scripts/kaola-workflow-claim.js` | A2, B4, B5, B6, D12, E13 — multiple targeted changes | A→E |
| `scripts/simulate-workflow-walkthrough.js` | A3, B7, B8, E14 — Cases 17M, 17L, 17N, extend 17F | A→E |
| `commands/workflow-next.md` | C10 — replace exit 0 with verdict-based routing | C |
| `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` | C11 — add KAOLA_WORKTREE_NATIVE branch | C |
| `scripts/validate-kaola-workflow-contracts.js` | B9 — add pick-next/finalize/receipt/router assertions | B |

## Build Sequence

### Phase A — Mechanical safety net (independent tasks, run first for CI)

**A1 — Byte-sync plugin validator (Flaw 1)**
- Write set: `plugins/kaola-workflow/scripts/validate-workflow-contracts.js`
- Change: `cp scripts/validate-workflow-contracts.js plugins/kaola-workflow/scripts/validate-workflow-contracts.js` — byte copy, no code edit
- Validation: `node scripts/validate-script-sync.js`

**A2 — Fix cmdWorktreeFinalize root derivation (Flaw 6)**
- Write set: `scripts/kaola-workflow-claim.js`
- Change: at line ~2402, replace `const root = getRoot();` with `const mainRoot = findMainWorktree() || getRoot();` and replace all downstream `root` with `mainRoot` within `cmdWorktreeFinalize`. Also add `const coordRoot = getCoordRoot();` at top of function.
- Note: `findMainWorktree()` is already defined at line 2236, used at line 2371 in `commitWorktreeArtifacts`
- Validation: `node scripts/simulate-workflow-walkthrough.js 2>&1 | tail -5` (17F must pass)

**A3 — Add Case 17M (Flaw 6 test: finalize from inside worktree)**
- Write set: `scripts/simulate-workflow-walkthrough.js`
- Change: after Case 17J block, add Case 17M:
  1. Fresh git repo in temp dir
  2. Run `pick-next` to provision worktree → `pick17m`
  3. Seed any phase artifact inside `pick17m.worktree_path` so finalize has something to commit
  4. Run `worktree-finalize --project pick17m.project` with `cwd: pick17m.worktree_path` (inside the issue worktree)
  5. Assert `verdict === 'finalized'`
  6. Assert `worktree_path` does not contain `.kw.kw`
- Validation: `node scripts/simulate-workflow-walkthrough.js 2>&1 | tail -5` (17M pass)

### Phase B — Consolidation (serial: B4 → B5 → B6, then B7/B8/B9 in parallel)

**B4 — Extract `selectFirstClaimable` helper**
- Write set: `scripts/kaola-workflow-claim.js`
- Change: insert before `runStartupClaimFirstAvailable` (~line 1190):
  ```javascript
  function selectFirstClaimable(classifierScript, issues, claimer, sinks) {
    if (!fs.existsSync(classifierScript)) return { pick: null };
    for (const issue of issues) {
      const issueNumber = Number(issue.number || issue);
      if (!Number.isFinite(issueNumber) || issueNumber <= 0) continue;
      const candidate = classifyIssueCandidate(classifierScript, issueNumber);
      if (candidate.verdict === 'blocked') {
        if (sinks) sinks.blocked.push({ issue: issueNumber, reason: candidate.reasoning });
        continue;
      }
      if (candidate.verdict !== 'green' && candidate.verdict !== 'yellow') {
        if (sinks) sinks.skipped.push({ issue: issueNumber, verdict: candidate.verdict, reason: candidate.reasoning });
        continue;
      }
      const pick = { pick: issueNumber, project: candidate.project, verdict: candidate.verdict };
      if (claimer(pick)) return pick;
      if (sinks) sinks.skipped.push({ issue: issueNumber, verdict: 'skipped', reason: 'claim race or existing lock' });
    }
    return { pick: null };
  }
  ```
- Validation: `node scripts/kaola-workflow-claim.js 2>&1 | head -1` (usage error, not parse error)

**B5 — Refactor `runStartupClaimFirstAvailable` to call `selectFirstClaimable`**
- Write set: `scripts/kaola-workflow-claim.js`
- Change: replace body of `runStartupClaimFirstAvailable` (lines ~1190-1208):
  ```javascript
  function runStartupClaimFirstAvailable(claimScript, classifierScript, args, issues, skipped, blocked) {
    const sinks = { skipped, blocked };
    return selectFirstClaimable(
      classifierScript,
      issues,
      function(pick) { return runBootstrapClaim(claimScript, args, pick); },
      sinks
    );
  }
  ```
- Validation: `node scripts/simulate-workflow-walkthrough.js 2>&1 | tail -5` (startup path Epic Case 14 green)

**B6 — Rewrite `cmdPickNext` (Flaws 4+5+8+9)**
- Write set: `scripts/kaola-workflow-claim.js`
- Change: replace entire `cmdPickNext` body (lines ~2183-2233):
  1. Parse args; `sessionId = currentSessionId(args)`; `coordRoot = getCoordRoot()`; `root = getRoot()`
  2. **Early return**: `const owned = ownedActiveProject(coordRoot, root, sessionId)` → if truthy emit `{ verdict: 'owned', project: owned.project, issue: owned.issue_number, session: sessionId }` and return
  3. `runBootstrapSweep(__filename, root)`
  4. `const issueFetch = fetchOpenIssueRecords(root)`; `const topTierLabels = readPriorityConfig(root)`; `const sortedIssues = sortIssueRecords(issueFetch.issues, { topTierLabels })`
  5. `const classifierScript = path.join(path.dirname(__filename), 'kaola-workflow-classifier.js')`
  6. `const pick = selectFirstClaimable(classifierScript, sortedIssues, function(p) { return runBootstrapClaim(__filename, args, p); })`
  7. If `!pick.pick`: emit `{ verdict: 'none', reason: 'no-unclaimed-issues' }` and return
  8. Read lock: `const lock = readJsonFile(lockPath(coordRoot, pick.project))`; `const worktree_path = lock ? lock.worktree_path : null`
  9. Write receipt: `writeStartupReceipt(coordRoot, sessionId, { runtime: args.runtime || 'claude', project: pick.project, issue: pick.pick, selected_issue: pick.pick, selected_project: pick.project, verdict: pick.verdict, claim: 'acquired', skipped: [], blocked: [] })`
  10. Augment `workflow-state.md`: read `path.join(root, 'kaola-workflow', pick.project, 'workflow-state.md')`; regex-replace `phase:`, `step:`, insert `expires:` line; write back. Use `phase: 1`, `step: claimed`, `expires: new Date(Date.now() + 24*3600*1000).toISOString()`
  11. Emit: `{ verdict: 'acquired', issue: pick.pick, project: pick.project, branch: lock && lock.branch, worktree_path, session: sessionId, runtime: args.runtime || null, sink: args.sink || null }`
- Validation: `node scripts/simulate-workflow-walkthrough.js 2>&1 | tail -5` + `node scripts/validate-workflow-contracts.js`

**B7 — Add Case 17L (verify-startup after pick-next)**
- Write set: `scripts/simulate-workflow-walkthrough.js`
- Change: after Case 17A block (first pick-next), add Case 17L:
  1. Run `node "$CLAIM_JS" verify-startup --session sess-epic17 --project pick17a.project` from `epic17Tmp`
  2. Assert stdout JSON `authorized: true`
  3. Assert startup receipt file exists at `path.join(coordRoot, 'kaola-workflow', '.sessions', 'sess-epic17.startup.json')`
- Validation: `node scripts/simulate-workflow-walkthrough.js 2>&1 | tail -5` (17L pass)

**B8 — Add Case 17N (sweep GCs expired pick-next worktree)**
- Write set: `scripts/simulate-workflow-walkthrough.js`
- Change: after Case 17M, add Case 17N:
  1. Provision second pick-next in fresh temp repo with mock gh shim → `pick17n`
  2. Read lock file at `lockPath(coordRoot17n, pick17n.project)`
  3. Mutate lock: set both `expires` AND `last_heartbeat` to `new Date(Date.now() - 25 * 3600 * 1000).toISOString()`; write back
  4. Run `node "$CLAIM_JS" sweep` from that repo's root
  5. Assert lock file is gone OR worktree directory no longer exists
- Validation: `node scripts/simulate-workflow-walkthrough.js 2>&1 | tail -5` (17N pass)

**B9 — Add pick-next/finalize/receipt assertions to Codex validator**
- Write set: `scripts/validate-kaola-workflow-contracts.js`
- Change: before the `console.log('...passed')` line, add:
  ```javascript
  assertIncludes(`${pluginRoot}/scripts/kaola-workflow-claim.js`, 'cmdPickNext');
  assertIncludes(`${pluginRoot}/scripts/kaola-workflow-claim.js`, 'cmdWorktreeFinalize');
  assertIncludes(`${pluginRoot}/scripts/kaola-workflow-claim.js`, 'writeStartupReceipt');
  assertIncludes(`${pluginRoot}/skills/kaola-workflow-next/SKILL.md`, 'KAOLA_WORKTREE_NATIVE');
  ```
- Validation: `node scripts/validate-kaola-workflow-contracts.js`

### Phase C — Router routing (C10 and C11 independent of each other)

**C10 — Replace `exit 0` with verdict-based routing in workflow-next.md (Flaw 2)**
- Write set: `commands/workflow-next.md`
- Change: at line 63, replace the single-line KAOLA_WORKTREE_NATIVE branch with:
  ```bash
  if [ "${KAOLA_WORKTREE_NATIVE:-0}" = "1" ]; then
    PICK_NEXT_OUT=$(node "$CLAIM_JS" pick-next \
      --session "$KAOLA_STARTUP_SESSION" \
      --runtime claude \
      ${KAOLA_SINK:+--sink $KAOLA_SINK} 2>&1) || true
    PICK_VERDICT=$(PICK_NEXT_OUT="$PICK_NEXT_OUT" node -e \
      'try{process.stdout.write(JSON.parse(process.env.PICK_NEXT_OUT||"{}").verdict||"")}catch(_){}')
    if [ "$PICK_VERDICT" = "acquired" ] || [ "$PICK_VERDICT" = "owned" ]; then
      STARTUP_OUT="$PICK_NEXT_OUT"
    else
      printf '%s\n' "$PICK_NEXT_OUT"
      exit 0
    fi
  fi
  ```
- Validation: `node scripts/validate-workflow-contracts.js`

**C11 — Mirror router change into Codex SKILL.md (Flaw 3)**
- Write set: `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md`
- Change: in the `## Startup` section around line 52, add `KAOLA_WORKTREE_NATIVE` branch block after existing startup bash block:
  ```markdown
  When `KAOLA_WORKTREE_NATIVE=1` is set, use the worktree-native path:
  
  ```bash
  if [ "${KAOLA_WORKTREE_NATIVE:-0}" = "1" ]; then
    PICK_NEXT_OUT=$(node "$claim_script" pick-next \
      --session "$KAOLA_STARTUP_SESSION" \
      --runtime codex \
      ${KAOLA_SINK:+--sink $KAOLA_SINK} 2>/dev/null) || true
    PICK_VERDICT=$(PICK_NEXT_OUT="$PICK_NEXT_OUT" node -e \
      'try{process.stdout.write(JSON.parse(process.env.PICK_NEXT_OUT||"{}").verdict||"")}catch(_){}')
    if [ "$PICK_VERDICT" = "acquired" ] || [ "$PICK_VERDICT" = "owned" ]; then
      STARTUP_OUT="$PICK_NEXT_OUT"
    else
      printf '%s\n' "$PICK_NEXT_OUT"
      exit 0
    fi
  fi
  ```
  If verdict is `acquired` or `owned`, use `STARTUP_OUT` for project routing. Otherwise stop.
  ```
- Validation: `node scripts/validate-kaola-workflow-contracts.js` (after B9)

### Phase D — Resume reads state file (depends on B6)

**D12 — Teach `scanPhaseArtifacts` to read workflow-state.md first (Flaw 7)**
- Write set: `scripts/kaola-workflow-claim.js`
- Change: prepend to `scanPhaseArtifacts` body (~line 2265) before `PHASE_ARTIFACTS` array:
  ```javascript
  const stateFilePath = path.join(projectDir, 'workflow-state.md');
  try {
    const stateContent = fs.readFileSync(stateFilePath, 'utf8');
    const step = (stateContent.match(/^step:\s*(.+)$/m) || [])[1] || '';
    const nextCmd = (stateContent.match(/^next_command:\s*(.+)$/m) || [])[1] || '';
    const phase = parseInt((stateContent.match(/^phase:\s*(\d+)$/m) || [])[1] || '0', 10);
    if (step.trim() && step.trim() !== 'complete' && nextCmd.trim()) {
      return { currentPhase: phase, nextCommand: nextCmd.trim() };
    }
  } catch (_) {}
  ```
- Validation: `node scripts/simulate-workflow-walkthrough.js 2>&1 | tail -5`

### Phase E — Termination sequence (E13 then E14)

**E13 — Add cleanup to `cmdWorktreeFinalize` (Flaw 10)**
- Write set: `scripts/kaola-workflow-claim.js`
- Change: after `commitWorktreeArtifacts(worktreePath, args.project, mainRoot)` call, add:
  ```javascript
  const archiveResult = archiveProjectDir(mainRoot, args.project, 'finalized');
  const sessionId = args.session || currentSessionId(args, { fallback: false });
  if (sessionId) {
    releaseSession(mainRoot, coordRoot, sessionId, 'worktree-finalize', { remoteCleanup: false });
  }
  const removeResult = removeWorktree(coordRoot, args.project, { worktree_path: worktreePath });
  ```
  Augment output JSON with: `archive`, `archive_dest`, `removal` fields.
  Note: `releaseSession` silently tolerates missing lock — no code change needed there.
- Validation: `node scripts/simulate-workflow-walkthrough.js 2>&1 | tail -5` (17F extended, E14 assertions)

**E14 — Extend Case 17F (finalize teardown assertions)**
- Write set: `scripts/simulate-workflow-walkthrough.js`
- Change: after existing 17F assertions, add:
  ```javascript
  assert(
    finalize17f.archive === 'archived' || finalize17f.archive === 'skipped',
    '17F: archive must be archived or skipped, got ' + finalize17f.archive
  );
  assert(
    finalize17f.removal === 'removed' || finalize17f.removal === 'deferred',
    '17F: removal must be removed or deferred, got ' + finalize17f.removal
  );
  ```
- Validation: `node scripts/simulate-workflow-walkthrough.js 2>&1 | tail -5` (all Epic 17 green)

## Parallelization Plan

| Phase | Parallel Groups |
|-------|----------------|
| A | A1 (plugin cp) can run with A2+A3 concurrently — different files |
| B | B4→B5→B6 serial (same function chain); after B6: B7+B8 concurrent (same file, different line ranges), B9 concurrent (different file) |
| C | C10 + C11 concurrent (different files) |
| D | D12 independent |
| E | E13 → E14 serial (E14 tests E13's output fields) |

## Task Write Sets

| Task | Files written |
|------|--------------|
| A1 | `plugins/kaola-workflow/scripts/validate-workflow-contracts.js` |
| A2 | `scripts/kaola-workflow-claim.js` |
| A3 | `scripts/simulate-workflow-walkthrough.js` |
| B4 | `scripts/kaola-workflow-claim.js` |
| B5 | `scripts/kaola-workflow-claim.js` |
| B6 | `scripts/kaola-workflow-claim.js` |
| B7 | `scripts/simulate-workflow-walkthrough.js` |
| B8 | `scripts/simulate-workflow-walkthrough.js` |
| B9 | `scripts/validate-kaola-workflow-contracts.js` |
| C10 | `commands/workflow-next.md` |
| C11 | `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` |
| D12 | `scripts/kaola-workflow-claim.js` |
| E13 | `scripts/kaola-workflow-claim.js` |
| E14 | `scripts/simulate-workflow-walkthrough.js` |

**IMPORTANT**: After every edit to `scripts/kaola-workflow-claim.js`, run:
`cp scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
before any `validate-script-sync.js` check.

## Integration Points / Blocking Facts

1. `args.session` in `cmdPickNext` — router always passes `--session "$KAOLA_STARTUP_SESSION"` (set at line 61); safe.
2. `coordRoot` in `cmdWorktreeFinalize` — `getCoordRoot()` resolves correctly from inside a worktree via `git --git-common-dir`.
3. `releaseSession` tolerates missing lock — already handles it at line 1671; document in E13.
4. Case 17N sweep mechanics — `shouldSweep` checks BOTH `expires` AND `last_heartbeat`; B8 must set both in mock lock.

## Explicit Out-of-Scope Items

1. Phase artifact directory isolation gaps (3 known from memory) — deferred
2. `validate-kaola-workflow-contracts.js` plugin sync — excluded from COMMON_SCRIPTS intentionally
3. Performance budget enforcement (Flaw 11) — no implementation step assigned
4. `cmdResume` beyond `scanPhaseArtifacts` — only the scan function changes
5. `runBootstrapClaimFirstAvailable` (line 1149) — not refactored (bootstrap-specific, uses older APIs)
6. Phase command files (phase1-6.md) — not modified
7. `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` — excluded from COMMON_SCRIPTS
8. `archiveProjectDir` code changes — already idempotent

## Validation Commands Per Task

| Task | Command |
|------|---------|
| A1 | `node scripts/validate-script-sync.js` |
| A2 | `node scripts/simulate-workflow-walkthrough.js 2>&1 \| tail -5` |
| A3 | `node scripts/simulate-workflow-walkthrough.js 2>&1 \| tail -5` |
| B4 | `node scripts/kaola-workflow-claim.js 2>&1 \| head -1` |
| B5 | `node scripts/simulate-workflow-walkthrough.js 2>&1 \| tail -5` |
| B6 | `node scripts/simulate-workflow-walkthrough.js 2>&1 \| tail -5` |
| B7 | `node scripts/simulate-workflow-walkthrough.js 2>&1 \| tail -5` |
| B8 | `node scripts/simulate-workflow-walkthrough.js 2>&1 \| tail -5` |
| B9 | `node scripts/validate-kaola-workflow-contracts.js` |
| C10 | `node scripts/validate-workflow-contracts.js` |
| C11 | `node scripts/validate-kaola-workflow-contracts.js` |
| D12 | `node scripts/simulate-workflow-walkthrough.js 2>&1 \| tail -5` |
| E13 | `node scripts/simulate-workflow-walkthrough.js 2>&1 \| tail -5` |
| E14 | `node scripts/simulate-workflow-walkthrough.js 2>&1 \| tail -5` |

**Master validation**: `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js && node scripts/validate-script-sync.js && node scripts/validate-kaola-workflow-contracts.js`
