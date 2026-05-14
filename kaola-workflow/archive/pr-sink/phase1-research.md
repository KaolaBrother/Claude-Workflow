# Phase 1 - Research / Discovery: pr-sink

## Deliverable

`scripts/kaola-workflow-sink-pr.js` — Node.js PR-sink script that pushes the feature branch, opens a GitHub PR via `gh pr create`, records the PR URL in `phase6-summary.md`, and optionally enables auto-merge via `gh pr merge --auto`.

Plus:
- `commands/workflow-next-pr.md` — new router command identical to `workflow-next.md` but sets `sink: pr` in the Lease/Sink block before routing
- `watch-pr --issue N` subcommand in `scripts/kaola-workflow-claim.js` — polls `gh pr view` to detect merge/close; calls release on completion
- `sink: auto-merge | pr` discriminator field added to the `## Sink` block written by `claim.js updateSinkLease()`
- `commands/kaola-workflow-phase6.md` Step 8 updated: dispatch by `sink:` field (auto-merge → sink-merge.js, pr → sink-pr.js)
- `phase6-pr-body.md` template (generated per-project at `kaola-workflow/{project}/phase6-pr-body.md`)
- `pr_auto_merge: false` default in `~/.config/kaola-workflow/config.json`

## Why

Enables `/goal use kaola-workflow on issue #N and open a PR` to work end-to-end: feature branch pushed, PR opened, lease held until PR merges or closes, then lease released automatically. Allows multi-session use with PR-review gates instead of immediate auto-merge.

## Affected Area

| Path | Change |
|------|--------|
| `scripts/kaola-workflow-sink-pr.js` | NEW — PR sink script |
| `commands/workflow-next-pr.md` | NEW — PR-mode router command |
| `scripts/kaola-workflow-claim.js` | MODIFY — add `watch-pr --issue N` subcommand; add `sink:` field to `updateSinkLease()` |
| `commands/kaola-workflow-phase6.md` | MODIFY — Step 8 dispatch: sink-merge vs sink-pr by `sink:` field |
| `install.sh` | MODIFY — add `kaola-workflow-sink-pr.js` to copy loop |
| `scripts/validate-workflow-contracts.js` | MODIFY — assertions for new script + install.sh entry + phase6.md dispatch |
| `scripts/simulate-workflow-walkthrough.js` | MODIFY — Epic Case 7 (PR sink scenarios) |
| `README.md` | MODIFY — document `/workflow-next-pr`, `sink-pr.js`, `pr_auto_merge` config |
| `CHANGELOG.md` | MODIFY — entry under [Unreleased] |

## Key Patterns Found

1. **Primary mirror** — `scripts/kaola-workflow-sink-merge.js:1-174`: shebang, stdlib + child_process, OFFLINE const, FORCE_FF_FAIL test flag, args: `--branch`, `--issue`, `--project`; 10-step execution; `process.exitCode = N` not `process.exit()`; top-level `try { main() } catch`
2. **Config pattern** — `scripts/kaola-workflow-classifier.js:47-56`: `readOrCreateConfig()` reads `~/.config/kaola-workflow/config.json`; creates with safe defaults if absent
3. **Branch naming** — `scripts/kaola-workflow-claim.js:100-102`: `workflow/issue-{N}-{project}` or `workflow/{project}`; branch already in `## Sink` block of `workflow-state.md`
4. **Sink block schema** — `scripts/kaola-workflow-claim.js:104-115`: `## Sink` block written at claim time with `branch:`, `issue_number:`, `claimed_at:`. No `sink:` discriminator field yet — must add.
5. **Lock file schema** — `claim.js:188-199`: `{project, session_id, machine_id, claimed_at, expires, last_heartbeat, issue_number, claim_comment_id}`; branch stored in `## Sink` block of workflow-state.md, not in lock file
6. **Subcommand dispatcher** — `claim.js:382`: `claim | release | heartbeat | sweep | status | patch-branch`. Pattern: `if (sub === 'X') return cmdX(); throw new Error('unknown subcommand')`
7. **release** — `claim.js:224-250`: `--session <id>`; removes label, deletes lock file, deletes session file
8. **Epic Case git scaffolding** — `simulate-workflow-walkthrough.js:410-558`: `git init --bare` remote, `git clone`, `execFileSync(process.execPath, [script, ...args], { cwd, env: {...process.env, KAOLA_WORKFLOW_OFFLINE:'1'} })`; gh shim via PATH prepend (pattern from Epic Case 6E)
9. **Phase 6 dispatch location** — `commands/kaola-workflow-phase6.md:427-452` (Step 8 Sink Merge): currently unconditional sink-merge invocation; must become conditional on `sink:` field
10. **Contract assertions** — `validate-workflow-contracts.js:192-198`: assertIncludes for sink-merge.js across install.sh, kaola-workflow-phase6.md, and own file

## Test Patterns

- Framework: hand-rolled Node.js assertions (no external framework)
- Location: `scripts/validate-workflow-contracts.js` (static), `scripts/simulate-workflow-walkthrough.js` (dynamic)
- Structure: Epic Case 7 mirrors Cases 2/3/4 (sink-merge) structure with gh shim for `gh pr create/view/merge`
- sub-tests: 7A (sink-pr happy path, pr opened), 7B (auto-merge flag enabled), 7C (watch-pr detects merge → release), 7D (watch-pr detects closed-without-merge → release aborted), 7E (OFFLINE — skip network ops), 7F (workflow-next-pr routes to sink: pr dispatch)

## Config & Env

- `KAOLA_WORKFLOW_OFFLINE=1` — skips all gh/git-remote operations
- `KAOLA_WORKFLOW_FORCE_FF_FAIL=<n>` — NOT needed for sink-pr (no FF merge)
- New env flag: none (pr_auto_merge goes in config.json, not env)
- Config: `~/.config/kaola-workflow/config.json` — add `pr_auto_merge: false` default
- Sink discriminator: `sink: pr | auto-merge` written to `## Sink` block in workflow-state.md by `claim.js updateSinkLease()`

## External Docs

None — `gh` CLI is already a project dependency. `gh pr create`, `gh pr view --json state,mergedAt,url`, `gh pr merge --auto --squash` are used.

## GitHub Issue

KaolaBrother/Kaola-Workflow#7

## Completeness Score

9/10

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | stdlib + gh CLI; no external APIs or frameworks |

## Notes / Future Considerations

- `commands/workflow-next-pr.md` can be a near-copy of `workflow-next.md` with one change: the bash block in Step 0 that calls `claim.js claim` must set `sink: pr` via a new `--sink pr` flag on `claim.js claim`, or the command file prose instructs the LLM session to set the sink field.
- `watch-pr` runs lazily on `/workflow-next` startup (not as a daemon). If a session never reopens, the lease expires and is swept (issue #9/10 handles lease expiry).
- Codex parity (issue #8) wires `commands/codex-workflow-next-pr.md` to the same `sink-pr.js`; that is out of scope here.
- `kaola-workflow-phase6.md` cap: unknown; must check line count before adding dispatch lines.
