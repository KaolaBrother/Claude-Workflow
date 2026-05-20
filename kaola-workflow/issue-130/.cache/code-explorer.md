# Code Explorer Output — Issue #130

## Summary
GitHub claim script (line 612): `if (sub === 'bootstrap' || sub === 'startup') return cmdStartup();`
GitLab claim script (line 596): `if (sub === 'startup') return cmdStartup();` — missing bootstrap
Gitea claim script (line 583): `if (sub === 'startup') return cmdStartup();` — missing bootstrap

## Fix Applied
1. `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js` — added `bootstrap` to usage string + dispatch alias
2. `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-claim.js` — same
3. Both forge validators — added `assertIncludes` for `bootstrap`
