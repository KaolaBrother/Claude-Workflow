# Phase 1 - Research / Discovery: issue-86

## Deliverable

Close three GitLab parity gaps relative to GitHub active-folder safeguards:
1. `cmdRelease()` — add CWD guard (refuse to discard current working directory)
2. `cmdStatus()` — return `{ active, drift, count }` with closed-issue drift detection
3. `commands/workflow-next.md` — add freshness-block cleanup and co-active-folder advisory

Add regression tests proving release-CWD refusal, status drift reporting, and confirm existing cleanup tests stay green.

## Why

GitLab runs can silently discard from a risky CWD, hide stale folders for closed issues, and leave a claimed folder/worktree behind when startup succeeds but a subsequent Git freshness block occurs. That weakens cleanup parity and parallel-work isolation.

## Affected Area

- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js` — cmdRelease (lines 434-443) + cmdStatus (lines 445-449)
- `plugins/kaola-workflow-gitlab/commands/workflow-next.md` — add two subsections under Startup Step 1 and Step 3
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js` — add tests for CWD guard and drift
- `CHANGELOG.md` — new entry

## Key Patterns Found

1. **cwdInside helper** — `scripts/kaola-workflow-claim.js:454-458`: `fs.realpathSync(process.cwd())` + `fs.realpathSync(target)` + `startsWith`; add verbatim to GitLab claim script
2. **cmdRelease CWD guard** — `scripts/kaola-workflow-claim.js:465`: `if (cwdInside(folder.project_dir)) { output({...}, 1); return; }` before archiveProjectDir
3. **cmdStatus drift pattern** — `scripts/kaola-workflow-claim.js:472-485`: `readActiveFolders(root, { excludeClosedIssues: false })` + split on `issueIsClosed` → `{ active, drift, count }`
4. **freshness-block recovery** — `commands/workflow-next.md:145-159`: `git pull --ff-only` retry + release cleanup (`node "$CLAIM_JS" release --project "$KAOLA_PROJECT" --reason git-freshness-block`)
5. **co-active advisory** — `commands/workflow-next.md:207-211`: "Do NOT merge, interleave, or batch commits from different active folders" subsection
6. **GitLab test pattern** — `test-gitlab-workflow-scripts.js:367-373`: `withForge({stubs}, () => {...})` blocks; node `assert`; spawnSync claimScript; assert filesystem state

## Test Patterns

- Framework: Node.js `assert`, no external framework
- Location: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`
- Structure: top-level `{ ... }` blocks; forge-dependent tests use `withForge({stubs}, callback)`
- Runner: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`

## Config & Env

- No new env vars
- `issueIsClosed` already available in `kaola-gitlab-workflow-active-folders.js:40`
- `readActiveFolders(..., { excludeClosedIssues: false })` already supported in active-folders.js:77
- `folder.project_dir` already populated by GitLab readActiveFolders (active-folders.js:99)
- GitLab SKILL.md already has freshness block recovery; command file does not

## External Docs

None — internal behavior only.

## GitHub Issue

KaolaBrother/Kaola-Workflow#86

## Completeness Score

10/10

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | internal behavior only; no external API or framework | |

## Notes / Future Considerations

- GitLab SKILL.md already has freshness block recovery (lines 152-168) but missing co-active advisory — SKILL.md also needs the co-active advisory added for full parity
- The GitLab SKILL.md uses `PICK_NEXT_PROJECT` variable name instead of `KAOLA_PROJECT` for the release command — preserve that difference in SKILL.md update
- issueIsClosed uses forge.viewIssue() — existing `withForge({stubs})` test pattern supports stubbing this for the status drift test
