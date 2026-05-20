# Phase 1 - Research / Discovery: issue-123

## Deliverable
Create `plugins/kaola-workflow-gitea/scripts/simulate-gitea-codex-workflow-walkthrough.js` (thin wrapper mirroring the GitLab Codex simulation pattern) and include it in `npm run test:kaola-workflow:gitea`.

## Why
The Gitea Codex plugin surface can drift from the GitHub/GitLab Codex behavior without an end-to-end simulation. GitHub and GitLab both have Codex-specific walkthrough simulations; Gitea only has a Claude-style simulation.

## Affected Area
- `plugins/kaola-workflow-gitea/scripts/simulate-gitea-codex-workflow-walkthrough.js` — CREATE (new file, ~22 lines)
- `plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js` — MODIFY (add to `scriptFiles` array, line 131)
- `package.json` — MODIFY (extend `test:kaola-workflow:gitea`, line 39)

## Key Patterns Found

1. **GitLab Codex sim** (`plugins/kaola-workflow-gitlab/scripts/simulate-gitlab-codex-workflow-walkthrough.js:1-22`): Thin 22-line wrapper. Runs `validate-kaola-workflow-gitlab-contracts.js`, `test-gitlab-workflow-scripts.js`, `test-gitlab-sinks.js` via `execFileSync`. Prints success message. Uses `path.resolve(__dirname, '..', '..', '..')` for root.

2. **Contract validator scriptFiles** (`plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js:120-131`): Hard-listed array, asserts each script file exists. Currently ends with `'simulate-gitea-workflow-walkthrough.js'`. New sim must be added. Must NOT be added to `installSupportScripts`.

3. **npm test format** (`package.json:39`): `&&`-chained node commands. Add new sim at end.

4. **Shape A (GitHub) rejected**: Requires `install-codex-agent-profiles.js` which does not exist in the Gitea plugin. Shape B (GitLab thin wrapper) is appropriate and sufficient.

## Test Patterns
- Framework: hand-rolled assert + process.exit (no framework)
- Location: `plugins/kaola-workflow-gitea/scripts/test-gitea-*.js`
- Structure: `execFileSync` subscript invocation, `stdio: 'pipe'`, success message printed last

## Config & Env
- `KAOLA_WORKFLOW_OFFLINE=1` honored by subscripts (no changes needed)
- No new env vars

## External Docs
None.

## GitHub Issue
KaolaBrother/Kaola-Workflow#123

## Completeness Score
10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | Internal patterns sufficient |

## Notes / Future Considerations
- `install-codex-agent-profiles.js` is missing from the Gitea plugin (referenced in init SKILL.md line 118). Pre-existing gap; out of scope for issue #123.
