# Code Explorer — issue-123

## Shape A vs Shape B

**Shape A (GitHub Codex sim — `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`, 119 lines):**
- Substantive: runs startup --runtime codex, asserts claim/owned, runs install-codex-agent-profiles.js
- Requires `install-codex-agent-profiles.js` which does NOT exist in the Gitea plugin
- Out of scope for #123

**Shape B (GitLab Codex sim — `plugins/kaola-workflow-gitlab/scripts/simulate-gitlab-codex-workflow-walkthrough.js`, 22 lines):**
- Thin wrapper: re-runs 3 subscripts in sequence
- Code:
  ```js
  #!/usr/bin/env node
  'use strict';
  const { execFileSync } = require('child_process');
  const path = require('path');
  const root = path.resolve(__dirname, '..', '..', '..');
  function run(script) {
    execFileSync(process.execPath, [path.join(root, 'plugins/kaola-workflow-gitlab/scripts', script)], {
      cwd: root, encoding: 'utf8', stdio: 'pipe'
    });
  }
  run('validate-kaola-workflow-gitlab-contracts.js');
  run('test-gitlab-workflow-scripts.js');
  run('test-gitlab-sinks.js');
  console.log('GitLab Codex workflow walkthrough simulation passed');
  ```
- Adds no new coverage — re-runs same subscripts for naming/symmetry
- **This is the correct model for Gitea**

## Files to Modify

### package.json line 39 (test:kaola-workflow:gitea)
Current:
```json
"test:kaola-workflow:gitea": "node scripts/validate-vendored-agents.js && node plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js && node plugins/kaola-workflow-gitea/scripts/simulate-gitea-workflow-walkthrough.js"
```
Required: append `&& node plugins/kaola-workflow-gitea/scripts/simulate-gitea-codex-workflow-walkthrough.js`

### validate-kaola-workflow-gitea-contracts.js lines 120-131
`scriptFiles` array currently ends with `'simulate-gitea-workflow-walkthrough.js'` (line 130).
Must add `'simulate-gitea-codex-workflow-walkthrough.js'` after it.
Do NOT add to `installSupportScripts` (lines 135-145).

## Gitea Codex Sim Subscripts
Mirror GitLab exactly:
1. `validate-kaola-workflow-gitea-contracts.js`
2. `test-gitea-workflow-scripts.js`
3. `test-gitea-sinks.js`

Note: `simulate-gitea-workflow-walkthrough.js` also runs `test-gitea-forge-helpers.js`. GitLab Codex does not run forge helpers. Mirror GitLab — omit forge helpers from Codex sim.

## Success Message
`'Gitea Codex workflow walkthrough simulation passed'`

## Out-of-Scope Note
- `install-codex-agent-profiles.js` missing from Gitea plugin — pre-existing gap, separate issue
- The init SKILL.md references it (line 118) — not to be fixed here
