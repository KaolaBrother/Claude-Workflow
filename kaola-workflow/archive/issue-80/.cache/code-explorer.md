# Code Explorer Output — Issue #80

## Bug Location

`commands/workflow-next.md` lines 136-146 — `### Git Freshness Block Recovery` section:
- Prescribes only `git fetch --prune && git pull --ff-only && git status --short --branch`
- If the block persists, guidance says "resolve manually before retrying"
- **No `release` or `discard` call** — the claimed folder and worktree remain live (orphaned)

## Reference Implementation (Correct)

`plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` lines 129-137:
```bash
node "$claim_script" release --project "$KAOLA_PROJECT" --reason git-freshness-block
```
Explicit cleanup: releases just-claimed folder, removes worktree, then stops.

## Also Affected

`plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md` — missing the `Git Freshness Block Recovery` subsection entirely (goes directly from startup handling to Git classification commands at lines 124-144).

## `release`/`discard` Subcommand Behavior

Both are aliases for `cmdRelease` (`scripts/kaola-workflow-claim.js` line 598):
```js
if (sub === 'release' || sub === 'discard') return cmdRelease();
```

`cmdRelease` (lines 464-474):
1. Looks up active folder by `--project` or `--issue`
2. Guards against discarding current working directory
3. `archiveProjectDir(root, folder.project, 'abandoned', '.discarded-TIMESTAMP')` — moves folder to archive
4. `removeWorktree(root, folder.project, folder)` — `git worktree remove --force`
5. `clearAdvisoryClaim(folder.issue_number, reason)` — removes `workflow:in-progress` label, posts comment

Flags: `--project <name>`, `--issue <N>`, `--reason <string>`

## Variable Extraction Pattern

`commands/workflow-next.md` uses this pattern (line 92) to extract `KAOLA_WORKTREE_PATH`:
```bash
KAOLA_WORKTREE_PATH="$(node -e "try{process.stdout.write(JSON.parse(process.argv[1]).worktree_path||'')}catch(e){}" "$STARTUP_OUT" 2>/dev/null)"
```
Same pattern needed to extract `KAOLA_PROJECT` from `selected_project` field of `$STARTUP_OUT`.

## Test Coverage Gap

`simulate-workflow-walkthrough.js` has 22 named test functions. `testFinalizeReleaseCleansWorktree` (lines 572-602) tests that `release` removes worktrees, but there is **no test** for:
> startup acquired → Git freshness block → release called → no orphaned folder remains

## Architecture Notes

- Startup is atomic; cleanup is agent-driven (no compensating transaction in script)
- `cmdRelease` code is already correct — only agent instruction docs need updating
- No script changes needed for the fix
