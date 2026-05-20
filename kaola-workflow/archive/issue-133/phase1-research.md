# Phase 1 - Research / Discovery: issue-133

## Deliverable
Fix GitLab/Gitea Codex init agent profile installer drift: correct two bugs in GitLab SKILL.md, add missing `install-codex-agent-profiles.js` to both GitLab and Gitea plugin scripts directories, add contract validation guards, and add regression tests.

## Why
GitLab/Gitea users running `kaola-workflow-init` cannot correctly install Codex agent profiles. GitLab's init resolves to the wrong plugin root (GitHub's), and Gitea's init references a script that doesn't exist. Both would silently fail or install the wrong profiles.

## Affected Area
- `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md` — two bug lines (116, 118)
- `plugins/kaola-workflow-gitlab/scripts/install-codex-agent-profiles.js` — missing (must create)
- `plugins/kaola-workflow-gitea/scripts/install-codex-agent-profiles.js` — missing (must create)
- `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` — add guards
- `plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js` — add guards
- `plugins/kaola-workflow-gitlab/scripts/simulate-gitlab-codex-workflow-walkthrough.js` — add test
- `plugins/kaola-workflow-gitea/scripts/simulate-gitea-codex-workflow-walkthrough.js` — add test

## Key Patterns Found
1. `__dirname`-based plugin root resolution in `install-codex-agent-profiles.js` — the script self-identifies its plugin root via `path.resolve(__dirname, '..')`, so byte-identical copies work correctly in any forge plugin directory.
2. GitLab SKILL.md line 116 hardcodes `plugin_root="plugins/kaola-workflow"` (GitHub's path); line 118 cache find pattern also uses `*/kaola-workflow/*/...` — both must change to `kaola-workflow-gitlab`.
3. Gitea SKILL.md lines 116+118 already use `kaola-workflow-gitea` correctly — only the missing script needs to be added.
4. Both forge validators (`validate-kaola-workflow-{forge}-contracts.js`) have `scriptFiles` and `installSupportScripts` arrays where `install-codex-agent-profiles.js` must be added to enforce presence.
5. The static `assertNoForbidden` check does NOT catch the GitLab drift because the forbidden string `plugins/kaola-workflow/scripts` only appears at runtime via shell variable expansion, not as a literal in the file.

## Test Patterns
- Framework: Node.js hand-rolled assert, spawnSync subprocess execution
- Location: `plugins/kaola-workflow-{forge}/scripts/simulate-{forge}-codex-workflow-walkthrough.js`
- Structure: `testInstallProfilesFeaturesTableHandling()` — creates tmpdir, runs install, asserts [features] block and managed block presence; runs install twice to assert idempotency. Reference template: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` lines 36-81.

## Config & Env
- `install-codex-agent-profiles.js` expects `{pluginRoot}/agents/*.toml` and `{pluginRoot}/config/agents.toml` — all three plugins already have these assets.
- No new env vars.
- Do NOT add `install-codex-agent-profiles.js` to `scripts/validate-script-sync.js` — excluded by design (line 33 comment).

## External Docs
None — all internal.

## GitHub Issue
KaolaBrother/Kaola-Workflow#133

## Completeness Score
10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | all internal patterns, no external lib/API |

## Notes / Future Considerations
- `validate-script-sync.js` intentionally excludes `install-codex-agent-profiles.js` from byte-sync enforcement — the three copies are independent by design. Do not change this.
- The GitLab fix requires TWO line changes, not one (both the primary path and the cache-fallback find pattern).
- Gitea SKILL.md needs no changes — only the missing script needs to be added.
