Local code-explorer fallback for roadmap-open-issues.

Scope:
- GitHub issues #14 through #21.
- Affected files: scripts/kaola-workflow-claim.js, scripts/kaola-workflow-classifier.js, scripts/kaola-workflow-sink-merge.js, scripts/simulate-workflow-walkthrough.js, scripts/validate-workflow-contracts.js, scripts/validate-kaola-workflow-contracts.js, commands/kaola-workflow-phase6.md, plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md, plugins/kaola-workflow/scripts/*, kaola-workflow/.roadmap/*.

Patterns found:
- scripts/kaola-workflow-claim.js owns claim, bootstrap, heartbeat/ticker, release, sweep, and PR watch behavior.
- scripts/kaola-workflow-classifier.js owns local lock and issue-body parallelizability classification.
- scripts/kaola-workflow-sink-merge.js owns merge sink behavior and has OFFLINE simulation support.
- scripts/simulate-workflow-walkthrough.js is the broad integration regression suite for multi-session behavior.
- scripts/validate-workflow-contracts.js and scripts/validate-kaola-workflow-contracts.js are fast contract assertions for Claude and Codex paths.
- Codex plugin scripts are packaged under plugins/kaola-workflow/scripts/ and must be self-contained for installed plugin usage.

Test patterns:
- Node scripts use fs.mkdtempSync fixtures, git command scaffolds, and shell-script gh shims.
- Regression checks are direct assert(...) calls inside simulate-workflow-walkthrough.js.
- Contract tests use string and file-existence assertions.

External docs:
- N/A. The work is internal repo behavior and Git/GitHub CLI integration already represented by local fixtures.
