# Phase 3 - Plan: issue-40

## Blueprint

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| scripts/kaola-workflow-claim.js | Add `selectFirstClaimable`; refactor `runStartupClaimFirstAvailable`; rewrite `cmdPickNext`; fix `cmdWorktreeFinalize` root; add `archiveProjectDir`+`releaseSession`+`removeWorktree` to `cmdWorktreeFinalize` | Flaws 4,5,6,8,9,10 |
| scripts/simulate-workflow-walkthrough.js | Add Cases 17L, 17M, 17N; extend Case 17F cleanup assertions | Flaws 4,5,10; new contract tests |
| scripts/validate-kaola-workflow-contracts.js | Add pick-next receipt/state and finalize assertions | Flaw 11 |
| scripts/validate-workflow-contracts.js | Byte-sync to plugin (cp only) | Flaw 1 |
| commands/workflow-next.md | Replace `exit 0` with verdict-based routing at line 63 | Flaw 2 |
| plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md | Add `KAOLA_WORKTREE_NATIVE` pick-next branch matching Claude router | Flaw 3 |

### Build Sequence
1. Phase A: byte-sync, root-derivation fix, Case 17M — independent; unblocks CI
2. Phase B: `selectFirstClaimable` extraction + `runStartupClaimFirstAvailable` refactor — B4 before B5 (dependency)
3. Phase B: `cmdPickNext` rewrite — B6 depends on B4+B5 being complete
4. Phase B: Cases 17L+17N + contract validator additions — B7/B8/B9 depend on B6 being stable
5. Phase C: Router routing — C10/C11 depend on Phase B receipt being written by cmdPickNext
6. Phase D: `scanPhaseArtifacts` state-first — D12 depends on Phase B state file schema
7. Phase E: `cmdWorktreeFinalize` cleanup additions + Case 17F extension — independent of C/D

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | A1, A2, A3 | Disjoint files: A1=validate-workflow-contracts.js cp, A2=cmdWorktreeFinalize line 2402, A3=simulate test additions |
| B-setup | B4, B5 | B4 defines helper; B5 refactors caller — must sequence B4→B5, not parallel |
| B-rewrite | B6 | Depends on B4+B5; serial |
| B-tests | B7, B8, B9 | B7+B8 both edit simulate file (not parallel); B9 edits validate-kaola-workflow-contracts.js (parallel with nothing else in B) — sequence B7→B8→B9 |
| C | C10, C11 | Different files (workflow-next.md vs SKILL.md) — safe in parallel |
| D | D12 | Single function; serial |
| E | E13, E14 | E13 edits cmdWorktreeFinalize; E14 edits simulate — safe in parallel |

### External Dependencies
- No new npm packages
- All functions already exist: `selectFirstClaimable` is extracted from existing code, not new logic

## Task List

### Task A1: Byte-sync plugin validator
- File: plugins/kaola-workflow/scripts/validate-workflow-contracts.js
- Test File: (covered by existing `node scripts/simulate-workflow-walkthrough.js` — script-sync contract)
- Write Set: plugins/kaola-workflow/scripts/validate-workflow-contracts.js
- Depends On: none
- Parallel Group: A
- Action: MODIFY (byte-identical cp)
- Implement: `cp scripts/validate-workflow-contracts.js plugins/kaola-workflow/scripts/validate-workflow-contracts.js`
- Mirror: validate-script-sync pattern from existing Codex validator
- Validate: `node scripts/simulate-workflow-walkthrough.js` exits 0

### Task A2: Fix cmdWorktreeFinalize root derivation
- File: scripts/kaola-workflow-claim.js
- Test File: scripts/simulate-workflow-walkthrough.js (Case 17M)
- Write Set: scripts/kaola-workflow-claim.js
- Depends On: none
- Parallel Group: A
- Action: MODIFY
- Implement: At line 2402, replace `const root = getRoot()` with `const root = findMainWorktree() || getRoot()`. `findMainWorktree()` (line 2236) parses `git worktree list --porcelain` and is safe from any worktree context.
- Mirror: same pattern already used at line 2371 in `commitWorktreeArtifacts`
- Validate: `node scripts/simulate-workflow-walkthrough.js` (Case 17M asserts verdict:finalized and no .kw.kw/ path)

### Task A3: Add Case 17M (finalize-from-inside-worktree)
- File: scripts/simulate-workflow-walkthrough.js
- Test File: scripts/simulate-workflow-walkthrough.js
- Write Set: scripts/simulate-workflow-walkthrough.js
- Depends On: A2 (root fix must exist for 17M to pass)
- Parallel Group: A (insert after 17J at line 4991, before `} finally {` at line 4993)
- Action: MODIFY
- Implement: Case 17M: run `worktree-finalize --project {project}` with `cwd: pick17a.worktree_path` (CWD inside worktree). Assert verdict === 'finalized' and that `worktree_path` does not contain `.kw.kw/` (double-nesting bug).
- Mirror: existing 17J pattern (execFileSync + JSON.parse + assert)
- Validate: `node scripts/simulate-workflow-walkthrough.js` exits 0

### Task B4: Extract selectFirstClaimable helper
- File: scripts/kaola-workflow-claim.js
- Test File: scripts/simulate-workflow-walkthrough.js
- Write Set: scripts/kaola-workflow-claim.js
- Depends On: none (pure extraction — logic already exists in runStartupClaimFirstAvailable)
- Parallel Group: B-setup (must complete before B5)
- Action: MODIFY
- Implement: Insert new function `selectFirstClaimable(classifierScript, issues, claimer, sinks)` before `runStartupClaimFirstAvailable` (before line 1190). Body:
  ```js
  function selectFirstClaimable(classifierScript, issues, claimer, sinks) {
    sinks = sinks || { skipped: [], blocked: [] };
    for (const issue of issues) {
      const issueNumber = Number(issue.number || issue);
      if (!Number.isFinite(issueNumber) || issueNumber <= 0) continue;
      const candidate = classifyIssueCandidate(classifierScript, issueNumber);
      if (candidate.verdict === 'blocked') {
        sinks.blocked.push({ issue: issueNumber, reason: candidate.reasoning });
        continue;
      }
      if (candidate.verdict !== 'green' && candidate.verdict !== 'yellow') {
        sinks.skipped.push({ issue: issueNumber, verdict: candidate.verdict, reason: candidate.reasoning });
        continue;
      }
      const pick = { pick: issueNumber, project: candidate.project, verdict: candidate.verdict };
      if (claimer(pick)) return pick;
      sinks.skipped.push({ issue: issueNumber, verdict: 'skipped', reason: 'claim race or existing lock' });
    }
    return { pick: null };
  }
  ```
- Mirror: `runStartupClaimFirstAvailable` loop body (lines 1190-1208)
- Validate: `node scripts/simulate-workflow-walkthrough.js` exits 0 (existing 17A-17K must still pass)

### Task B5: Refactor runStartupClaimFirstAvailable to call selectFirstClaimable
- File: scripts/kaola-workflow-claim.js
- Test File: scripts/simulate-workflow-walkthrough.js
- Write Set: scripts/kaola-workflow-claim.js
- Depends On: B4 (selectFirstClaimable must exist)
- Parallel Group: B-setup (serial after B4)
- Action: MODIFY
- Implement: Replace body of `runStartupClaimFirstAvailable` (lines 1190-1208) with:
  ```js
  function runStartupClaimFirstAvailable(claimScript, classifierScript, args, issues, skipped, blocked) {
    if (!fs.existsSync(classifierScript)) return { pick: null };
    return selectFirstClaimable(classifierScript, issues,
      (pick) => runBootstrapClaim(claimScript, args, pick),
      { skipped, blocked });
  }
  ```
- Mirror: the extracted `selectFirstClaimable` helper (Task B4)
- Validate: `node scripts/simulate-workflow-walkthrough.js` exits 0 (startup path must still work)

### Task B6: Rewrite cmdPickNext (Flaws 4+5+8+9)
- File: scripts/kaola-workflow-claim.js
- Test File: scripts/simulate-workflow-walkthrough.js (Cases 17L+17N in B7+B8)
- Write Set: scripts/kaola-workflow-claim.js, plugins/kaola-workflow/scripts/kaola-workflow-claim.js
- Depends On: B4, B5
- Parallel Group: B-rewrite
- Action: MODIFY
- Implement: Replace entire `cmdPickNext` body (lines 2183-2234) with:
  ```
  1. parseArgs + currentSessionId(args) + assertSafeSession
  2. getRoot() + getCoordRoot()
  3. EXPLICIT early-return block: const owned = ownedActiveProject(coordRoot, root, args.session);
     if (owned) { stdout JSON {verdict:'owned', project, issue:owned.issue_number, session}; return; }
  4. runBootstrapSweep(__filename, root)
  5. const topTierLabels = readPriorityConfig(root)
  6. const issueFetch = fetchOpenIssueRecords(root)
  7. const sortedIssues = issueFetch.issues.length > 0
       ? sortIssueRecords(issueFetch.issues, { topTierLabels })
       : issueFetch.issues
  8. const classifierScript = path.join(path.dirname(__filename), 'kaola-workflow-classifier.js')
  9. const skipped = []; const blocked = [];
  10. const pick = selectFirstClaimable(classifierScript, sortedIssues,
        (candidate) => runBootstrapClaim(__filename, args, candidate),
        { skipped, blocked })
  11. if (!pick.pick) { stdout JSON {verdict:'none', reason:'no-actionable-issues', skipped, blocked}; return; }
  12. const receipt = writeStartupReceipt(coordRoot, args.session, {
        runtime: args.runtime || 'claude',
        issue_sync: issueFetch.status, roadmap_sync: 'skipped',
        issue_source: issueFetch.status,
        project: pick.project, issue: pick.pick,
        selected_project: pick.project, selected_issue: pick.pick,
        verdict: pick.verdict, claim: 'acquired', skipped, blocked })
  13. const now = new Date();
      const patchLock = Object.assign({}, readJsonFile(lockPath(coordRoot, pick.project)) || {}, {
        expires: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        last_heartbeat: now.toISOString()
      });
      const stateFile = path.join(root, 'kaola-workflow', pick.project, 'workflow-state.md');
      updateSinkLease(stateFile, patchLock);
  14. stdout JSON receipt
  ```
  After editing: cp scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js
- Mirror: `cmdStartup` pattern (lines 1211-1285) — same fetch/sort/classify/claim loop structure
- Validate: `node scripts/simulate-workflow-walkthrough.js` (Cases 17L+17N must pass)

### Task B7: Add Case 17L (verify-startup after pick-next)
- File: scripts/simulate-workflow-walkthrough.js
- Test File: scripts/simulate-workflow-walkthrough.js
- Write Set: scripts/simulate-workflow-walkthrough.js
- Depends On: B6
- Parallel Group: B-tests (sequence B7→B8→B9)
- Action: MODIFY
- Implement: Insert Case 17L after Case 17J (after line 4991, before line 4993 `} finally {`). Test:
  - Run `node claimJS verify-startup --session {session} --project {pick17a.project}` from `epic17Tmp`
  - Assert exit 0 (authorized: true)
  - Assert `kaola-workflow/{project}/workflow-state.md` exists in `epic17Tmp`
  - Assert state file contains `step: claimed`
  - Assert state file `## Lease` block has `expires:` timestamp > 20h from now (24h expiry)
- Mirror: existing verify-startup pattern in Case 17A setup
- Validate: `node scripts/simulate-workflow-walkthrough.js` exits 0

### Task B8: Add Case 17N (sweep GCs expired pick-next worktree)
- File: scripts/simulate-workflow-walkthrough.js
- Test File: scripts/simulate-workflow-walkthrough.js
- Write Set: scripts/simulate-workflow-walkthrough.js
- Depends On: B6, B7 (inserts after B7's 17L)
- Parallel Group: B-tests (sequence after B7)
- Action: MODIFY
- Implement: Case 17N, insert after Case 17L. Test:
  - Read lock file for pick17a.project; patch `expires` to past timestamp (now-1h)
  - Run `node claimJS sweep` from `epic17Tmp`
  - Assert lock file no longer exists (GC'd the orphan)
- Mirror: existing sweep-GC pattern from Cases 11A/11B in the walkthrough
- Validate: `node scripts/simulate-workflow-walkthrough.js` exits 0

### Task B9: Add contract assertions to validate-kaola-workflow-contracts.js
- File: scripts/validate-kaola-workflow-contracts.js
- Test File: scripts/simulate-workflow-walkthrough.js
- Write Set: scripts/validate-kaola-workflow-contracts.js
- Depends On: B6 (pick-next must write receipt before assertions can be meaningful)
- Parallel Group: B-tests (can run after B7+B8 or in parallel with them since different file)
- Action: MODIFY
- Implement: Using `pluginRoot` variable (already `const pluginRoot = 'plugins/kaola-workflow'` at line 44), add `assertIncludes` for:
  - pick-next receipt: `assertIncludes('scripts/kaola-workflow-claim.js', 'writeStartupReceipt')` (already present — verify; add if missing)
  - pick-next claim: `assertIncludes('scripts/kaola-workflow-claim.js', "claim: 'acquired'")` within cmdPickNext scope
  - worktree-finalize cleanup: `assertIncludes('scripts/kaola-workflow-claim.js', 'archiveProjectDir')` within cmdWorktreeFinalize scope
  - worktree-finalize cleanup: `assertIncludes('scripts/kaola-workflow-claim.js', 'releaseSession')` within cmdWorktreeFinalize scope
  - worktree-finalize cleanup: `assertIncludes('scripts/kaola-workflow-claim.js', 'removeWorktree')` within cmdWorktreeFinalize scope
- Mirror: existing `assertIncludes` pattern at lines 92-118
- Validate: `node scripts/validate-kaola-workflow-contracts.js` exits 0

### Task C10: Replace exit 0 with verdict-based routing in workflow-next.md
- File: commands/workflow-next.md
- Test File: (integration; covered by verify-startup assertion in 17L)
- Write Set: commands/workflow-next.md
- Depends On: B6 (receipt with claim:'acquired' must exist)
- Parallel Group: C (parallel with C11)
- Action: MODIFY
- Implement: At line 63, replace:
  ```
  [ "${KAOLA_WORKTREE_NATIVE:-0}" = "1" ] && { node "$CLAIM_JS" pick-next --session "$KAOLA_STARTUP_SESSION" --runtime claude ${KAOLA_SINK:+--sink $KAOLA_SINK} 2>&1; exit 0; } || true
  ```
  with:
  ```bash
  if [ "${KAOLA_WORKTREE_NATIVE:-0}" = "1" ]; then
    PICK_NEXT_OUT="$(node "$CLAIM_JS" pick-next --session "$KAOLA_STARTUP_SESSION" --runtime claude ${KAOLA_SINK:+--sink $KAOLA_SINK} 2>/dev/null)" || true
    PICK_NEXT_VERDICT="$(node -e "try{process.stdout.write(JSON.parse(process.argv[1]).verdict||'')}catch(e){}" "$PICK_NEXT_OUT" 2>/dev/null)" || true
    PICK_NEXT_PROJECT="$(node -e "try{process.stdout.write(JSON.parse(process.argv[1]).project||'')}catch(e){}" "$PICK_NEXT_OUT" 2>/dev/null)" || true
    if [ "$PICK_NEXT_VERDICT" = "acquired" ] && [ -n "$PICK_NEXT_PROJECT" ]; then
      STARTUP_OUT="$PICK_NEXT_OUT"
      # Fall through to normal startup routing (STARTUP_OUT is now set with acquired verdict)
    elif [ "$PICK_NEXT_VERDICT" = "owned" ] && [ -n "$PICK_NEXT_PROJECT" ]; then
      STARTUP_OUT="$PICK_NEXT_OUT"
      # Fall through to owned-project routing
    else
      echo "pick-next: no actionable issue (verdict: ${PICK_NEXT_VERDICT:-none})" >&2
      exit 0
    fi
  fi
  ```
- Mirror: `cmdStartup` verdict handling in existing STARTUP_OUT section (lines 76-81)
- Validate: `node scripts/simulate-workflow-walkthrough.js` exits 0 + manual check that STARTUP_OUT is set for acquired/owned paths

### Task C11: Mirror router change into Codex SKILL.md
- File: plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md
- Test File: scripts/validate-kaola-workflow-contracts.js (assertIncludes for KAOLA_WORKTREE_NATIVE)
- Write Set: plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md
- Depends On: C10 (copy the exact bash block from C10)
- Parallel Group: C (different file from C10)
- Action: MODIFY
- Implement: Locate the `startup` subcommand bash block in the Codex SKILL.md. Replace the `KAOLA_WORKTREE_NATIVE` branch (exit 0 pattern) with the verdict-routing block from C10.
- Mirror: C10's exact bash block
- Validate: `node scripts/validate-kaola-workflow-contracts.js` exits 0 (existing assertIncludes for startup+STARTUP_OUT still pass)

### Task D12: Teach scanPhaseArtifacts to read workflow-state.md first
- File: scripts/kaola-workflow-claim.js
- Test File: scripts/simulate-workflow-walkthrough.js (Case 17D verifies resume routing)
- Write Set: scripts/kaola-workflow-claim.js
- Depends On: B6 (state file written with `phase: 1, step: claimed, next_command`)
- Parallel Group: D
- Action: MODIFY
- Implement: At start of `scanPhaseArtifacts` (line 2265), before artifact file scanning, add:
  ```js
  // Read workflow-state.md first; fall back to artifact scan if absent/invalid
  const stateFilePath = path.join(root, 'kaola-workflow', project, 'workflow-state.md');
  if (fs.existsSync(stateFilePath)) {
    const stateContent = fs.readFileSync(stateFilePath, 'utf8');
    const nextCmd = field(stateContent, 'next_command');
    const step = field(stateContent, 'step');
    if (nextCmd && step && step !== 'complete') {
      return { next_command: nextCmd, step, source: 'workflow-state' };
    }
  }
  ```
  Then fall through to existing artifact scan.
- Mirror: `field()` helper already used throughout (line ~160); `fs.existsSync` pattern from line 1707
- Validate: `node scripts/simulate-workflow-walkthrough.js` exits 0 (Case 17D/17E must still pass)

### Task E13: Add cleanup to cmdWorktreeFinalize (archive + release + remove)
- File: scripts/kaola-workflow-claim.js
- Test File: scripts/simulate-workflow-walkthrough.js (Case 17F extended in E14)
- Write Set: scripts/kaola-workflow-claim.js
- Depends On: A2 (root fix must be in place first)
- Parallel Group: E (parallel with E14 since E14 only edits simulate file)
- Action: MODIFY
- Implement: In `cmdWorktreeFinalize` (line 2397), after `commitWorktreeArtifacts(worktreePath, args.project, root)` (line 2408) and before the `process.stdout.write(...)` at line 2416:
  ```js
  // Archive + session release + worktree removal
  const coordRoot = getCoordRoot();
  archiveProjectDir(root, args.project, 'closed');
  if (args.session) {
    releaseSession(root, coordRoot, args.session, 'worktree-finalized', { remoteCleanup: false });
  }
  const lock = readJsonFile(lockPath(coordRoot, args.project));
  const removalResult = removeWorktree(coordRoot, args.project, lock || { worktree_path: worktreePath });
  ```
  Update the result JSON to include `removal: removalResult.deferred ? 'deferred' : removalResult.removed ? 'removed' : 'skipped'`.
  Non-blocking note: `archiveProjectDir` returns `{ skipped: 'source-missing' }` if already archived — already idempotent.
- Mirror: `cmdFinalize` body (line 1729) for archive+release sequence
- Validate: `node scripts/simulate-workflow-walkthrough.js` (Case 17F extended assertions must pass)

### Task E14: Extend Case 17F to assert archive and cleanup
- File: scripts/simulate-workflow-walkthrough.js
- Test File: scripts/simulate-workflow-walkthrough.js
- Write Set: scripts/simulate-workflow-walkthrough.js
- Depends On: E13
- Parallel Group: E
- Action: MODIFY
- Implement: In Case 17F (line 4903), after existing assertions, add:
  - Assert `kaola-workflow/archive/{project}/` exists in `epic17Tmp` (archiveProjectDir ran)
  - Assert `result.removal === 'removed' || result.removal === 'deferred'` (removal attempted)
- Mirror: 17J assertion style (JSON.parse result then assert fields)
- Validate: `node scripts/simulate-workflow-walkthrough.js` exits 0

## Advisor Notes

From `.cache/advisor-plan.md`:
- `cmdClaim` DOES provision worktrees (line 1423) — B6 claimer via `runBootstrapClaim` is valid
- `expires:` goes in `## Lease` via `updateSinkLease`, not `## Current Position`
- `pluginRoot` variable name confirmed (line 44)
- Return shapes verified: `classifyIssueCandidate` → `{ issue, project, verdict, reasoning }`
- New cases 17L/M/N append after 17J (before `} finally {` at line 4993)
- `archiveProjectDir` already idempotent (returns `{ skipped: 'source-missing' }`)
- After every edit to `kaola-workflow-claim.js`: cp to plugin copy

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | Blueprint confirmed valid without revision | cmdClaim verification resolved blocking question |
