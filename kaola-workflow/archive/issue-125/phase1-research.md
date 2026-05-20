# Phase 1 - Research / Discovery: issue-125

## Deliverable
Bump `plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json` version from `3.8.1` to `3.10.0`, and add a version contract assertion to `validate-kaola-workflow-gitlab-contracts.js` matching the Gitea pattern. Do not implement a shared helper (advisory, out of scope).

## Why
The GitLab Claude plugin manifest is stale relative to the root `package.json` and the Gitea manifest. A stale manifest weakens release traceability and means the GitLab pack can be published with wrong metadata. The missing version assertion means the drift can recur silently after future releases.

## Affected Area
- `plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json` line 3 — version field
- `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` around line 94 — insert version assertion after name assertion

## Key Patterns Found
1. Gitea version assertion at `plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js:93-94`:
   ```js
   assert(claudePluginJson.version === require(path.join(root, 'package.json')).version,
     'Gitea Claude plugin version must match package.json');
   ```
2. GitLab name assertion at `validate-kaola-workflow-gitlab-contracts.js:93`: `assert(String(claudePluginJson.name || '').includes('gitlab'), ...)` — version assertion goes immediately after this line
3. `root` must resolve to the repo root in the GitLab validator (need to verify before copy — should match Gitea pattern)

## Test Patterns
- Framework: hand-rolled assert
- Location: `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`
- Invocation: `npm run test:kaola-workflow:gitlab` (or `npm test` which chains all four forge targets)

## Config & Env
- No env vars needed
- `package.json:3` is the canonical version source (`3.10.0`)

## External Docs
None required.

## GitHub Issue
KaolaBrother/Kaola-Workflow#125

## Completeness Score
10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | internal patterns sufficient; no external library needed |

## Notes / Future Considerations
- "Consider a shared helper" from the issue is advisory only; only 2 forge editions have `.claude-plugin/plugin.json` so a helper is low-priority. Marked out of scope for this issue.
- Verify that `root` in the GitLab validator resolves to repo root before copying Gitea assertion verbatim.
