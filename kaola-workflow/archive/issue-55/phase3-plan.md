# Phase 3 - Plan: issue-55

## Overview

Implement the minimal GitLab skeleton and forge-aware installer/uninstaller. Keep the existing GitHub plugin tree untouched. Use a lightweight GitLab placeholder test command to parse the new manifests until #58 replaces it with full validation.

## Tasks

### Task 1: Create GitLab Skeleton Tree

- File: `plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json`
- Test File: `package.json` placeholder script
- Write Set: `plugins/kaola-workflow-gitlab/**`
- Depends On: none
- Parallel Group: serial
- Action: CREATE
- Implement:
  - Add `.claude-plugin/plugin.json` with name `kaola-workflow-gitlab`, version `3.6.1`, and commands `["./commands/"]`.
  - Add `.codex-plugin/plugin.json` with name `kaola-workflow-gitlab`, version `1.3.1`, and skills `./skills/`.
  - Add `.gitkeep` under empty `agents`, `commands`, `config`, `hooks`, `scripts`, and `skills`.
- Mirror: existing `.claude-plugin/plugin.json` and `plugins/kaola-workflow/.codex-plugin/plugin.json`.
- Validate: `node -e "JSON.parse(require('fs').readFileSync('plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json','utf8')); JSON.parse(require('fs').readFileSync('plugins/kaola-workflow-gitlab/.codex-plugin/plugin.json','utf8'))"`

### Task 2: Add Marketplace Entries

- File: `.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`
- Test File: none
- Write Set: `.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`
- Depends On: Task 1
- Parallel Group: serial
- Action: MODIFY
- Implement:
  - Add Claude marketplace plugin entry `kaola-workflow-gitlab` with source `./plugins/kaola-workflow-gitlab`.
  - Add Codex marketplace plugin entry `kaola-workflow-gitlab` with local source path `./plugins/kaola-workflow-gitlab`.
  - Preserve existing `kaola-workflow` entries.
- Mirror: existing single-entry marketplace shapes.
- Validate: `claude plugin validate .`

### Task 3: Add Forge-Aware Install

- File: `install.sh`
- Test File: shell smoke commands
- Write Set: `install.sh`
- Depends On: Task 1
- Parallel Group: serial
- Action: MODIFY
- Implement:
  - Parse `--forge=github|gitlab` and `--forge github|gitlab`.
  - Preserve `--yes` and `--help`.
  - Default to `github`.
  - Derive source/support paths from selected forge.
  - Keep GitHub verification strict.
  - Allow empty GitLab source dirs in skeleton mode with a clear message.
  - Use support dir `$HOME/.claude/kaola-workflow-gitlab` for GitLab.
- Mirror: existing GitHub installer flow.
- Validate:
  - `bash -n install.sh`
  - `TMP_HOME=$(mktemp -d); HOME="$TMP_HOME" bash install.sh --forge=github --yes`
  - `TMP_HOME=$(mktemp -d); HOME="$TMP_HOME" bash install.sh --forge=gitlab --yes`

### Task 4: Add Forge-Aware Uninstall

- File: `uninstall.sh`
- Test File: shell smoke commands
- Write Set: `uninstall.sh`
- Depends On: Task 3
- Parallel Group: serial
- Action: MODIFY
- Implement:
  - Parse `--forge=github|gitlab|all`.
  - Default to `github`.
  - Remove common command filenames.
  - Remove `$HOME/.claude/kaola-workflow` for GitHub and `$HOME/.claude/kaola-workflow-gitlab` for GitLab.
  - `all` removes both support dirs.
- Mirror: existing uninstall command cleanup.
- Validate:
  - `bash -n uninstall.sh`
  - `TMP_HOME=$(mktemp -d); HOME="$TMP_HOME" bash install.sh --forge=gitlab --yes && HOME="$TMP_HOME" bash uninstall.sh --forge=gitlab`

### Task 5: Add GitLab Placeholder Test Script

- File: `package.json`
- Test File: `package.json`
- Write Set: `package.json`
- Depends On: Tasks 1-2
- Parallel Group: serial
- Action: MODIFY
- Implement:
  - Add `test:kaola-workflow:gitlab`.
  - The command should parse package and GitLab manifests, then echo that full GitLab tests are pending #58.
  - Do not add it to default `npm test`.
- Mirror: existing `node -e` JSON parse style from `test:kaola-workflow:claude`.
- Validate:
  - `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`
  - `npm run test:kaola-workflow:gitlab`

### Task 6: Acceptance Validation

- File: none
- Test File: none
- Write Set: none
- Depends On: Tasks 1-5
- Parallel Group: serial
- Action: VERIFY
- Implement:
  - Run issue #55 acceptance commands.
  - Run `git diff --name-only -- plugins/kaola-workflow` to confirm no existing GitHub plugin tree modifications.
  - Run `npm test` or record pre-existing failure evidence.
- Validate: commands above.

## Safe Parallel Groups

None. The edits are small and path-adjacent; serial execution avoids accidental installer/manifest mismatch.

## Out of Scope

- Porting production scripts to `glab`.
- Copying or porting command/skill/hook prose.
- Full GitLab validators or simulators.
- Version bump for release.
- Any edit under `plugins/kaola-workflow/`.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | `.cache/architect.md` | |
| advisor plan gate | invoked | `.cache/advisor-plan.md` | |
| blueprint revisions | N/A | `.cache/advisor-plan.md` | Advisor approved without required blueprint revision beyond including the manifest parse placeholder test |
