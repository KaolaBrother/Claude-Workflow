# TDD Task 1 — Fix readPriorityConfig + regression test

## Modified Files

- `scripts/kaola-workflow-claim.js` — readPriorityConfig body (path+key), module.exports (+readPriorityConfig)
- `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` — byte-identical copy via cp
- `scripts/simulate-workflow-walkthrough.js` — testReadPriorityConfig function + main() call
- `CHANGELOG.md` — entry under [Unreleased]

All changes made in linked worktree: `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-84`

## RED Evidence

```
TypeError: readPriorityConfig is not a function
    at testReadPriorityConfig (.../simulate-workflow-walkthrough.js:972:22)
```

`readPriorityConfig` was not in `module.exports`, so destructuring yielded `undefined`.

## GREEN Evidence

```bash
$ node scripts/validate-script-sync.js
OK: 8 common scripts in sync.

$ node scripts/simulate-workflow-walkthrough.js
...
testReadPriorityConfig: PASSED
Workflow walkthrough simulation passed
```

## Deviations

None. Exactly 4 files modified, all within the write set.
