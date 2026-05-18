# Advisor Ideation Gate: issue-71

## Review

The strategy must not treat passing the GitLab validator as sufficient launch evidence. Issue #71 explicitly includes manual install/uninstall smoke tests, README install guidance, marketplace/Codex docs, release metadata, terminology cleanup, and a no-`plugins/kaola-workflow/` modification constraint.

## Risks Checked

- A docs-only approach would leave the GitLab manual installer unable to copy its support scripts.
- A version/tag release approach would introduce unnecessary release-management risk and is not required to make package and plugin metadata consistent.
- GitLab terminology cleanup should stay scoped to GitLab command/skill/docs surfaces and avoid touching the GitHub plugin.
- Isolated `HOME` smoke tests should be used so validation does not mutate the user's real Claude install.

## Decision

Proceed with the launch readiness pass: docs plus installer list correction plus final validation.
