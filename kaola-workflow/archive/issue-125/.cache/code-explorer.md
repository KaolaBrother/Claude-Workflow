# Code Explorer Output — Issue #125

## Key Findings

### Version Drift
- `plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json:3` → `"version": "3.8.1"` (drifted)
- `plugins/kaola-workflow-gitea/.claude-plugin/plugin.json:3` → `"version": "3.10.0"` (target)
- `package.json:3` → `"version": "3.10.0"` (canonical source)

### Gitea version assertion (reference — lines 93-94 of validate-kaola-workflow-gitea-contracts.js)
```js
assert(claudePluginJson.version === require(path.join(root, 'package.json')).version,
  'Gitea Claude plugin version must match package.json');
```

### GitLab validator around line 93 (missing assertion)
```js
const claudePluginJson = parseJson(pluginRoot + '/.claude-plugin/plugin.json');
assert(String(claudePluginJson.name || '').includes('gitlab'), 'GitLab Claude plugin name must identify GitLab');
// <-- version assertion absent here; next line jumps to marketplace check
const marketplace = parseJson('.agents/plugins/marketplace.json');
```

### Plugin.json inventory
| Path | Version |
|------|---------|
| `plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json` | `3.8.1` (fix target) |
| `plugins/kaola-workflow-gitea/.claude-plugin/plugin.json` | `3.10.0` |
| Other `.codex-plugin/plugin.json` files | not checked (out of scope) |

### Shared helper
None exists. Only 2 forge editions have `.claude-plugin/plugin.json` (GitLab + Gitea). "Consider shared helper" is advisory and out of scope for this issue.

### Validation invocation
`npm test` → `test:kaola-workflow:gitlab` → `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`

## Important: Verify `root` Definition
Before copying the Gitea assertion verbatim, confirm that `root` is defined the same way in the GitLab validator (should resolve to the repo root where `package.json` lives).
