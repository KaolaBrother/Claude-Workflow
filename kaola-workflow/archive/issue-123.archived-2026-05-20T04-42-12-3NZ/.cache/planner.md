# Planner Output — issue-123

## Recommendation: Option A — Shape B thin wrapper (mirror GitLab exactly)

### Rationale
The Gitea Codex plugin surface is identical in shape to GitLab's (no install-codex-agent-profiles.js). Coverage parity means the same three subscripts GitLab runs. Option A is a strict mirror of the verified GitLab Codex precedent with zero new feature surface.

### Three files:
1. CREATE: `plugins/kaola-workflow-gitea/scripts/simulate-gitea-codex-workflow-walkthrough.js` — thin execFileSync wrapper (~22 lines)
2. MODIFY: `plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js` — add to scriptFiles array after 'simulate-gitea-workflow-walkthrough.js'
3. MODIFY: `package.json` — append to test:kaola-workflow:gitea

### Subscripts to run:
1. validate-kaola-workflow-gitea-contracts.js
2. test-gitea-workflow-scripts.js
3. test-gitea-sinks.js

Success message: `'Gitea Codex workflow walkthrough simulation passed'`

### Out of Scope
- Do NOT create install-codex-agent-profiles.js (Option C)
- Do NOT add test-gitea-forge-helpers.js (Option B)
- Do NOT modify installSupportScripts in contracts validator
- Do NOT modify install.sh or uninstall.sh
