# Phase 3 - Plan: issue-71

## Files To Modify

- `install.sh`
- `README.md`
- `CHANGELOG.md`
- `plugins/kaola-workflow-gitlab/commands/*.md`
- `plugins/kaola-workflow-gitlab/skills/**/*.md`
- `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`
- `kaola-workflow/issue-71/*` workflow artifacts

## Ordered Build Sequence

### Task 1: Fix GitLab Manual Install Script List

- File: `install.sh`
- Test File: N/A
- Write Set: `install.sh`
- Depends On: none
- Parallel Group: serial
- Action: MODIFY
- Implement: change the GitLab `SUPPORT_SCRIPT_NAMES` list to the actual `kaola-gitlab-workflow-*.js` and `kaola-gitlab-forge.js` files used by GitLab commands and skills.
- Mirror: source filenames under `plugins/kaola-workflow-gitlab/scripts/`.
- Validate: `bash -n install.sh uninstall.sh`; isolated `HOME` install smoke for `--forge=gitlab`.

### Task 2: Update Launch Documentation

- File: `README.md`
- Test File: N/A
- Write Set: `README.md`
- Depends On: Task 1
- Parallel Group: serial
- Action: MODIFY
- Implement: document GitHub default edition, GitLab edition, manual install/uninstall flags, GitLab prerequisites, marketplace entries, Codex plugin paths for both editions, package coverage, and current version metadata.
- Mirror: issue #71 scope and manifest entries.
- Validate: read-through plus final forbidden terminology grep.

### Task 3: Update Changelog Launch Entry

- File: `CHANGELOG.md`
- Test File: N/A
- Write Set: `CHANGELOG.md`
- Depends On: Task 2
- Parallel Group: serial
- Action: MODIFY
- Implement: add a concise `[Unreleased]` GitLab launch readiness entry linked to #65 and child issues #66, #72, #67, #68, #69, #70, #71.
- Mirror: existing changelog style.
- Validate: read-through.

### Task 4: Clean GitLab Command/Skill Terminology

- File: `plugins/kaola-workflow-gitlab/commands/*.md`, `plugins/kaola-workflow-gitlab/skills/**/*.md`
- Test File: N/A
- Write Set: GitLab docs only
- Depends On: Task 2
- Parallel Group: serial
- Action: MODIFY
- Implement: replace typo artifacts (`througlab`, `pass-througlab`, `higlab`, `enouglab`) and visible PR wording that should be MR/merge request wording.
- Mirror: #65 principle that GitLab surfaces use GitLab issue, MR/merge request, and `glab`.
- Validate: forbidden/terminology grep.

### Task 5: Strengthen GitLab Contract Validator

- File: `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`
- Test File: same script
- Write Set: GitLab validator only
- Depends On: Task 1
- Parallel Group: serial
- Action: MODIFY
- Implement: assert that `install.sh` references the GitLab support scripts by their real filenames.
- Mirror: #70 validator structure.
- Validate: `npm run test:kaola-workflow:gitlab`; direct validator.

### Task 6: Final Validation And Artifact Completion

- File: `kaola-workflow/issue-71/phase4-progress.md`, `phase5-review.md`, `phase6-summary.md`, `.cache/*`
- Test File: N/A
- Write Set: workflow artifacts
- Depends On: Tasks 1-5
- Parallel Group: serial
- Action: CREATE/MODIFY
- Implement: record execution, review, final validation, documentation docking, and closure evidence.
- Validate: all #71 final validation commands.

## Validation Commands

```bash
bash -n install.sh uninstall.sh
npm run test:kaola-workflow:gitlab
npm test
claude plugin validate .
node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js
rg -n 'plugins/kaola-workflow/|./scripts/|gh ' plugins/kaola-workflow-gitlab
HOME="$(mktemp -d)" ./install.sh --yes --forge=github
HOME="$(mktemp -d)" ./install.sh --yes --forge=gitlab
HOME="$(mktemp -d)" ./uninstall.sh --forge=all
git diff --name-only -- plugins/kaola-workflow
```

## Safe Parallel Groups

None. The edit set is small, but wording and validation expectations are coupled.

## Out Of Scope

- Runtime forge abstraction.
- Tag creation.
- Publishing a release.
- Editing `plugins/kaola-workflow/`.
- Touching issue #63 or #64.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked locally | `.cache/architect.md` | Subagents were not explicitly requested in this session |
| advisor plan gate | invoked locally | `.cache/advisor-plan.md` | Strongest available local review used |
| blueprint revisions | N/A | `.cache/advisor-plan.md` | No gaps requiring revision |
