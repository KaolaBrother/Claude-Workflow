# Phase 3 - Plan: issue-68

## Blueprint

### Task 1: Add GitLab MR Sink

- File: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js`
- Test File: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`
- Write Set: MR sink and focused sink test
- Depends On: #72 MR helpers and #67 state fields
- Parallel Group: serial
- Action: CREATE
- Implement: push workflow branch, create or reuse GitLab MR, record `mr_url` and `mr_iid`, append `MR URL` and `MR IID`, expose MR state routing and merge flags.
- Mirror: existing review sink state/summary update pattern.
- Validate: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

### Task 2: Add GitLab Direct Merge Sink

- File: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js`
- Test File: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`
- Write Set: merge sink and focused sink test
- Depends On: Task 1
- Parallel Group: serial
- Action: CREATE
- Implement: require final validation evidence, fast-forward/push main, create a GitLab issue note, then close the linked issue.
- Mirror: existing direct merge sink safety order.
- Validate: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

### Task 3: Static and Full Validation

- File: phase evidence only
- Test File: N/A
- Write Set: `kaola-workflow/issue-68/`
- Depends On: Tasks 1-2
- Parallel Group: serial
- Action: VALIDATE
- Implement: run focused tests, syntax checks, forbidden wording/API guard, and package tests.
- Validate: static `rg`, `npm run test:kaola-workflow:gitlab`, `npm test`

## Explicit Out of Scope

- User-facing command and skill prose.
- Release documentation.
- Startup/classifier/roadmap behavior beyond sink fields.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | `kaola-workflow/issue-68/phase3-plan.md` | Current session produced the blueprint because the user is coordinating parallel issue ownership. |
| advisor plan gate | invoked | `kaola-workflow/issue-68/.cache/advisor-plan.md` | |
| blueprint revisions | N/A | `kaola-workflow/issue-68/.cache/advisor-plan.md` | Advisor found no required revisions. |

