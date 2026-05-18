# Advisor Ideation Gate — Issue #86

## Overall Verdict

Plan is sound. Proceed to Phase 3.

## Carry-Forward Specs for Phase 3 Architect

### 1. Freshness-block release snippet — inline extract required

Step 0b in `plugins/kaola-workflow-gitlab/commands/workflow-next.md` exports only
`KAOLA_WORKTREE_PATH`. The freshness-block release command must inline-extract project
from `$STARTUP_OUT` using the `node -e "try{...JSON.parse...}catch(e){}"` pattern.
Do NOT reference `$KAOLA_PROJECT` or `$KAOLA_CLAIM` — they are not exported there.
This must be explicit in the architect's text, not just acknowledged.

### 2. `path` require check for cwdInside

Verify `path` is required at the top of `kaola-gitlab-workflow-claim.js` before
Task 1 in Phase 4. `cwdInside` uses `path.sep`. If not present, list it explicitly
in the write set.

### 3. Drift test setup

The active folder must be created with an `issue_iid` value that the `viewIssue`
stub will return `state: 'closed'` for. Closed check is lowercase `'closed'` (verified
at line 40 of active-folders.js). Use `withForge({viewIssue: (iid) => ({state: 'closed'})}, ...)`.
Mirror existing stub pattern at lines 246/259/275/305 of test file.

### 4. CWD guard test

Call spawnSync release subcommand with `cwd: folder.project_dir`. Assert exit code 1
and `{released: false, reason: 'refusing to discard current working directory'}`.

## Alternative Approaches Noted

Planner listed only Option A (single PR). Per-gap PRs were implicitly considered;
single PR is correct — all three gaps are in one plugin, mechanical ports of proven
code, no isolation benefit to splitting. Note rejection in phase2-ideation.md.

## Blockers

None.
