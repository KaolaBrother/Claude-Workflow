# TDD Task 1 Evidence: issue-76

## Scope

Implemented the Phase 3 plan:

- Vendored 9 Claude Code agent files under `agents/`.
- Added `scripts/validate-vendored-agents.js`.
- Updated `install.sh` to install managed agents and remove the ECC prompt.
- Updated `uninstall.sh` to remove only marked managed agents.
- Updated README, package metadata, lockfile, command wording, and agent source docs.

## Validation

- `node scripts/validate-vendored-agents.js` -> passed.
- `bash -n install.sh uninstall.sh` -> passed.
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); JSON.parse(require('fs').readFileSync('package-lock.json','utf8'))"` -> passed.
- `HOME=$(mktemp -d) bash install.sh --yes < /dev/null` -> status 0, 9 agent files, 9 managed markers.
- `HOME=$(mktemp -d) bash install.sh < /dev/null` -> status 0, 9 agent files, 9 managed markers.
- `HOME=$(mktemp -d) bash install.sh --yes --forge=gitlab < /dev/null` -> status 0, 9 agent files, 9 managed markers.
- `uninstall.sh --forge=all` sandbox -> 0 managed agents left, user-added agent preserved, manifest removed.
- Modified managed agent sandbox -> second install skipped modified file and preserved user edit.
- `npm test` -> passed.
- `npm run test:kaola-workflow:gitlab` -> passed.
- `git diff --check` -> passed.
- `npm pack --dry-run --json` -> passed and included all 9 `agents/*.md` files plus `docs/agents-source.md`.

## RED/GREEN Notes

The issue is installer/docs behavior rather than a conventional unit surface. The RED baseline was reproduced before implementation: no-stdin install exited before command/support installation, and `--yes` installed no agents. GREEN evidence is the sandboxed installer acceptance checks above.
