# Phase 3 - Plan: issue-87

## Blueprint

Implement the GitLab roadmap hardening as a minimal port of the GitHub roadmap generator behavior.

## Files To Modify

- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-roadmap.js` - add missing-source guard, atomic generated roadmap writes, exclusive explicit init issue creation, explicit `--update`, and accurate `created`/`skip`/`updated` output.
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js` - add behavior regressions mirroring the GitHub roadmap tests.
- `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` - add structural checks for the new GitLab helper guarantees.

## Ordered Build Sequence

### Task 1: GitLab Roadmap Regression Tests

- File: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`
- Test File: same
- Write Set: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`
- Depends On: none
- Parallel Group: serial
- Action: MODIFY
- Implement: add tests for missing `.roadmap` guard, atomic generated roadmap temp cleanup, concurrent `init-issue` exclusive creation, duplicate skip output, and explicit `--update` output.
- Mirror: `scripts/simulate-workflow-walkthrough.js` roadmap tests.
- Validate: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js` should fail before implementation and pass after.

### Task 2: GitLab Roadmap Helper Port

- File: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-roadmap.js`
- Test File: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`
- Write Set: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-roadmap.js`
- Depends On: Task 1
- Parallel Group: serial
- Action: MODIFY
- Implement: add `isGeneratedRoadmap`, `parseRoadmapTable`, `guardAgainstMissingRoadmapSource`, `writeFileAtomicReplace`, and `createFileExclusive`; route generated `ROADMAP.md` writes through atomic replace; make explicit `cmdInitIssue()` use exclusive creation by default, support `--update`, and print `created`, `skip`, or `updated`.
- Mirror: `scripts/kaola-workflow-roadmap.js`.
- Validate: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`.

### Task 3: Structural Contract Validation

- File: `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`
- Test File: same
- Write Set: `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`
- Depends On: Task 2
- Parallel Group: serial
- Action: MODIFY
- Implement: assert the GitLab roadmap script contains the missing-source guard and atomic/exclusive helper names.
- Mirror: `scripts/validate-workflow-contracts.js` GitHub roadmap checks.
- Validate: `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`.

## Validation Commands

- `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`
- `npm run test:kaola-workflow:gitlab`
- `node scripts/simulate-workflow-walkthrough.js`

## Safe Parallel Groups

None. The tasks are small and sequential because tests define expected behavior before the implementation patch.

## Out Of Scope

- Shared GitHub/GitLab roadmap library extraction.
- Changing GitLab remote refresh semantics.
- Changing roadmap table format.
- Cleaning unrelated stale local roadmap files.

## Required Agent Compliance

Plain `invoked` is intentional for non-Codex-role workflow gates such as advisor plan review; delegation vocabulary applies only to Codex role rows like `code-architect`.

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | local-fallback-explicit | .cache/code-architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| blueprint revisions | invoked | .cache/advisor-plan.md | Explicit `--update` path added before execution |
