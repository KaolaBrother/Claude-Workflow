# Phase 2 - Ideation: issue-86

## Approaches Evaluated

### Option A: Single PR — three surgical edits
- Summary: Port all three GitHub safeguards to GitLab in one PR: cwdInside helper + CWD guard in cmdRelease, drift split in cmdStatus, two doc subsections in workflow-next.md command file.
- Pros: Same plugin, same test runner, all mechanical ports; reviewable as a unit; one branch, one merge.
- Cons: None significant — the three changes are independent in execution but logically cohesive.
- Risk: Low — each change mirrors proven GitHub code with no new design.
- Complexity: Small — no new files, no new dependencies.

### Option B: Per-gap PRs (rejected)
- Summary: One PR per gap (CWD guard, drift detection, doc subsections).
- Rejected because: all three gaps are in one plugin; splitting adds branch overhead without isolation benefit; mechanical ports with no competing design decisions.

## Advisor Findings

Advisor confirmed Option A is correct. Carry-forward specs for Phase 3:

1. **Freshness-block release snippet**: Step 0b in GitLab `workflow-next.md` exports only `KAOLA_WORKTREE_PATH` — inline-extract project from `$STARTUP_OUT` in the snippet; do NOT assume `$KAOLA_PROJECT`.
2. **`path` require check**: Confirm `path` is required in `kaola-gitlab-workflow-claim.js` before adding `cwdInside` (uses `path.sep`); add require to write set if missing.
3. **Drift test**: Use `withForge({viewIssue: (iid) => ({state: 'closed'})}, ...)` pattern; active folder must have `issue_iid` that stub covers.
4. **CWD guard test**: spawnSync release with `cwd: folder.project_dir`; assert exit 1 + `{released:false, reason:'refusing to discard current working directory'}`.

## Selected Approach

**Option A — Single PR, three surgical edits.**

Rationale: one plugin, all mechanical, proven patterns to mirror. Per-gap splitting would be churn with no quality benefit.

## Out of Scope (explicit)

- Do NOT modify GitHub `scripts/kaola-workflow-claim.js`
- Do NOT extract `cwdInside` into a shared module
- Do NOT add freshness block recovery to SKILL.md (already present at lines 152-168)
- Do NOT modify `kaola-gitlab-workflow-active-folders.js`
- Do NOT add CWD guard to cmdFinalize
- Do NOT auto-archive drift folders in cmdStatus
- Do NOT change GitLab SKILL.md `PICK_NEXT_PROJECT` variable name

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
