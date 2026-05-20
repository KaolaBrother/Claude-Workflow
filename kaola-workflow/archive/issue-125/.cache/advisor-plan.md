# Advisor Plan Gate — Issue #125

## Verdict: Blueprint sound. Collapse T1–T4 into one tdd-guide task. Proceed.

## Sharpening Notes

1. **Collapse Tasks 1–4 into one tdd-guide task.** Phase 4 delegates each task to `tdd-guide`, which naturally produces RED + GREEN evidence within a single task. Write set: `validate-kaola-workflow-gitlab-contracts.js` + `.claude-plugin/plugin.json`. RED: assertion present, plugin.json still `3.8.1` → `npm run test:kaola-workflow:gitlab` fails with the GitLab message. GREEN: bump plugin.json to `3.10.0` → same command passes.

2. **"After Task 1 is committed" is wrong.** Phase 4 doesn't make checkpoint commits. Say "after Task 1's edit is on disk" or just note the write sets are disjoint.

3. **Verify CHANGELOG structure before declaring Phase 4 done.** The architect assumes an existing `[Unreleased]` block with an `### Added` subsection. Check whether it has `### Added` or some other shape; adapt the bullet's placement to match what's there.

4. **Worktree path for Phase 4.** Implementation must happen in `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-125/`, not the main repo. Pass `Working directory: <worktree>` to `tdd-guide` so it edits the right tree.

5. **Verify before edit:** Read `README.md:350-370` in the worktree before editing to confirm `3.8.1` is still on lines 356-357 specifically (line numbers can drift).

## No blocking issues.
