# Architect Output — issue-113

## Build Sequence
1. kaola-gitea-workflow-active-folders.js (no deps)
2. kaola-gitea-workflow-classifier.js (imports active-folders)
3. kaola-gitea-workflow-claim.js (imports active-folders + classifier)
4. kaola-gitea-workflow-roadmap.js (independent)
5. kaola-gitea-workflow-compact-context.js (independent)
6. kaola-gitea-workflow-repair-state.js (independent)
7. Repoint sink-merge.js + sink-pr.js (requires claim)
8. test-gitea-workflow-scripts.js (tests all above)

## Key Design Decisions

1. classifyIssue in claim.js uses direct require('./kaola-gitea-workflow-classifier') — not subprocess
2. writeState writes ## Gitea section with: issue_number, full_name, project_html_url
3. cmdWatchPr parses /pulls/(\d+) from pr_url → forge.viewPullRequest(prNumber); state is lowercase
4. discoverProjectSafe() returns { full_name, html_url } for Gitea (not project_id)
5. getCoordRoot is defined twice in GitLab template (lines 55, 375) — deduplicate: remove second
6. repair-state: preserved = ['Gitea', 'Sink'] (change from 'GitLab')
7. active-folders: both issue_iid and issue_number emitted as alias — intentional for internal callers
8. OFFLINE guard: forge handles it at teaExec; redundant guards can be dropped except in cmdWatchPr
9. ensureLabel must be called before updateIssueLabels (Gitea requires label to exist)
10. branch prefix: workflow/gitea-issue-N (parallel to GitLab's workflow/gitlab-issue-N)

## Specific Changes Per File

### Task 1: kaola-gitea-workflow-active-folders.js
Template: kaola-gitlab-workflow-active-folders.js
- Line 7: require('./kaola-gitea-forge')
- issueIsClosed already correct shape in GitLab template (uses forge.viewIssue)
- Keep firstPositiveInteger(field(content,'issue_iid'), field(content,'issue_number')) dual-read
- Emit both issue_iid and issue_number as aliases

### Task 2: kaola-gitea-workflow-classifier.js
Template: kaola-gitlab-workflow-classifier.js
- Line 7: require('./kaola-gitea-forge')
- Line 8: require('./kaola-gitea-workflow-active-folders')
- SHARED_INFRA: add 'plugins/kaola-workflow-gitea/scripts'
- areaForPath: prefix check 'plugins/kaola-workflow-gitea/'
- issueHasRemoteClaimNotes: replace forge.listIssueNotes → forge.listIssueComments; guard uses full_name (not project_id)
- discoverProject(): returns { full_name, html_url }
- Preserve all verdicts: green, yellow, red, blocked, owned

### Task 3: kaola-gitea-workflow-claim.js
Template: kaola-gitlab-workflow-claim.js
- Lines 7-15: require forge/classifier/active-folders Gitea variants
- buildBranchName: prefix 'workflow/gitea-issue-'
- discoverProjectSafe(): returns { full_name, html_url }
- writeState: ## Gitea section with issue_number, full_name, project_html_url
- claimProject: maps projectInfo.full_name + projectInfo.html_url
- postAdvisoryClaim: ensureLabel + updateIssueLabels + createIssueComment (all try/catch)
- clearAdvisoryClaim: updateIssueLabels(remove) + optional createIssueComment
- listOpenIssues: forge.listIssues({ state: 'open' })
- watchMergeRequests: parse /pulls/(\d+) → forge.viewPullRequest; lowercase state compare
- cmdFinalize/cmdRelease: use full_name + html_url fields
- Deduplicate getCoordRoot (remove second definition at line ~375)
- Exports: archiveProjectDir, buildBranchName, claimExplicitTarget, claimProject, getCoordRoot, listOpenIssues, partitionActiveAndDrift, projectNameForIssue, provisionWorktree, readActiveFolders, readPriorityConfig, removeWorktree, watchMergeRequests, worktreePathFor

### Task 4: kaola-gitea-workflow-roadmap.js
Template: kaola-gitlab-workflow-roadmap.js
- require('./kaola-gitea-forge')
- HEADER: update generated-by comment to kaola-gitea-workflow-roadmap.js
- refreshFromGitLab → refreshFromGitea; use forge.listIssues({ state: 'open' })
- isGeneratedRoadmap: match new header string
- RULES_BLOCK: update to Gitea references
- Exports: rename refreshFromGitLab → refreshFromGitea

### Task 5: kaola-gitea-workflow-compact-context.js
Template: kaola-gitlab-workflow-compact-context.js
- Pure copy — no forge calls, no forge-specific strings

### Task 6: kaola-gitea-workflow-repair-state.js
Template: kaola-gitlab-workflow-repair-state.js
- Change: preserved = ['GitLab', 'Sink'] → ['Gitea', 'Sink'] (line 323)

### Task 7: Repoint sink-merge.js line 9
- require('../../../scripts/kaola-workflow-claim') → require('./kaola-gitea-workflow-claim')

### Task 8: Repoint sink-pr.js line 8
- require('../../../scripts/kaola-workflow-claim') → require('./kaola-gitea-workflow-claim')

### Task 9: test-gitea-workflow-scripts.js
Template: test-gitlab-workflow-scripts.js
- All require() → Gitea variants
- writeState fixture: ## Gitea block with full_name, project_html_url; branch workflow/gitea-issue-N
- Roadmap tests: update header string assertions
- claimExplicitTarget test: stub ensureLabel/updateIssueLabels/createIssueComment (not updateIssue/createIssueNote)
- watchMergeRequests test: pr_url with /pulls/44; stub viewPullRequest (not viewMergeRequest)
- issueHasRemoteClaimNotes test: stub listIssueComments; discoverProject returns full_name
- repair-state test: ## Gitea (not ## GitLab)
- Final log: 'Gitea workflow script tests passed'

## Risks Identified

1. issue_iid vs issue_number aliasing: both must be emitted
2. discoverProjectSafe return shape: full_name + html_url (not project_id)
3. ensureLabel before updateIssueLabels: ensureLabel must be called first (Gitea requirement)
4. cmdSinkFallback archive-safety guard: use GitLab version (safer per issue #108)
5. getCoordRoot duplicate in GitLab template: deduplicate in port
6. OFFLINE guard in claimProject: drop !OFFLINE guard (GitLab pattern is fine)

## Validation Commands
KAOLA_WORKFLOW_OFFLINE=1 node plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js
KAOLA_WORKFLOW_OFFLINE=1 node plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js
node scripts/simulate-workflow-walkthrough.js
