# Phase 1 - Research / Discovery: issue-85

## Deliverable

Add end-to-end regression tests proving the full closure and parallel workflow guarantees:
1. GitHub merge E2E: startup → parallel second claim → worktree-finalize → finalize → sink-merge → no active folder/worktree remains
2. GitHub PR fallback E2E: startup → worktree-finalize → finalize (--keep-worktree) → sink-pr (offline) → archive + pr_url + clean worktree
3. Parallel independence: two startups → finalize one → assert the other is unaffected

Document why GitLab E2E is out of scope (no OFFLINE guard in GitLab scripts).

## Why

Current tests cover individual steps (finalize, sink-merge, sink-pr) in isolation with manually planted state. No single regression proves the full chain end-to-end. The codebase can pass current validators while breaking closure cleanup, sink metadata, or parallel independence in realistic command orderings.

## Affected Area

- `scripts/simulate-workflow-walkthrough.js` — add 2-3 new test functions
- No changes to `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` (Codex surface, sync-forbidden)
- No changes to GitLab simulate files (OFFLINE not supported in GitLab scripts)
- `CHANGELOG.md` — new entry

## Key Patterns Found

1. **E2E test pattern** — `testSinkMergeFromLinkedWorktree` (line 748): real git repo + worktree in tmpdir, plant files, spawnSync claim.js subcommands, assert filesystem state + git branch list
2. **Async E2E pattern** — `testSinkPrLeavesCleanWorktree` (line 913): async function + spawn + runNodeAsync for PR path
3. **Startup test pattern** — `testFinalizeReleaseCleansWorktree` (line 573): runs `startup --target-issue N` via `runNode`, asserts JSON and worktree path
4. **Git repo setup** — `execFileSync('git', ['init', '-b', 'main'], { cwd: tmp })` + user config + empty commit + worktree add
5. **Clean worktree check** — `git status --porcelain --untracked-files=no` = empty string

## Test Patterns

- Framework: hand-rolled `assert` (no test framework)
- Location: `scripts/simulate-workflow-walkthrough.js`
- Structure: `function testFoo() { tmp = mkdtemp; try { arrange+act+assert; } finally { rmSync(tmp); }; console.log('testFoo: PASSED'); }`
- Async variant: `async function testFoo()` + `await runNodeAsync(...)`
- OFFLINE: always pass `KAOLA_WORKFLOW_OFFLINE: '1'` in env
- git imports already at top of file: `const { execFileSync } = require('child_process')` ... check line 7

## Config & Env

- `KAOLA_WORKFLOW_OFFLINE=1` — skips GitHub API, issue close, push; worktree provisioning skipped when offline
- `KAOLA_WORKFLOW_OFFLINE` not supported in GitLab claim/sink scripts — constraint on GitLab E2E scope

## External Docs

None — internal behavior only.

## GitHub Issue

kaola-workflow#85

## Completeness Score

10/10

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | internal behavior only; no external API or framework | |

## Notes / Future Considerations

- GitLab E2E E2E requires adding OFFLINE support to `kaola-gitlab-workflow-claim.js` and both sink scripts — that's a separate issue (scope creep from #85).
- `cmdWorktreeFinalize` (lines 531-544) copies artifacts from main worktree into linked worktree — relevant for the full chain; must be included in E2E tests if artifact mirroring is part of the acceptance criteria.
- `testStartupJsonAndSiblingWorktrees` (line 421) already checks two worktree paths exist in parallel — new parallel independence test extends this to assert one finalize doesn't affect the other.
