# Architect Notes - issue-55

## Write Set

- `plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json`
- `plugins/kaola-workflow-gitlab/.codex-plugin/plugin.json`
- `plugins/kaola-workflow-gitlab/{agents,commands,config,hooks,scripts,skills}/.gitkeep`
- `.claude-plugin/marketplace.json`
- `.agents/plugins/marketplace.json`
- `install.sh`
- `uninstall.sh`
- `package.json`

## Design

Keep #55 as a skeleton-only change. GitLab install mode can tolerate empty GitLab source directories during this phase, but GitHub mode remains strict and unchanged.

Do not update `scripts/validate-workflow-contracts.js` for GitLab skeleton checks. That file is byte-synced with `plugins/kaola-workflow/scripts/validate-workflow-contracts.js`; changing it would require touching the existing GitHub plugin tree, violating #55. Put GitLab manifest parsing into `test:kaola-workflow:gitlab` instead.

## Installer Structure

Introduce `FORGE=github` by default and derive all source/support paths from the selected forge:

- GitHub:
  - commands: `commands`
  - scripts: `scripts`
  - hooks: `hooks`
  - support: `$HOME/.claude/kaola-workflow`
  - verification: strict
- GitLab:
  - commands: `plugins/kaola-workflow-gitlab/commands`
  - scripts: `plugins/kaola-workflow-gitlab/scripts`
  - hooks: `plugins/kaola-workflow-gitlab/hooks`
  - support: `$HOME/.claude/kaola-workflow-gitlab`
  - verification: allow empty skeleton sources

## Uninstaller Structure

Add `--forge=github|gitlab|all`. Default `github`. Remove common command names and forge-specific support directories. `all` removes both support directories.
