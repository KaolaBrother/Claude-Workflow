# Advisor Plan Gate - issue-102

Status: invoked

Review:
- The test-first sequence is appropriate for the bug.
- Installer helper functions should stay private to the script; no export needed.
- Avoid changing `plugins/kaola-workflow/config/agents.toml`, because fresh install behavior depends on it.
- The regression should run the installer twice to cover the reinstall persistence described in the issue.
- Full `npm test` may exercise unrelated GitLab tests; still run it for release confidence after the focused Codex tests pass.

Revisions: none required.
