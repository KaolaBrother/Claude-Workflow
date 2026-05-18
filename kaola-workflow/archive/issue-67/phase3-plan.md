# Phase 3 - Plan: issue-67

## Blueprint

### Task 1: Extend GitLab Forge Issue Normalization

- File: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-forge.js`
- Test File: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-forge-helpers.js`
- Write Set: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-forge.js`, `plugins/kaola-workflow-gitlab/scripts/test-gitlab-forge-helpers.js`
- Depends On: #72 helper module
- Parallel Group: serial
- Action: MODIFY
- Implement: preserve GitLab issue description/body/update URL fields needed by classifier and roadmap refresh; allow issue list state filters.
- Mirror: #72 helper normalizer pattern.
- Validate: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-forge-helpers.js`

### Task 2: Add GitLab Active Folder Reader

- File: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-active-folders.js`
- Test File: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`
- Write Set: active-folder script and focused test
- Depends On: Task 1
- Parallel Group: serial
- Action: CREATE
- Implement: parse local workflow state, preserve `issue_iid` and project identity, ignore inactive local status, and treat closed GitLab issues as residue.
- Mirror: post-#63 active-folder reader.
- Validate: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`

### Task 3: Add GitLab Classifier and Claim Script Port

- File: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-classifier.js`, `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js`
- Test File: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`
- Write Set: classifier, claim script, focused test
- Depends On: Task 2
- Parallel Group: serial
- Action: CREATE
- Implement: startup, issue selection, resume, classify, finalize, worktree status/finalize, and sink fallback using GitLab issue `iid` and local active-folder state. Stale `workflow:in-progress` labels are advisory and must not block.
- Mirror: post-#63 claim/classifier shape with GitLab forge helpers.
- Validate: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`

### Task 4: Add GitLab Roadmap and Repair-State Port

- File: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-roadmap.js`, `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-repair-state.js`
- Test File: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`
- Write Set: roadmap, repair-state, focused test
- Depends On: Task 2
- Parallel Group: serial
- Action: CREATE
- Implement: roadmap refresh from GitLab issue `iid`, state, labels, and URL; repair-state reconstruction preserving sink blocks; no legacy coordination directories.
- Mirror: post-#63 roadmap/repair patterns.
- Validate: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`

### Task 5: Static and Full Validation

- File: phase evidence only
- Test File: N/A
- Write Set: `kaola-workflow/issue-67/`
- Depends On: Tasks 1-4
- Parallel Group: serial
- Action: VALIDATE
- Implement: run static forbidden-token guards and package tests.
- Mirror: #72 validation style.
- Validate: `rg` guard, `npm run test:kaola-workflow:gitlab`, `npm test`

## Explicit Out of Scope

- MR/merge sink implementation details.
- Commands, skills, hooks, agents, and prose.
- Full GitLab simulator suite.
- `.locks`, `.sessions`, `.tickers`, heartbeat, TTL, handoff, claim-note tiebreakers, or startup receipt behavior.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | `kaola-workflow/issue-67/phase3-plan.md` | Current session produced the blueprint because the user is coordinating parallel issue ownership. |
| advisor plan gate | invoked | `kaola-workflow/issue-67/.cache/advisor-plan.md` | |
| blueprint revisions | N/A | `kaola-workflow/issue-67/.cache/advisor-plan.md` | Advisor found no required revisions. |

