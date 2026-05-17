# Code Architect: issue-45

## Design Decisions

- Option B (three-phase risk-stratified commits) from phase2-ideation.md: each phase independently committable with passing tests.
- 9 individual fixes map to 7 regression test cases (17P–17V). Flaw 1b + Gap C share one fixture (both edit cmdWorktreeStatus); Flaw 3 + KAOLA_WORKTREE_PATH share one fixture (both verify worktree_path propagation).
- Plugin mirror constraint is global: every edit to `scripts/kaola-workflow-claim.js` must simultaneously apply to `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` (byte-identical). Same for test file mirror. This applies universally across all tasks.
- No new JS modules, no new external npm dependencies.
- `target_mismatch` branch in `cmdStartup` (lines 1344–1368) is a NO-WRITE site per issue-44 constraint.

---

## Files to Create

None. All changes are inline edits to existing files.

---

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `scripts/kaola-workflow-claim.js` | Flaws 1a, 1b, 2, 3; Gaps A, B, C | P0 |
| `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` | Byte-identical mirror of all claim.js edits | P0 |
| `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` | Flaw 4: move SINK_KIND/SINK_BRANCH capture before cmdFinalize call | P0 |
| `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` | KAOLA_WORKTREE_PATH extraction and export | P1 |
| `scripts/simulate-workflow-walkthrough.js` | Add tests 17P–17V after existing 17O block (~line 5122) | P0 |
| `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | Byte-identical mirror of test additions | P0 |

---

## Data Flow

**Flaw 1a (cmdStatus):** `gh issue view` JSON response extended with `state` field. When `state === 'CLOSED'`, push `'issue closed'` into `drift` array, making `consistent` meaningful for closed issues.

**Flaw 1b (cmdWorktreeStatus):** Each entry already contains `issue_data` with `state`. Fix annotates each entry with `closed: issue_data?.state === 'CLOSED'` before serialisation.

**Flaw 2 (scanPhaseArtifacts):** The `PHASE_ARTIFACTS` find loop locates `phase4-progress.md`. When that entry matches, the file is read and checked for pending/in-progress task table rows using regex `/\|\s*(pending|in[_-]progress)\s*\|/i`. Returns phase4 command if rows remain, phase5 command if all done.

**Flaw 3 (cmdStartup worktree_path):** After the `claimExplicitTarget` call succeeds (acquired branch) and after `ownedActiveProject` short-circuit succeeds (owned branch), the lock file at `coordRoot/kaola-workflow/.locks/{project}.lock.json` is read to extract `worktree_path`. Value is included in receipt passed to `writeStartupReceipt`. The `target_mismatch` branch (lines 1344–1368) is not touched.

**Flaw 4 (finalize SKILL.md):** `SINK_KIND` and `SINK_BRANCH` shell variable assignments moved from after `cmdFinalize` invocation (~line 217–219) to before it (~line 176), reading from `workflow-state.md` while still at original path.

**Gap A (removeWorktree):** After `git worktree remove --force` succeeds (~line 658), call `fs.rmdirSync(path.dirname(wtPath))` in a catch-all try block. `rmdirSync` raises `ENOTEMPTY` if siblings exist — natural guard.

**Gap B (cmdSweep):** Third pass after existing second pass (~line 2148). Iterates all `*.kw/` parent dirs, lists `.abandoned-*` subdirs, parses ISO timestamp from suffix, computes age, calls `fs.rmSync` recursively when age > `GC_CUTOFF_MS`. Falls back to `fs.statSync(dir).mtimeMs` if suffix parse fails.

**Gap C (cmdWorktreeStatus):** Second pass after entries array is built (~line 2585). Reads `*.kw/` parent dir, lists `issue-\d+` and `.abandoned-*` subdirs, compares via `fs.realpathSync`, appends unregistered dirs with `{ worktree_path, registered: false, abandoned: ... }`.

**KAOLA_WORKTREE_PATH (SKILL.md):** After `PICK_NEXT_PROJECT` extraction (~line 59), shell snippet reads `worktree_path` from `$STARTUP_OUT` via `node -e` inline. If non-empty, exports `KAOLA_WORKTREE_PATH`.

---

## Build Sequence

### Phase 1 — Low-risk flag additions and SKILL.md capture fix

All four items in Phase 1 have disjoint write sets and can be implemented in parallel.

**Task P1-A — Flaw 1a: cmdStatus closed-issue drift**
- File: `scripts/kaola-workflow-claim.js`
- Function: `cmdStatus`, lines 2151–2193
- Change: Extend `--json` argument from `'assignees,labels'` to `'assignees,labels,state'`. After parsing `data`, when `data.state === 'CLOSED'`, push `'issue closed'` into the `drift` array alongside existing drift checks at lines 2183–2188.
- Test ID: 17P
- Parallel group: Phase 1 (all four disjoint)
- Depends on: nothing

**Task P1-B — Flaw 1b: cmdWorktreeStatus closed annotation**
- File: `scripts/kaola-workflow-claim.js`
- Function: `cmdWorktreeStatus`, lines 2548–2588
- Change: In the `entries.push(...)` call at line 2584, extend entry with `closed: issue_data?.state === 'CLOSED'`. (`issue_data` already fetches `state` in its `--json` fields list at line 2578.)
- Test ID: 17Q (shared with Gap C)
- Parallel group: Phase 1 (all four disjoint)
- Depends on: nothing (Gap C in Phase 2 depends on this)

**Task P1-C — Flaw 4: finalize SKILL.md sink metadata capture order**
- File: `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md`
- Location: lines ~171–219
- Change: Move `SINK_KIND` and `SINK_BRANCH` shell variable assignments (currently lines ~217–219) to BEFORE the `cmdFinalize` invocation block at ~line 176, while `workflow-state.md` still exists at original path.
- Test ID: 17S (static assertion on SKILL.md line ordering)
- Parallel group: Phase 1 (all four disjoint)
- Depends on: nothing

**Task P1-D — Gap A: removeWorktree parent *.kw/ dir cleanup**
- File: `scripts/kaola-workflow-claim.js`
- Function: `removeWorktree`, lines 624–680
- Change: After `execFileSync('git', ['worktree', 'remove', '--force', ...])` succeeds at ~line 658, add `try { fs.rmdirSync(path.dirname(wtPath)); } catch (_) {}`. `ENOTEMPTY` when siblings remain is silently swallowed — natural guard.
- Test ID: 17T
- Parallel group: Phase 1 (all four disjoint)
- Depends on: nothing

### Phase 2 — State-inspection logic changes

**Task P2-A — Flaw 2: scanPhaseArtifacts phase4 → phase conditional advance**
- File: `scripts/kaola-workflow-claim.js`
- Function: `scanPhaseArtifacts`, lines 2493–2506
- Change: When `found.file === 'phase4-progress.md'`, read the file and test against `/\|\s*(pending|in[_-]progress)\s*\|/i`. If any match, set `nextCommand` to phase4 command; otherwise keep phase5.
- Test ID: 17R
- Parallel group: Phase 2 (parallel with P2-B, P2-C)
- Depends on: nothing from Phase 1

**Task P2-B — Gap B: cmdSweep abandoned dir GC third pass**
- File: `scripts/kaola-workflow-claim.js`
- Function: `cmdSweep`, after line 2148
- Change: Add third pass after second-pass closing brace. Use `worktreePathFor(root, '')` to derive `*.kw/` parent. List `.abandoned-*` subdirs. Parse ISO timestamp from suffix (format `.abandoned-YYYY-MM-DDTHH-MM-SS-mmmZ`). If parse fails, fall back to `fs.statSync(dir).mtimeMs`. Remove recursively when age > `GC_CUTOFF_MS`.
- Test ID: 17U
- Parallel group: Phase 2 (parallel with P2-A, P2-C)
- Depends on: nothing from Phase 1

**Task P2-C — Gap C: cmdWorktreeStatus unregistered dirs second pass**
- File: `scripts/kaola-workflow-claim.js`
- Function: `cmdWorktreeStatus`, after line 2585
- Change: After entries array populated, derive `*.kw/` parent via `worktreePathFor`. List `issue-\d+` and `.abandoned-*` subdirs. Compare via `fs.realpathSync`. Push unregistered dirs with `{ worktree_path, registered: false, abandoned: dir.name.startsWith('.abandoned-'), closed: false }`.
- Test ID: 17Q (shared with Flaw 1b)
- Parallel group: Phase 2 (parallel with P2-A, P2-B)
- Depends on: Phase 1 / P1-B (entry shape established first)

### Phase 3 — Startup receipt + SKILL.md env export

**Task P3-A — Flaw 3: cmdStartup worktree_path in owned and acquired receipts**
- File: `scripts/kaola-workflow-claim.js`
- Function: `cmdStartup`, two write sites
  - Site 1 — owned branch (~line 1378): Before `writeStartupReceipt`, read lock file at `lockPath(coordRoot, owned.project)`, extract `lockData.worktree_path || null`, add to receipt data.
  - Site 2 — acquired branch (~line 1444): After `claimExplicitTarget` returns acquired, read lock file at `lockPath(coordRoot, targetResult.project)`, extract `lockData.worktree_path || null`, add to receipt data.
- NO-WRITE invariant: `target_mismatch` branch (lines 1344–1368) is NOT touched.
- Test ID: 17V
- Parallel group: Phase 3 (only task, P3-B disjoint write set so can overlap)
- Depends on: Phase 1 and Phase 2 committed

**Task P3-B — KAOLA_WORKTREE_PATH: kaola-workflow-next SKILL.md extraction**
- File: `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md`
- Location: after `PICK_NEXT_PROJECT` extraction (~line 59–63)
- Change: Add:
  ```bash
  KAOLA_WORKTREE_PATH="$(node -e "try{process.stdout.write(JSON.parse(process.argv[1]).worktree_path||'')}catch(e){}" "$STARTUP_OUT" 2>/dev/null)" || true
  [ -n "$KAOLA_WORKTREE_PATH" ] && export KAOLA_WORKTREE_PATH
  ```
  Must appear in both the `KAOLA_WORKTREE_NATIVE=1` branch and the fallback `startup` branch.
- Test ID: 17V (shared with Flaw 3)
- Parallel group: Phase 3 (disjoint from P3-A)
- Depends on: P3-A (receipt must contain worktree_path before shell can read it)

---

## Tests (17P–17V)

All tests appended after existing 17N/17O block in `scripts/simulate-workflow-walkthrough.js`, then mirrored byte-identically to plugin test file.

| Test ID | Fix | Description |
|---------|-----|-------------|
| 17P | Flaw 1a | `cmdStatus` with CLOSED issue → `drift` contains `'issue closed'` |
| 17Q | Flaw 1b + Gap C | `cmdWorktreeStatus` CLOSED issue → `closed: true`; unregistered subdir → `registered: false` |
| 17R+ | Flaw 2 | `scanPhaseArtifacts` with pending phase4 row → routes to phase4 command |
| 17R- | Flaw 2 | `scanPhaseArtifacts` with all-complete phase4 rows → routes to phase5 command |
| 17S | Flaw 4 | SKILL.md static assertion: `SINK_KIND=` line appears before `node "$CLAIM_JS" finalize` by index |
| 17T+ | Gap A | `removeWorktree` last sibling → parent `*.kw/` removed |
| 17T- | Gap A | `removeWorktree` with sibling remaining → parent `*.kw/` retained |
| 17U | Gap B | `cmdSweep` removes `.abandoned-<old-ISO>` dir, retains `.abandoned-<fresh-ISO>` dir |
| 17V | Flaw 3 | startup `acquired` receipt includes non-null `worktree_path` matching provisioned path |

---

## Validation Commands (after each phase commit)

```bash
node scripts/simulate-workflow-walkthrough.js
# must exit 0 with "Workflow walkthrough simulation passed"
```

---

## Absolute Paths

- Main claim script: `scripts/kaola-workflow-claim.js` (worktree root)
- Plugin mirror: `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
- Test file: `scripts/simulate-workflow-walkthrough.js`
- Test mirror: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- Finalize SKILL.md: `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md`
- Next SKILL.md: `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md`
- Mirror sync validator: `scripts/validate-script-sync.js`
