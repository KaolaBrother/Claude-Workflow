# Phase 1 - Research / Discovery: issue-114

## Deliverable
Populate `plugins/kaola-workflow-gitea/` with forge-specific commands (9 .md files), skills (5 SKILL.md files), hooks, config, agents, and plugin manifests — mirroring `plugins/kaola-workflow-gitlab/` with Gitea-appropriate substitutions.

## Why
Enables users to install and use the kaola-workflow-gitea plugin with correct commands and skills content. Without these files the Gitea edition is non-functional even though the forge adapter (issue #111) exists.

## Affected Area
- `plugins/kaola-workflow-gitea/commands/` (CREATE: 9 .md files)
- `plugins/kaola-workflow-gitea/skills/` (CREATE: 9 SKILL.md files in subdirs)
- `plugins/kaola-workflow-gitea/hooks/` (CREATE: hooks.json + 2 .sh + .gitkeep)
- `plugins/kaola-workflow-gitea/config/` (CREATE: agents.toml + .gitkeep)
- `plugins/kaola-workflow-gitea/agents/` (CREATE: 9 .toml + .gitkeep)
- `plugins/kaola-workflow-gitea/.claude-plugin/plugin.json` (CREATE)
- `plugins/kaola-workflow-gitea/.codex-plugin/plugin.json` (CREATE)

## Key Patterns Found
1. Mirror source: `plugins/kaola-workflow-gitlab/` — exact structure to replicate (code-explorer.md)
2. Verbatim copies (no forge-specific content): phase2–5 commands, execute/ideation/plan/review skills, hook .sh files, config/agents.toml, agent .toml files
3. Heavy substitution files: kaola-workflow-phase6.md, workflow-next.md, skills/kaola-workflow-finalize/SKILL.md, skills/kaola-workflow-next/SKILL.md — MR→PR, glab→tea, script names throughout

## Test Patterns
- Framework: manual acceptance criteria check (no automated test for content)
- Acceptance criteria from issue: all 9 command files present + Gitea-correct (no stray `glab`/`MR` text); all 5 forge-specific skill files present; no GitLab/GitHub-specific URLs; directory layout matches `plugins/kaola-workflow-gitlab/` minus JS scripts
- Validation command: `grep -r "glab\|MR\b\|merge request\|GitLab" plugins/kaola-workflow-gitea/commands/ plugins/kaola-workflow-gitea/skills/ 2>/dev/null | grep -v ".cache" | wc -l` — must be 0

## Config & Env
- No new env vars introduced by this task
- Plugin is loaded via `CLAUDE_PLUGIN_ROOT` (existing mechanism)
- `hooks.json` references `kaola-gitea-workflow-compact-context.js` (not yet built — issue #113; hooks.json created now, script wired later)

## External Docs
N/A — internal content mirroring, no external API behavior needed.

## GitHub Issue
KaolaBrother/Kaola-Workflow#114

## Completeness Score
10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | — | Pure internal content mirroring; no external library/API/framework behavior needed |

## Notes / Future Considerations
- `hooks.json` references `kaola-gitea-workflow-compact-context.js` which is built in issue #113; hooks.json is created here with the correct reference, the script itself is not in scope
- Plugin manifests (.claude-plugin, .codex-plugin) are in scope per issue #115 as well, but the basic structure is created here as part of directory layout
- Non-forge-specific skills (execute, ideation, plan, review) are verbatim copies — consider symlinking in the future to avoid drift
