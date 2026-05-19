# Planner Output — issue-113

## Recommended Approach
Mirror the GitLab plugin (`plugins/kaola-workflow-gitlab/scripts/`). It is the canonical template already validated by the GitLab edition. Approach A.

## Build Sequence
1. kaola-gitea-workflow-active-folders.js (no internal deps)
2. kaola-gitea-workflow-classifier.js (imports active-folders; spawned by claim)
3. kaola-gitea-workflow-claim.js (imports active-folders; spawns classifier)
4. kaola-gitea-workflow-roadmap.js (independent — strip dead ghExec)
5. kaola-gitea-workflow-compact-context.js (independent — pure file I/O)
6. kaola-gitea-workflow-repair-state.js (independent — pure file I/O)
7. Repoint kaola-gitea-workflow-sink-merge.js + kaola-gitea-workflow-sink-pr.js
8. test-gitea-workflow-scripts.js (covers items 1-7)

## Key Decisions

1. **OFFLINE guard**: Forge module already handles OFFLINE in teaExec. Match GitLab pattern — don't double-guard except in cmdWatchPr.
2. **project object**: `readProjectInfo()` helper at top of claim.js: call `forge.discoverProject()` wrapped in try/catch.
3. **cmdWatchPr**: Parse pr_url via `/\/pulls\/(\d+)/` regex → call `forge.viewPullRequest(prNumber)`.
4. **Dead code**: Remove `ghExec` definition from roadmap.js (confirmed dead code).
5. **classifyIssue subprocess**: Point to `kaola-gitea-workflow-classifier.js` sibling.
6. **Sink imports**: Repoint both sinks from `../../../scripts/kaola-workflow-claim` to `./kaola-gitea-workflow-claim`.

## Tasks

### Task 1.1 — Port active-folders.js
- Source: scripts/kaola-workflow-active-folders.js
- Template: plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-active-folders.js
- `issueIsClosed` → `forge.viewIssue(num).state === 'closed'`; forge handles OFFLINE

### Task 1.2 — Port roadmap.js
- Source: scripts/kaola-workflow-roadmap.js
- Remove dead `ghExec` definition
- Pure file I/O otherwise

### Task 1.3 — Port compact-context.js
- Source: scripts/kaola-workflow-compact-context.js
- Rename only

### Task 1.4 — Port repair-state.js
- Source: scripts/kaola-workflow-repair-state.js
- Rename only

### Task 2.1 — Port classifier.js
- Source: scripts/kaola-workflow-classifier.js
- 4 ghExec replacements:
  1. getRepoOwnerName → forge.discoverProject()
  2. issueHasRemoteClaimComment → forge.listIssueComments(project, issueNum)
  3. checkDependsOn → forge.viewIssue(depN).state
  4. cmdClassify → forge.viewIssue(N)
- Import active-folders from ./kaola-gitea-workflow-active-folders

### Task 3.1 — Port claim.js
- Source: scripts/kaola-workflow-claim.js
- 7 ghExec replacements across listOpenIssues, postAdvisoryClaim (3), clearAdvisoryClaim (2), cmdWatchPr
- Add readProjectInfo() helper (try discoverProject, catch → empty)
- Update classifyIssue subprocess to kaola-gitea-workflow-classifier.js
- Preserve all exports: archiveProjectDir, buildBranchName, claimExplicitTarget, claimProject, getCoordRoot, projectNameForIssue, provisionWorktree, readActiveFolders, readPriorityConfig, removeWorktree, worktreePathFor

### Task 4.1 — Repoint sink-merge.js
- Change require('../../../scripts/kaola-workflow-claim') → require('./kaola-gitea-workflow-claim')

### Task 4.2 — Repoint sink-pr.js
- Change require('../../../scripts/kaola-workflow-claim') → require('./kaola-gitea-workflow-claim')

### Task 5.1 — Create test-gitea-workflow-scripts.js
- Template: plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js
- Cover: active-folders, classifier, claim, roadmap, compact-context, repair-state, subprocess CLI tests

## Out of Scope
- simulate-gitea-workflow-walkthrough.js (issue #116)
- install.sh --forge=gitea wiring (issue #115)
- Contract validator (issue #116)
- Skill/SKILL.md updates
- Migration of existing state files

## Success Criteria
- 6 new files in plugins/kaola-workflow-gitea/scripts/
- Sinks no longer import from ../../../scripts/
- test-gitea-workflow-scripts.js exits 0 (OFFLINE=1)
- test-gitea-sinks.js still exits 0 (regression)
- simulate-workflow-walkthrough.js still exits 0
- No 'gh ' CLI calls in any Gitea plugin file
