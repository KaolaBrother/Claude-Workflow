# Phase 2 - Ideation: issue-32

## Approaches Evaluated

### Gap 1 — doc-updater worktree path

#### Option A: Prompt injection (hint)
- Summary: Before invoking doc-updater, read `worktree_path` from lock file and embed it as a working-directory directive in the doc-updater prompt
- Pros: Zero new code in claim.js; follows existing doc-updater prompt-only architecture
- Cons: doc-updater may ignore the directive — not verifiable without a live Phase 6 run
- Risk: Medium
- Complexity: Small

#### Option B: Broader mirror at Step 8 (guarantee)
- Summary: In Phase 6 Step 8, after artifact mirror, also copy any tracked-file changes in the main worktree (README, CHANGELOG, etc.) to the linked worktree using `git diff --name-only HEAD`
- Pros: Works regardless of doc-updater behavior; makes Gap 1 fully robust; reuses Step 8 mirror already needed for Gap 2
- Cons: Slightly more code; mirror runs after lease guard (correct ordering)
- Risk: Low (mitigated by pre-mirror check and explicit BLOCKED exit)
- Complexity: Small

#### Option C: CWD wrapper / env var injection
- Summary: Add a new env var or CWD parameter to doc-updater agent runtime
- Pros: Clean
- Cons: `doc-updater.toml` is prompt-only; requires modifying agent runtime infrastructure — out of scope
- Risk: High (requires redesign)
- Complexity: Large

**Selected for Gap 1:** Option A + Option B together — prompt injection is a best-effort hint; broader mirror at Step 8 is the guarantee. Per advisor: "Prompt injection becomes a best-effort hint; the mirror is the guarantee."

---

### Gap 2 — Phase artifacts in main worktree

#### Option A: Fix `cmdClaim` to write to linked worktree (line 1383)
- Summary: Change `cmdClaim` to detect linked worktree and write `workflow-state.md` there
- Pros: Root-cause fix
- Cons: Breaks phases 1-5 which expect `workflow-state.md` in main worktree during active work
- Risk: High
- Complexity: Medium

#### Option B: Phase 6 Step 8 artifact mirror (before `git add`)
- Summary: After cross-session lease guard, copy `kaola-workflow/{project}/` from main worktree to linked worktree before `git add`
- Pros: Preserves phases 1-5 semantics; overwrite policy is safe (main worktree is source of truth for phases 1-5); combined with Gap 1 broader mirror in same block
- Cons: Mirror happens at end of Phase 6; must run after all Phase 6 artifact writes (add inline comment warning)
- Risk: Medium (mitigated by pre-mirror linked-worktree clean-check, explicit BLOCKED exit on failure)
- Complexity: Small

**Selected for Gap 2:** Option B — the constraint "do not modify `cmdClaim`" is authoritative.

---

### Gap 3 — Test cleanup + synthetic session sweep

#### Sub-issue A: Missing `cwd:` on spawnSync

Option A: Add `cwd: tmp` to the three spawnSync calls at lines 3994, 4010, 4018 (primary fix)
Option B: Defensive `finally` cleanup in outer `main()` that removes stray `kaola-workflow/proj-ac*/` dirs (belt-and-suspenders)
**Selected:** Both — primary fix + defensive cleanup.

#### Sub-issue B: Synthetic session sweep

Option A: Modify `shouldSweep` to accept synthetic flag
- Cons: Changes semantics of a function the constraint says to leave alone
- Risk: High

Option B: Add new `isSyntheticTestSession(lock)` predicate, gate both `shouldSweep` AND `isRemoteStale` in `cmdSweep`
- Pros: Additive; `shouldSweep` unchanged; predicate is safe (UUID4 discriminator, all production SIDs from `crypto.randomUUID()`)
- Risk: Low
- Complexity: Small

**Selected for Sub-issue B:** Option B.

---

## Advisor Findings
Plan adopted. Key advisor addition: the "Gap 2 mirror covers Gap 1" claim was illusory because the mirror only handles `kaola-workflow/{project}/` but not doc files (README, CHANGELOG, .env.example). The fix: extend Step 8 mirror to also copy any `git diff --name-only HEAD` tracked changes from main to linked worktree, then verify with a sanity check. `--print-coord-root` flag confirmed absent — use `git rev-parse --git-common-dir` instead. Pre-mirror overwrite check added to prevent clobbering legitimate data on interrupted runs.

## Selected Approach

**TDD-ordered implementation across 4 scripts/files:**

1. **`scripts/simulate-workflow-walkthrough.js`** — (a) add `cwd: tmp` to spawnSync at lines 3994, 4010, 4018; (b) add defensive `finally` cleanup for stray `proj-ac*` dirs; (c) add new test block for synthetic-sweep predicate (assert synthetic-prune + UUID4-preserve)
2. **`scripts/kaola-workflow-claim.js`** — add `isSyntheticTestSession(lock)` predicate; gate both `shouldSweep` and `isRemoteStale` in `cmdSweep`
3. **`commands/kaola-workflow-phase6.md`** — Step 3: add lock-resolution prelude + doc-updater prompt injection; Step 8: add artifact mirror (project dir + broader tracked-file mirror) after lease guard, before `git add`
4. **`plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md`** — mirror identical Step 3 prelude and Step 8 mirror block

## Out of Scope (explicit)
- Do NOT modify `cmdClaim` (line 1383)
- Do NOT change `shouldSweep` semantics
- Do NOT add UUID4 validation at claim/write time elsewhere
- Do NOT redesign doc-updater, modify `doc-updater.toml`, or add new agent env vars
- Do NOT change worktree provisioning/teardown (`provisionWorktree`, `removeWorktree`, `worktreePathFor`)
- Do NOT use rsync, symlinks, or hardlinks in the mirror step
- Do NOT alter the lock file schema
- Do NOT add E2E test coverage for Gap 1 or Gap 2 (no infra to spawn real worktree + subagent in-test)

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
