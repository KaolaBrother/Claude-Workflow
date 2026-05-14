# Kaola-Workflow — Claude Code Instructions

## Project Overview
Kaola-Workflow is a 6-phase multi-session workflow system built on top of GitHub issues and Claude Code. The core scripts live in `scripts/`. Workflow state is tracked per-project under `kaola-workflow/{project}/`.

## Key Scripts
- `scripts/kaola-workflow-claim.js` — claim, release, heartbeat, sweep, status, patch-branch, watch-pr subcommands
- `scripts/simulate-workflow-walkthrough.js` — integration test suite (hand-rolled assert, no framework)
- `scripts/kaola-workflow-roadmap.js` — roadmap generation from GitHub issues

## Running Tests
```bash
node scripts/simulate-workflow-walkthrough.js
```
Must exit 0 with "Workflow walkthrough simulation passed".

## Documentation Update Checklist

- [ ] README.md - update feature list, usage examples, env vars
- [ ] API docs - add/update endpoint descriptions and examples
- [ ] CHANGELOG.md - add entry under [Unreleased]
- [ ] Architecture docs - update if structure changed
- [ ] .env.example - add any new environment variables
- [ ] Inline comments - update where public interfaces changed
