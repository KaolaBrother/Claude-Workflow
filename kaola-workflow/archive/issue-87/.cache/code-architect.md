Code architect blueprint for issue #87.

Write set:
- plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-roadmap.js
- plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js
- plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js only if structural validation does not already cover the new behavior through tests.

Build order:
1. Add failing GitLab tests mirroring GitHub guard, atomic write, and concurrent init behavior.
2. Implement the helper port in kaola-gitlab-workflow-roadmap.js.
3. Add structural validator checks for helper names if needed.
4. Run GitLab package test, then GitHub workflow simulation to catch shared regressions.

Risk controls:
- Leave refreshFromGitLab issue source writes update-capable.
- Use createFileExclusive by default for explicit init-issue; allow updates only when --update is provided.
- Ensure the missing-source guard only protects GitLab-generated non-empty roadmap mirrors.
