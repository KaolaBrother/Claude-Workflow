# TDD Task 1 — GitLab validator assertion + plugin.json version bump

## Modified Files
1. `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` — inserted version assertion after name assertion at line 93
2. `plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json` — bumped `"version"` from `"3.8.1"` to `"3.10.0"`

## Diff Summary

### validate-kaola-workflow-gitlab-contracts.js (line 93-95 after edit)
```js
assert(String(claudePluginJson.name || '').includes('gitlab'), 'GitLab Claude plugin name must identify GitLab');
assert(claudePluginJson.version === require(path.join(root, 'package.json')).version,
  'GitLab Claude plugin version must match package.json');
```

### plugin.json (line 3)
```json
- "version": "3.8.1"
+ "version": "3.10.0"
```

## RED Evidence
Command: `npm run test:kaola-workflow:gitlab`
Exit code: 1
Error: `Error: GitLab Claude plugin version must match package.json`

## GREEN Evidence
Command: `npm run test:kaola-workflow:gitlab`
Exit code: 0
Output:
```
Kaola-Workflow GitLab contract validation passed
GitLab workflow walkthrough simulation passed
GitLab Codex workflow walkthrough simulation passed
```

## Deviations
None. Only the two specified write-set files were touched.
