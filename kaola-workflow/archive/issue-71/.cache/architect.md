# Architect Notes: issue-71

## Blueprint Summary

Implement a serial launch-readiness pass because all tasks touch documentation or shared install metadata and should be validated as one final candidate.

## Main Write Sets

- `install.sh`: correct GitLab support script names so `--forge=gitlab` installs the scripts that GitLab command docs resolve.
- `README.md`: document edition choice, manual install/uninstall flags, GitLab prerequisites, Claude marketplace entries, Codex plugin entries, packaging, and current version metadata.
- `CHANGELOG.md`: add the #65 launch entry under `[Unreleased]`.
- `plugins/kaola-workflow-gitlab/commands/*.md` and `plugins/kaola-workflow-gitlab/skills/**/*.md`: clean GitLab terminology and typo artifacts.
- `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`: extend contract checks so GitLab install support-script regressions are covered by `npm run test:kaola-workflow:gitlab`.

## Validation Design

Use final validation from #71 plus targeted checks:

- `bash -n install.sh uninstall.sh`
- `npm run test:kaola-workflow:gitlab`
- `npm test`
- `claude plugin validate .`
- Direct GitLab validator
- Forbidden-reference grep over GitLab plugin surfaces
- Isolated `HOME` install/uninstall smoke tests for `--forge=github`, `--forge=gitlab`, and `--forge=all`
- `git diff --name-only -- plugins/kaola-workflow` must be empty
