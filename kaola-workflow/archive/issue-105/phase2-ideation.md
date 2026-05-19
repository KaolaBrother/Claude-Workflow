# Phase 2 - Ideation: issue-105

## Approaches Evaluated

### Option A: Loud guard inside `sink-merge.js` (Selected)
- Summary: After `git checkout args.branch` (post-checkout, pre-rebase), add `assertNoLiveWorkflowFolder(mainRoot, args.project)`. If `kaola-workflow/{project}/workflow-state.md` still exists in the main worktree, fail with exit 1 and remediation message pointing to `cmdFinalize`.
- Pros: Single chokepoint; cannot be bypassed by agent ordering mistakes; no PR-path interaction; fails before mutating main; easy to test.
- Cons: Only guards at sink time, not at commit time. Adds tree-content check to formerly pure git-plumbing script.
- Risk: Low
- Complexity: Small (~15 lines, two tests, one cleanup commit)

### Option B: Intent-signal hardening in pre-commit hook
- Summary: Export `KAOLA_SINK_KIND=merge` before Step 8 `git commit`; hook blocks live-folder staged files when that var is set.
- Pros: Catches bug at commit time (one step earlier).
- Cons: Couples hook to prose-based env-var contract. If orchestrator forgets the var, guard does nothing — same prose-only problem moved one layer down. Hook is shell; orchestrator state is markdown — fragile.
- Risk: Medium
- Complexity: Medium (two files + hook test + Phase 6 prose update)

### Option C: Move archive into `sink-merge.js` directly
- Summary: `sink-merge.js` detects live folder, calls `archiveProjectDir` itself, amends commit, proceeds.
- Pros: Transparent repair.
- Cons: Hides the bug; amending pushed commits is unsafe; conflates roles of sink-merge and cmdFinalize.
- Risk: High
- Complexity: Medium-high

## Advisor Findings
- Approach A approved. No missed approaches.
- **Critical addition**: Both tests are required (advisor flagged the planner's single-test proposal as incomplete for AC#3):
  - `testSinkMergeRefusesLiveFolder` (negative): guard fires on branch with live folder; assert non-zero exit, stderr substring, main SHA unchanged.
  - `testFastE2EMergeFullChain` (positive/E2E): `KAOLA_PATH=fast` startup → fast-summary PASSED → `worktree-finalize` → `finalize --keep-worktree` → `sink-merge` → assert `kaola-workflow/archive/issue-N/` on main and `kaola-workflow/issue-N/` absent.
- **Dirty state**: Pre-existing unstaged issue-101 deletions and untracked archive/ dirs must be resolved before Phase 4. Decision: include as AC#4 cleanup commit on this branch.
- **Phase 3 verification**: Confirm cwd vs mainRoot at guard call site (line ~243 of sink-merge.js). Confirm guard placement is AFTER `git checkout` and BEFORE FF merge.
- See `.cache/advisor-ideation.md` for full advisory.

## Selected Approach
**Option A: Loud guard in `sink-merge.js`** — converts the prose contract (Step 8b ordering) into a machine-enforced one without touching the pre-commit hook or PR path. Matches project principle "scripts own atomicity, not policy."

**Implementation scope (4 discrete changes):**
1. `scripts/kaola-workflow-sink-merge.js` — add `assertNoLiveWorkflowFolder(mainRoot, args.project)` after post-checkout, before rebase (~line 243)
2. `scripts/simulate-workflow-walkthrough.js` — add `testSinkMergeRefusesLiveFolder` AND `testFastE2EMergeFullChain`
3. `commands/kaola-workflow-phase6.md` lines 489–523 — append one sentence noting the sink-merge guard
4. AC#4 cleanup commit: stage pre-existing dirty state (issue-101 deletions + archive/ dirs) and remove `kaola-workflow/issue-100/` live folder

## Out of Scope (explicit)
- Pre-commit hook intent-signal (Approach B)
- Silent auto-archive in `sink-merge.js` (Approach C)
- Refactoring `archiveProjectDir` / `cmdFinalize`
- Generalizing guard to detect any orphan live folder (scope creep — only guard `args.project`)
- Adding `--force` escape hatch on the guard
- Blocking `status: active` in staged files in pre-commit hook (breaks PR path)

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
