# Code Explorer Notes: issue-71

## Scope Read
- GitHub issue #71 requests final GitLab launch docs, release metadata, package checks, and launch validation.
- Parent issue #65 lists final launch gates and confirms the child sequence ends with #71.

## Files Inspected
- `README.md`: has basic GitLab Claude one-liner, but GitHub remains implicit and Codex install docs only cover `plugins/kaola-workflow/`.
- `CHANGELOG.md`: `[Unreleased]` is empty; `3.8.0` already includes GitLab implementation details but not the final #65 launch documentation entry requested by #71.
- `package.json`: version is `3.8.0`; `files` includes `"plugins/"`, so GitLab plugin files are packaged.
- `.claude-plugin/plugin.json`: version is `3.8.0`.
- `plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json`: version is `3.8.0`.
- `plugins/kaola-workflow/.codex-plugin/plugin.json`: version is `1.4.0`.
- `plugins/kaola-workflow-gitlab/.codex-plugin/plugin.json`: version is `1.4.0`.
- `.claude-plugin/marketplace.json`: includes both `kaola-workflow` and `kaola-workflow-gitlab`.
- `.agents/plugins/marketplace.json`: includes both Codex plugin entries.
- `install.sh`: supports `--forge=github|gitlab`, but the GitLab `SUPPORT_SCRIPT_NAMES` list uses GitHub-style script filenames that do not exist under `plugins/kaola-workflow-gitlab/scripts/`.
- `uninstall.sh`: supports `--forge=github|gitlab|all`.
- `plugins/kaola-workflow-gitlab/commands` and `skills`: GitLab terminology is mostly present, but there are stale typo artifacts such as `pass-througlab`, `higlab`, `enouglab`, `througlab`, and one `glab pr create` mention in MR sink prose.

## Gaps Found
1. Manual GitLab install is not launch-ready because support scripts are not copied.
2. README needs explicit edition selection guidance for Claude Code, manual install/uninstall flags, GitLab prerequisites, and Codex plugin selection for both editions.
3. README release version section is stale relative to package and plugin manifests.
4. CHANGELOG `[Unreleased]` needs the #65 launch entry.
5. GitLab command/skill docs need terminology cleanup and typo repair.
6. Final validation must include install/uninstall smoke tests using isolated `HOME` directories.

## Tests And Validation Patterns
- Full GitHub edition: `npm test`.
- GitLab suite: `npm run test:kaola-workflow:gitlab`.
- Marketplace validation: `claude plugin validate .`.
- Direct GitLab validator: `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`.
- Syntax checks: `bash -n install.sh uninstall.sh`.
- Isolated manual install smoke: `HOME=$(mktemp -d) ./install.sh --yes --forge=github`, `--forge=gitlab`, and `./uninstall.sh --forge=github|gitlab|all`.
- Forbidden reference checks should cover GitLab plugin scripts, commands, skills, agents, hooks, and manifests for root/GitHub fallback paths plus `gh` execution.
