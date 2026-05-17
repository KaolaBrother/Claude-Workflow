# Phase 3 - Plan: issue-45

## Blueprint

### Files to Create
None. All changes are inline edits to existing files.

### Files to Modify

| File | Changes | Why |
|------|---------|-----|
| `scripts/kaola-workflow-claim.js` | Flaws 1a, 1b, 2, 3; Gaps A, B, C | All claim-side runtime fixes |
| `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` | Byte-identical mirror of all claim.js edits | Plugin mirror invariant |
| `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` | Flaw 4: move SINK_KIND/SINK_BRANCH capture | Read before archive renames path |
| `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` | KAOLA_WORKTREE_PATH extraction + export | Populate env var all phase skills consume |
| `scripts/simulate-workflow-walkthrough.js` | Tests 17P–17V (after existing 17O block ~line 5122) | Regression coverage |
| `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | Byte-identical mirror of test additions | Plugin test mirror |
| `CHANGELOG.md` | Add [Unreleased] entry for issue-45 fixes | CLAUDE.md doc checklist |

### Plugin Mirror Hard Rule

**Every commit touching `scripts/kaola-workflow-claim.js` MUST also update `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` in the same commit.** `scripts/validate-script-sync.js` must pass after every commit. This applies universally — not repeated per task.

### Build Sequence

1. Phase 1 tasks (P1-A, P1-B, P1-C, P1-D) — disjoint write sets, all parallel
2. Phase 2 tasks (P2-A, P2-B, P2-C) — P2-C depends on P1-B entry shape; P2-A and P2-B independent
3. Phase 3 tasks (P3-A first, then P3-B) — P3-B depends on P3-A (receipt must have worktree_path before shell reads it)
4. Tests 17P–17V — can be woven into each phase or batched at end; must be committed with the fix they cover

### Parallelization Plan

| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| Phase 1 | P1-A, P1-B, P1-C, P1-D | Disjoint functions in claim.js; different SKILL.md file |
| Phase 2 | P2-A, P2-B | Disjoint functions; no shared read/write |
| Phase 2 serial | P2-C after P2-B completes | P2-C builds on entry shape from P1-B; safe to parallel with P2-A |
| Phase 3 | P3-A, then P3-B | P3-B reads receipt produced by P3-A's JS change |

### External Dependencies
None. All changes use existing Node.js built-ins (`fs`, `path`) and existing `lockPath`, `worktreePathFor`, `readJsonFile` helpers already present in claim.js.

---

## Task List

### Phase 1 — Low-Risk Additive Fixes

---

### Task P1-A: Flaw 1a — cmdStatus closed-issue drift
- File: `scripts/kaola-workflow-claim.js`
- Function: `cmdStatus`, ~lines 2151–2193
- Write Set: `scripts/kaola-workflow-claim.js`, `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
- Depends On: none
- Parallel Group: Phase 1 (with P1-B, P1-C, P1-D)
- Action: MODIFY
- Implement:
  1. At the `gh issue view ... --json` call (~line 2170), change the `--json` fields from `'assignees,labels'` to `'assignees,labels,state'`
  2. After parsing the JSON result into `data`, add: if `data.state === 'CLOSED'`, push the string `'issue closed'` into the `drift` array (alongside existing drift checks at ~lines 2183–2188)
- Mirror: `cmdWatchPr` closed-issue handling at ~lines 2273–2281 (checks `state === 'CLOSED'`)
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task P1-B: Flaw 1b — cmdWorktreeStatus closed annotation
- File: `scripts/kaola-workflow-claim.js`
- Function: `cmdWorktreeStatus`, ~lines 2548–2588
- Write Set: `scripts/kaola-workflow-claim.js`, `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
- Depends On: none (P2-C depends on this entry shape)
- Parallel Group: Phase 1
- Action: MODIFY
- Implement:
  1. In the `entries.push(...)` call at ~line 2584, extend the entry object with field `closed: issue_data?.state === 'CLOSED'`
  2. Note: `issue_data` is fetched at ~line 2578 — verify its `--json` fields include `state` (if not, add it there too)
- Mirror: Flaw 1a pattern (cmdStatus now fetches and checks `state` field)
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task P1-C: Flaw 4 — finalize SKILL.md sink metadata capture order
- File: `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md`
- Location: lines ~171–219
- Write Set: `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md`
- Depends On: none
- Parallel Group: Phase 1
- Action: MODIFY
- Implement:
  1. Find the `SINK_KIND=$(...)` and `SINK_BRANCH=$(...)` shell lines (currently at ~lines 217–219) that read from `kaola-workflow/${KAOLA_PROJECT}/workflow-state.md`
  2. Move those two lines to BEFORE the `(cd "$ACTIVE_WORKTREE_PATH" && node "$CLAIM_JS" finalize ...)` block at ~line 176
  3. At their new location, `workflow-state.md` still exists at original path; at their old location (after cmdFinalize), `archiveProjectDir` has renamed the path away
- Mirror: `ACTIVE_WORKTREE_PATH` resolution at lines ~150–155 reads workflow-state.md before finalize
- Validate: `node scripts/simulate-workflow-walkthrough.js` (test 17S: static assertion that `SINK_KIND=` line index < `cmdFinalize` call line index)

### Task P1-D: Gap A — removeWorktree parent *.kw/ cleanup
- File: `scripts/kaola-workflow-claim.js`
- Function: `removeWorktree`, ~lines 624–680
- Write Set: `scripts/kaola-workflow-claim.js`, `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
- Depends On: none
- Parallel Group: Phase 1
- Action: MODIFY
- Implement:
  1. After the `execFileSync('git', ['worktree', 'remove', '--force', ...])` call succeeds at ~line 658, add:
     ```js
     try { fs.rmdirSync(path.dirname(wtPath)); } catch (_) {}
     ```
  2. `rmdirSync` throws `ENOTEMPTY` when sibling worktrees remain — silently swallowed in catch — natural guard. No conditional needed.
  3. `wtPath` is already in scope (defined earlier in this function)
- Mirror: `provisionWorktree` at line 594 creates `path.dirname(wtPath)` — symmetric cleanup
- Validate: `node scripts/simulate-workflow-walkthrough.js`

---

### Phase 2 — New Parsers and Scan Passes

---

### Task P2-A: Flaw 2 — scanPhaseArtifacts conditional phase4→phase5 advance
- File: `scripts/kaola-workflow-claim.js`
- Function: `scanPhaseArtifacts`, ~lines 2493–2506
- Write Set: `scripts/kaola-workflow-claim.js`, `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
- Depends On: none from Phase 1
- Parallel Group: Phase 2 (with P2-B; P2-C is serial after)
- Action: MODIFY
- Implement:
  1. In path 2 fallback (lines ~2493–2506), after `PHASE_ARTIFACTS.find(...)` returns the entry with `file === 'phase4-progress.md'`:
  2. Read the file: `const content = fs.readFileSync(path.join(projectDir, 'phase4-progress.md'), 'utf8')`
  3. Check: `const hasIncomplete = /\|\s*(pending|in[_-]progress)\s*\|/i.test(content)`
  4. If `hasIncomplete`, override `nextCommand` to the phase4 command (`'/kaola-workflow-phase4 ' + project`)
  5. Otherwise, keep `nextCommand` as `found.next` (phase5)
  6. Wrap the file read in try/catch — treat ENOENT as "file missing, can't parse, fall back to existing behavior"
- Mirror: `kaola-workflow-repair-state.js` test pattern at lines 268–296 of simulate-walkthrough.js
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task P2-B: Gap B — cmdSweep abandoned dir GC third pass
- File: `scripts/kaola-workflow-claim.js`
- Function: `cmdSweep`, after ~line 2148 (end of second pass)
- Write Set: `scripts/kaola-workflow-claim.js`, `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
- Depends On: none from Phase 1
- Parallel Group: Phase 2 (with P2-A)
- Action: MODIFY
- Implement:
  1. After the closing brace of the second-pass loop at ~line 2148, add a third pass:
  2. Compute `*.kw/` parent dir: `const kwParent = worktreePathFor(root, '')` — verified to return `{repo}.kw` dir
  3. If `kwParent` dir doesn't exist, skip this pass (ENOENT safe)
  4. List entries: `fs.readdirSync(kwParent, { withFileTypes: true })`, filter for directories whose name matches `/^\.abandoned-/`
  5. For each abandoned dir, parse the ISO timestamp from the suffix:
     - Suffix format: `.abandoned-YYYY-MM-DDTHH-MM-SS-mmmZ` (as written by `removeWorktree` at line 667: `.toISOString().replace(/[:.]/g, '-')`)
     - Parse: extract the timestamp portion after `.abandoned-`, reverse the replacements: `s.replace(/-(\d{2})-(\d{2})-(\d{3})Z$/, ':$1:$2.$3Z')`, then `new Date(parsed).getTime()`
     - If parse fails or returns NaN, fall back to `fs.statSync(fullPath).mtimeMs`
  6. If `Date.now() - abandonedAt > GC_CUTOFF_MS` (already defined at ~line 2124), call `fs.rmSync(fullPath, { recursive: true, force: true })` in try/catch
  7. Wrap entire third pass in try/catch for ENOENT on `kwParent`
- Mirror: Second pass pattern at lines 2123–2148 (similar dir-listing + age-check structure)
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task P2-C: Gap C — cmdWorktreeStatus unregistered dirs second pass
- File: `scripts/kaola-workflow-claim.js`
- Function: `cmdWorktreeStatus`, after ~line 2585
- Write Set: `scripts/kaola-workflow-claim.js`, `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
- Depends On: P1-B (entry shape must include `closed` field before extending it)
- Parallel Group: Phase 2 (serial after P1-B; can parallel with P2-A, P2-B)
- Action: MODIFY
- Implement:
  1. After the `entries.push(...)` call at ~line 2584 (end of the git-worktree-list loop), add a second pass:
  2. Compute `*.kw/` parent: `const kwParent = worktreePathFor(root, '')`
  3. If `kwParent` doesn't exist, skip (ENOENT)
  4. List entries: `fs.readdirSync(kwParent, { withFileTypes: true })`, filter for dirs matching `/^issue-\d+$|^\.abandoned-/`
  5. Build a Set of canonical paths already registered: `const registeredPaths = new Set(entries.map(e => { try { return fs.realpathSync(e.worktree_path); } catch (_) { return e.worktree_path; } }))`
  6. For each candidate dir, `const candidateFull = path.join(kwParent, dir.name)`, `const canonical = fs.realpathSync(candidateFull)` (with catch)
  7. If `!registeredPaths.has(canonical)`, push: `{ worktree_path: candidateFull, branch: null, head: null, issue: null, issue_data: null, registered: false, abandoned: dir.name.startsWith('.abandoned-'), closed: false }`
  8. Wrap in try/catch for ENOENT
- Mirror: `cmdSweep` second pass pattern at lines 2123–2148 (dir listing with try/catch)
- Validate: `node scripts/simulate-workflow-walkthrough.js`

---

### Phase 3 — Critical Claim Path + SKILL.md

---

### Task P3-A: Flaw 3 — cmdStartup worktree_path in owned and acquired receipts
- File: `scripts/kaola-workflow-claim.js`
- Function: `cmdStartup`, two write sites
- Write Set: `scripts/kaola-workflow-claim.js`, `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
- Depends On: Phase 1 and Phase 2 fully committed
- Parallel Group: Phase 3 (P3-B is disjoint write set, can overlap after this task's JS is done)
- Action: MODIFY
- Implement:
  - **Site 1 — owned branch (~line 1378):**
    1. Before the `writeStartupReceipt(coordRoot, args.session, {...})` call at ~line 1378
    2. Add: `let ownedWtPath = null; try { const lk = JSON.parse(fs.readFileSync(lockPath(coordRoot, owned.project), 'utf8')); ownedWtPath = lk.worktree_path || null; } catch (_) {}`
    3. Add `worktree_path: ownedWtPath` to the receipt object at the same level as `project`, `issue`, etc.
  - **Site 2 — acquired branch (~line 1444):**
    1. Before the `writeStartupReceipt(coordRoot, args.session, {...})` call at ~line 1444
    2. Add: `let acqWtPath = null; try { const lk = JSON.parse(fs.readFileSync(lockPath(coordRoot, targetResult.project), 'utf8')); acqWtPath = lk.worktree_path || null; } catch (_) {}`
    3. Add `worktree_path: acqWtPath` to the receipt object
  - **target_mismatch branch (~lines 1421–1441):** Add comment only (no code change):
    `// issue-44: target_mismatch — claim is 'none'; worktree_path is NOT added to this receipt (NO-WRITE invariant)`
- Mirror: `cmdPickNext` already includes `worktree_path` in its stdout (claim.js:2441); this fix makes startup consistent with it
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task P3-B: Flaw 3 / KAOLA_WORKTREE_PATH — kaola-workflow-next SKILL.md export
- File: `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md`
- Location: after `PICK_NEXT_PROJECT` extraction lines (~line 59–63)
- Write Set: `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md`
- Depends On: P3-A (receipt must have `worktree_path` field before shell can read it)
- Parallel Group: Phase 3 (disjoint write set from P3-A, so can be implemented in parallel if P3-A JS side is done)
- Action: MODIFY
- Implement:
  1. Find the `PICK_NEXT_PROJECT` extraction block (~lines 58–63) in both the `KAOLA_WORKTREE_NATIVE=1` branch and the fallback `startup` branch
  2. After the `PICK_NEXT_PROJECT` line in each branch, add:
     ```bash
     KAOLA_WORKTREE_PATH="$(node -e "try{process.stdout.write(JSON.parse(process.argv[1]).worktree_path||'')}catch(e){}" "$STARTUP_OUT" 2>/dev/null)" || true
     [ -n "$KAOLA_WORKTREE_PATH" ] && export KAOLA_WORKTREE_PATH
     ```
  3. Must appear in BOTH acquisition paths (KAOLA_WORKTREE_NATIVE=1 and fallback startup)
- Mirror: `PICK_NEXT_VERDICT` and `PICK_NEXT_PROJECT` extraction pattern (same `node -e` inline parse)
- Validate: Visual inspection (shell env export pattern); integration verified via 17V test

---

### Tests — Regression Suite 17P–17V

All tests appended after existing 17N/17O block in Epic 17 (~line 5122) of `scripts/simulate-workflow-walkthrough.js`, then mirrored byte-identically to `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`.

Framework: hand-rolled `assert(condition, message)` at line 27. Pattern: same `execFileSync` spawn + JSON.parse used in 17D/17E.

| Test ID | Fix | Description | Fixture |
|---------|-----|-------------|---------|
| 17P | Flaw 1a | `cmdStatus` with CLOSED issue → `drift` contains `'issue closed'`; `consistent: false` | Extend gh shim in env17 to return `state:"CLOSED"`; run `status`; parse JSON |
| 17Q1 | Flaw 1b | `cmdWorktreeStatus` with CLOSED issue → each entry has `closed: true` | Use env17 with gh shim returning `state:"CLOSED"` |
| 17Q2 | Gap C | `cmdWorktreeStatus` with extra unregistered subdir in `.kw/` → entry with `registered: false` | Manually create `epic17Tmp.kw/issue-888` dir not registered in git; run worktree-status |
| 17R+ | Flaw 2 | `resume` with `phase4-progress.md` containing `\| pending \|` row → `next_command` includes `phase4` | Write phase4-progress.md with in_progress row; run `resume --project proj17 --session sess17`; parse JSON |
| 17R- | Flaw 2 | `resume` with `phase4-progress.md` all-complete → `next_command` includes `phase5` | Same fixture, mark all rows `done`; assert phase5 |
| 17S | Flaw 4 | Static: `SINK_KIND=` line appears before `node "$CLAIM_JS" finalize` by index in SKILL.md | `fs.readFileSync` on finalize SKILL.md; compare line indices |
| 17T+ | Gap A | `removeWorktree` last worktree in `.kw/` → parent dir removed | Provision one worktree; release it; assert `path.dirname(wtPath)` does not exist |
| 17T- | Gap A | `removeWorktree` with sibling remaining → parent dir retained | Provision two worktrees; release one; assert parent dir still exists |
| 17U | Gap B | `cmdSweep` removes `.abandoned-<old-ISO>` dir; retains `.abandoned-<fresh-ISO>` dir | Create two abandoned dirs: one with ISO suffix >30min ago, one <30min; run sweep; assert old removed, fresh retained. Add inline parse assertion: parse the old-ISO suffix and assert the round-trip value is > `Date.now() - GC_CUTOFF_MS * 2` |
| 17V | Flaw 3 | `startup` or `pick-next` with `--target-issue N` → receipt JSON has non-null `worktree_path` matching provisioned path | Run startup with valid target; parse receipt; assert `receipt.worktree_path === pick17.worktree_path` |

---

## Advisor Notes

1. **Lock field `worktree_path` confirmed**: written at claim.js:1595, read via `readJsonFile(lockPath(coordRoot, project))`. Field name is `worktree_path`.
2. **`worktreePathFor(root, '')` confirmed**: Node.js `path.join` with empty string returns the parent `.kw/` dir.
3. **17R via `resume` subcommand**: same spawn pattern as 17D/17E (lines 4917–4935).
4. **17Q split**: 17Q1 (Flaw 1b, closed annotation) and 17Q2 (Gap C, unregistered dir) have separate fixtures.
5. **17T both polarities**: 17T+ (parent removed) and 17T- (sibling guard — parent retained).
6. **Plugin mirror hard rule**: stated globally, enforced by `validate-script-sync.js`.
7. **17U ISO round-trip assertion**: inline assertion before sweep run validates the timestamp parser.
8. **target_mismatch comment**: comment-only at ~lines 1421–1441 citing issue-44.
9. **CHANGELOG.md**: add `[Unreleased]` entry in Phase 3 final commit.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | No gaps found requiring revision loop | Advisor sharpening only; no blueprint gaps |
