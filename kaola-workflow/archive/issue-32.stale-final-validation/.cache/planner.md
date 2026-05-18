# Planner Cache — issue-32

## Overview
Issue #30 introduced worktree-per-session isolation; issue #31 surfaced three orchestration-layer leaks. Targeted bug-fix: (1) teach Phase 6 to pass the linked worktree path into the prompt-driven doc-updater agent, (2) copy main-worktree phase artifacts into the linked worktree at the Phase 6 commit gate, (3) stop the walkthrough test from leaving untracked `proj-ac*/` directories in the repo and let `cmdSweep` prune synthetic test locks. No redesign of worktree provisioning, the locking model, or `cmdClaim`.

## Requirements
- doc-updater edits land in the linked worktree when one is active
- Phase 6 commit gate sees phase artifacts inside the linked worktree before `git add`
- `node scripts/simulate-workflow-walkthrough.js` exits 0 and leaves zero `kaola-workflow/proj-ac*/` paths in the repo root
- `cmdSweep` removes synthetic (non-UUID4) test locks; UUID4 session locks remain governed by existing 24h + remote-stale gates
- No regression in phases 1-5 (workflow-state.md continues to be written to main worktree by `cmdClaim`)

## Architecture Changes
- `commands/kaola-workflow-phase6.md` — Step 3 prelude resolves lock + injects `worktree_path` into doc-updater prompt; Step 8 prelude runs an artifact-mirror block before `git add`
- `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` — same two changes mirrored in the Codex skill copy
- `scripts/kaola-workflow-claim.js` — add `isSyntheticTestSession(lock)` predicate; gate past both `shouldSweep` and `isRemoteStale` inside `cmdSweep` (~line 1809-1810)
- `scripts/simulate-workflow-walkthrough.js` — add `cwd:` to three `spawnSync` calls (3994, 4010, 4018); add defensive cleanup of stray `kaola-workflow/proj-ac*/` in `finally`; add new test block covering `isSyntheticTestSession` semantics and sweep pruning

No changes to: `cmdClaim` (line 1383 stays), `shouldSweep` semantics, `worktreePathFor`, `provisionWorktree`, `removeWorktree`, agent invocation subsystem, UUID4 validation at claim time, lock schema.

---

## Implementation Steps

### Phase 1: Test scaffolding first (TDD - RED)

1. **Add synthetic-sweep failing test** (`scripts/simulate-workflow-walkthrough.js`)
   - Add new test block after 8N-task5.2 block (~line 4157). Create `.locks/proj-syn.lock` with `session_id: 'sess-synthetic'`, fresh timestamps, then run `sweep` with `KAOLA_WORKFLOW_OFFLINE=1` + `KAOLA_COORD_ROOT=tmp` and assert lock file is gone. Also create lock with real UUID4 SID and assert it is NOT removed.
   - Risk: Low

2. **Add `cwd: tmp` plus defensive cleanup** (`scripts/simulate-workflow-walkthrough.js`)
   - Add defensive `finally` cleanup in `main()`'s outer `finally` (~line 4344) that walks `process.cwd()` for `kaola-workflow/proj-ac*/` paths and removes them.
   - Add `cwd: tmp` to the three calls at lines 3994, 4010, 4018 (`cwd: coordRootAc8` for 4018).
   - Risk: Low

### Phase 2: Claim-script change (GREEN for Phase 1.1)

3. **Add `isSyntheticTestSession` predicate** (`scripts/kaola-workflow-claim.js`, after line 578)
   ```js
   const UUID4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
   function isSyntheticTestSession(lock) {
     return !lock || !lock.session_id || !UUID4_RE.test(String(lock.session_id));
   }
   ```
   - Risk: Low

4. **Gate both sweep predicates with synthetic check** (`scripts/kaola-workflow-claim.js`, ~line 1809-1810)
   - Replace two-line gate:
     ```js
     const synthetic = isSyntheticTestSession(lock);
     if (!synthetic && !shouldSweep(lock)) continue;
     if (!synthetic && !isRemoteStale(lock)) continue;
     ```
   - Risk: Medium (production behavior unchanged since real SIDs are UUID4)

### Phase 3: Phase 6 prompt edits (Gap 1 + Gap 2)

5. **Phase 6 Step 3 — worktree path injection into doc-updater prompt** (`commands/kaola-workflow-phase6.md`, before line 281)
   - Insert bash prelude resolving `ACTIVE_WORKTREE_PATH` from lock file, then embed path in doc-updater invocation prose.
   - Risk: Medium (relies on doc-updater honoring absolute-path directive)

6. **Phase 6 Step 8 — artifact-mirror prelude before `git add`** (`commands/kaola-workflow-phase6.md`, between cross-session guard and `git add`)
   - Mirror `kaola-workflow/${KAOLA_PROJECT}/` from main worktree to linked worktree via `cp -R` after lease check, before `git add`.
   - Policy: overwrite — main worktree is source of truth for Phase 1-5 artifacts.
   - Risk: Medium-High (mitigated: runs after cross-session lease check, fails loudly)

7. **Mirror Steps 5 and 6 into SKILL.md** (`plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md`)
   - Apply same Step 3 prelude and Step 8 mirror to Codex skill.
   - Risk: Low (copy-paste with `KAOLA_WORKTREE_PATH` already available)

### Phase 4: Verify and close

8. **Run walkthrough** — `node scripts/simulate-workflow-walkthrough.js` exits 0, no stray proj-ac* dirs
9. **Manual Phase 6 dry-run (out-of-band)** — Gaps 1 and 2 have no automated end-to-end coverage; recommend manual rehearsal with `KAOLA_WORKTREE_PATH` set before merging.

---

## Testing Strategy

**Automated (added in this PR):**
- `isSyntheticTestSession` + `cmdSweep` synthetic-prune behavior — new walkthrough block
- `cwd:` fix for AC3/AC7/AC8 — verified by post-run `ls kaola-workflow/proj-ac*` check or explicit assertion
- Defensive `process.cwd()` cleanup — verified by outer `finally`

**Manual (gap):**
- Gap 1: Phase 6 dry-run verifying doc-updater edits at `${worktree_path}/...`
- Gap 2: Phase 6 dry-run verifying `kaola-workflow/<project>/` staged from linked worktree

---

## Risks & Mitigations

- **doc-updater ignores absolute-path directive**: Gap 2's mirror is a forward-safety net for artifacts, but doc files (README, CHANGELOG) outside `kaola-workflow/{project}/` won't be mirrored. Recommend Step 8 sanity check in follow-up.
- **Step 8 mirror clobbers Phase 6 edit in linked worktree**: Mirror runs at end of Phase 6 (after all artifact writes). Add inline comment warning against reordering.
- **Synthetic-sweep predicate matches malformed real lock**: Correct behavior — non-UUID4 SID in production is itself a bug. Document predicate intent.
- **`cwd:` change alters AC3/AC7 test semantics**: Assertions check `r.status` only, no path-relative reads — safe.

---

## Items NOT to Build
- Do NOT modify `cmdClaim` (line 1383)
- Do NOT change `shouldSweep` semantics
- Do NOT add UUID4 validation at claim/write time elsewhere
- Do NOT redesign agent invocation or modify `doc-updater.toml`
- Do NOT change worktree provisioning/teardown
- Do NOT use rsync, symlinks, or hardlinks in mirror
- Do NOT alter lock schema

---

## Missing Facts
1. Whether any production code path writes non-UUID4 SID (grep needed before merge)
2. Whether doc-updater honors absolute-path directives in prompts (manual rehearsal needed)
3. Whether Phase 6 has cross-worktree git ops after mirror (confirm CWD never reverts)
4. Whether `--print-coord-root` flag exists on claim.js (if not, use `git rev-parse --git-common-dir`)

---

## Success Criteria
- [ ] `node scripts/simulate-workflow-walkthrough.js` exits 0 with "Workflow walkthrough simulation passed"
- [ ] After walkthrough run, `ls kaola-workflow/proj-ac*/` from repo root returns nothing
- [ ] New synthetic-sweep test asserts UUID4-preserve and synthetic-prune
- [ ] Both Phase 6 files carry identical Step 3 prelude and Step 8 mirror
- [ ] Step 8 mirror runs AFTER cross-session lease guard, BEFORE `git add`
- [ ] No edits to `cmdClaim`, `shouldSweep`, `worktreePathFor`, or `doc-updater.toml`
