# Phase 3 - Plan: issue-125

## Blueprint

### Files to Create
None.

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` | Insert one `assert` line after name assertion at line 93 | Adds version parity guard matching the established Gitea pattern |
| `plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json` | Change `"version"` from `"3.8.1"` to `"3.10.0"` on line 3 | Aligns plugin manifest with root `package.json` |
| `README.md` | Update lines 356-357: change `3.8.1` to `3.10.0` for GitHub and GitLab Claude editions | Fixes stale documentation that contradicts the README's own versioning contract |
| `CHANGELOG.md` | Append bullet under `### Added` in the existing `[Unreleased]` block | Documents the contract guard and version bump per project checklist |

### Build Sequence
1. Task 1 (validator assertion + plugin.json bump) — RED then GREEN via tdd-guide; these are coupled because RED evidence requires the assertion to be present before the version bump resolves it
2. Tasks 2 and 3 — disjoint write sets; can run in parallel with each other and start as soon as Task 1's edits are on disk
3. Task 4 (final sweep) — must run after Tasks 1, 2, and 3 complete

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | 1 | serial (RED→GREEN dependency internal to the task) |
| B | 2, 3 | disjoint files (README.md vs CHANGELOG.md); no dependency on Task 1 result |
| Final | 4 | depends on all prior tasks complete |

Note: Group B tasks can start as soon as Task 1's edits are on disk (no checkpoint commit needed).

### External Dependencies
None. All files are local. No new npm packages, no network calls.

## Task List

### Task 1: GitLab validator assertion + plugin.json version bump
- File: `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`
- Test File: same file (the validator is its own test)
- Write Set: `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`, `plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json`
- Depends On: none
- Parallel Group: A (serial; RED→GREEN is internal)
- Action: MODIFY both files
- Implement:
  1. Read `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` to verify line 93 is the name assertion, then insert immediately after it:
     ```js
     assert(claudePluginJson.version === require(path.join(root, 'package.json')).version,
       'GitLab Claude plugin version must match package.json');
     ```
     `root` is already defined at line 7 as `path.resolve(__dirname, '..', '..', '..')`. No new imports.
  2. Run `npm run test:kaola-workflow:gitlab` — must FAIL with message containing `'GitLab Claude plugin version must match package.json'` (RED evidence).
  3. Edit `plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json` line 3: change `"version": "3.8.1"` to `"version": "3.10.0"`.
  4. Run `npm run test:kaola-workflow:gitlab` — must PASS (GREEN evidence).
- Mirror: `plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js:93-94` (verbatim copy, substituting `'GitLab'` for `'Gitea'` in the message)
- Validate: `npm run test:kaola-workflow:gitlab` (exit 0 = GREEN)
- Working directory: `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-125/`

### Task 2: Fix stale version strings in README.md
- File: `README.md`
- Test File: N/A (documentation)
- Write Set: `README.md`
- Depends On: none (disjoint write set from Task 1)
- Parallel Group: B (can start once Task 1 edits are on disk)
- Action: MODIFY
- Implement:
  1. Read `README.md:350-370` to confirm line numbers and identify the "Release versioning" block. Confirm lines 356-357 are the GitHub and GitLab Claude edition lines showing `3.8.1`. If a Codex-edition line appears in the 356-357 range (unexpected), exclude it.
  2. Update exactly two lines:
     - The GitHub Claude edition line: change `3.8.1` → `3.10.0`
     - The GitLab Claude edition line: change `3.8.1` → `3.10.0`
  3. Lines for Codex editions must NOT be touched.
- Mirror: same pattern as the Gitea edition bump in prior issues
- Validate: visually confirm (read the modified lines back) that Codex edition lines are unchanged
- Working directory: `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-125/`

### Task 3: Add CHANGELOG entry
- File: `CHANGELOG.md`
- Test File: N/A
- Write Set: `CHANGELOG.md`
- Depends On: none (disjoint write set)
- Parallel Group: B (can run concurrently with Task 2)
- Action: MODIFY
- Implement:
  1. Append one bullet under `### Added` within the existing `[Unreleased]` block (do NOT create a second `[Unreleased]` header). The CHANGELOG currently has `## [Unreleased]` → `### Added` at lines 3-5 with existing entries.
  2. Add as a new bullet at the top of the `### Added` list:
     ```
     - **GitLab Claude plugin version contract** (issue #125): `plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json` version bumped from `3.8.1` to `3.10.0` to match root `package.json`. Added `claudePluginJson.version` assertion in `validate-kaola-workflow-gitlab-contracts.js` mirroring the Gitea edition guard; validator now fails fast on version drift.
     ```
  3. Confirm only one `[Unreleased]` header exists after editing.
- Working directory: `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-125/`

### Task 4: Final sweep
- File: N/A (validation only)
- Test File: N/A
- Write Set: none
- Depends On: Tasks 1, 2, 3
- Parallel Group: Final (serial)
- Action: RUN validation
- Validate:
  1. `npm test` — must exit 0 (chains all four forge editions)
  2. `node scripts/simulate-workflow-walkthrough.js` — must exit 0 with "Workflow walkthrough simulation passed"
- Working directory: `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-125/`

## Advisor Notes

Blueprint is sound. Key adaptations from advisor feedback:
- Tasks 1–4 from architect collapsed into one tdd-guide task (Task 1 here) — RED→GREEN is internal to tdd-guide's natural execution.
- "After Task 1 is committed" language removed; Group B starts when Task 1's edits are on disk.
- CHANGELOG structure verified: `[Unreleased]` → `### Added` exists with entries from issue #124 — append at top of the list.
- Worktree path `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-125/` must be passed to all tdd-guide invocations.
- Read `README.md:350-370` in worktree before editing to confirm line numbers haven't drifted.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | | advisor found no blueprint gaps requiring revision |
