# TDD Task 2 (A2): Fix claim.js — archive guard in cmdSinkFallback (Bug 2)

## Modified Files
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js`
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

## RED Evidence
```
AssertionError [ERR_ASSERTION]: updated should be false
true !== false
    at Object.<anonymous> (.../test-gitlab-sinks.js:265:12)
```
Test 1 (archived project) failed — unfixed `cmdSinkFallback` called `updateState` unconditionally, recreated the directory, and returned `{updated: true}`.

## GREEN Evidence
```
GitLab sink tests passed
```

## Changes
1. Added `isSafeName` assert to `cmdSinkFallback`
2. Added `fs.existsSync(projectDir(root, args.project))` guard with early return `{updated: false, reason: 'project archived'}`
3. Added `spawnSync` to `child_process` destructure, `claimScript` constant
4. Added 3 Bug 2 test blocks (archived skip, live dir present, unsafe name)

## Deviations
None. Write set respected.
