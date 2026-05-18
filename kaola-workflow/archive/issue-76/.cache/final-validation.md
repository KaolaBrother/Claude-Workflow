# Final Validation: issue-76

Final validation was run against the final candidate state.

## Commands

- `npm test` -> passed.
  - `node scripts/validate-script-sync.js` -> passed.
  - `node scripts/validate-vendored-agents.js` -> passed for 9 agents at `922d2d8f8b64f4e50936e24465cb3bcac81ac0e1`.
  - `bash -n install.sh uninstall.sh` -> passed.
  - `node scripts/validate-workflow-contracts.js` -> passed.
  - `node scripts/simulate-workflow-walkthrough.js` -> passed.
  - `node scripts/validate-kaola-workflow-contracts.js` -> passed.
  - `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` -> passed.
- `npm run test:kaola-workflow:gitlab` -> passed.
  - `node scripts/validate-vendored-agents.js` -> passed.
  - `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` -> passed.
  - `node plugins/kaola-workflow-gitlab/scripts/simulate-gitlab-workflow-walkthrough.js` -> passed.
  - `node plugins/kaola-workflow-gitlab/scripts/simulate-gitlab-codex-workflow-walkthrough.js` -> passed.
- `git diff --check` -> passed.
- `npm pack --dry-run --json` -> passed; package includes all 9 `agents/*.md` files and `docs/agents-source.md`.

## Targeted Acceptance Checks

- `HOME=$(mktemp -d) bash install.sh --yes < /dev/null` -> status 0, 9 agent files, 9 managed markers.
- `HOME=$(mktemp -d) bash install.sh < /dev/null` -> status 0, 9 agent files, 9 managed markers.
- `HOME=$(mktemp -d) bash install.sh --yes --forge=gitlab < /dev/null` -> status 0, 9 agent files, 9 managed markers.
- `uninstall.sh --forge=all` sandbox -> 0 managed agents left, user-added agent preserved, manifest removed.
- Modified managed agent sandbox -> second install skipped modified file and preserved user edit.

## Result

PASSED
