# Code Explorer Notes - issue-55

## Scope

Issue #55 is the GitLab edition skeleton and install-plumbing unblocker. It should not implement production `glab` behavior.

## Facts

- `install.sh:19-25` hard-codes one manual install source: root `commands/`, root `scripts/`, root `hooks/`, and support dir `$HOME/.claude/kaola-workflow`.
- `install.sh:36-49` only accepts `--yes` and `--help`; there is no `--forge` parser.
- `install.sh:113-190` requires command, script, and hook verification for the current GitHub layout. GitLab skeleton install will need a temporary empty-source allowance.
- `uninstall.sh:7-36` removes the existing command filenames and `$HOME/.claude/kaola-workflow`; there is no forge selector and no GitLab support dir cleanup.
- `package.json:35-37` has only `test`, `test:kaola-workflow:claude`, and `test:kaola-workflow:codex`; no GitLab placeholder test script exists.
- `.claude-plugin/marketplace.json:8-12` lists only `kaola-workflow`.
- `.agents/plugins/marketplace.json:6-17` lists only `kaola-workflow`.
- `.claude-plugin/plugin.json:1-22` is the current Claude plugin manifest version source (`3.6.1`).
- `plugins/kaola-workflow/.codex-plugin/plugin.json:1-44` is the current Codex plugin manifest version source (`1.3.1`).
- Existing GitHub plugin tree is under `plugins/kaola-workflow/`; issue #55 must not modify that tree.

## Risk Notes

- Manual install command names intentionally collide between editions. This is acceptable because the install model is choose-one.
- The GitLab Claude plugin manifest should live under `plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json` so the root marketplace can reference the plugin source path.
- GitLab manifests may include repository/homepage metadata that points at this GitHub-hosted source repository; forbidden-runtime grep checks should not blindly include manifest metadata.
