# TDD Task 1 Evidence - issue-24

## RED

Added walkthrough expectations for a `startup` command that did not exist yet:

- root simulation checks for startup receipt writing, issue sync before selection, skipped claimed issue, dependency-blocked issue, and next actionable issue selection
- packaged Codex simulation mirrors the same behavior
- contract validators require `cmdStartup`, receipt helpers, startup prompt usage, and startup receipt guard text

These expectations failed before implementation because `kaola-workflow-claim.js` had no `startup` subcommand or receipt contract.

## GREEN

Implemented `startup` in the shared claim script and copied it to the packaged Codex script.

Behavior added:

- fetch open GitHub issue records online
- sort candidates by `workflow:queued`, then issue number
- sync issues into `.roadmap` and regenerate `ROADMAP.md` before selection
- run sweep and watch-pr
- return owned work for the same session
- classify/claim first actionable candidate
- record skipped and blocked candidates
- write `kaola-workflow/.sessions/{session}.startup.json`

## Validation

- `node scripts/validate-workflow-contracts.js` passed
- `node scripts/validate-kaola-workflow-contracts.js` passed
- `node scripts/simulate-workflow-walkthrough.js` passed
- `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` passed
- `npm test` passed
- `git diff --check` passed
