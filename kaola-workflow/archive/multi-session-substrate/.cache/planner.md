# Planner Output — multi-session-substrate Phase 2

## Three Implementation Approaches

### Approach A (RECOMMENDED): Monolithic `kaola-workflow-claim.js` + `/workflow-init` installs pre-commit + `KAOLA_WORKFLOW_OFFLINE` for tests

Single flat script `scripts/kaola-workflow-claim.js`, mirroring `kaola-workflow-repair-state.js` structure. Subcommands dispatched by `process.argv[2]`. O_EXCL lock via `fs.openSync(lockPath, 'wx')`. Pre-commit hook installed by `/workflow-init` slash command. Phase-boundary heartbeats only. `KAOLA_WORKFLOW_OFFLINE=1` skips `gh` calls in tests.

Pros: Matches strongest existing precedent; honors KISS/YAGNI; no helper modules for single feature; `/workflow-init` is natural per-repo trigger; env-var test isolation avoids network in tests.
Cons: ~500–650 lines (below 800 ceiling but above 200–400 typical); hook-install responsibility on `/workflow-init`.
Complexity: Medium. Risk: Low–Medium.

### Approach B: Split into `kaola-workflow-claim.js` + `lib/lock-store.js` + `lib/session.js`

Factor lock I/O, session identity, gh calls into `scripts/lib/` helper modules.

Pros: Cleaner unit-test seams; smaller individual files.
Cons: Zero precedent for `scripts/lib/`; violates YAGNI (one consumer); integration-only test model means no actual coverage gain.
Complexity: Medium–High. Risk: Medium.

### Approach C: Monolithic claim.js + `install.sh --in-project` mode + PATH-shim `gh` stub for tests

Same script structure as A, but extend `install.sh` with in-project mode for pre-commit hook.

Pros: Single install entry point.
Cons: Dual-purpose `install.sh` contract ambiguous; PATH shim fragile cross-shell; hook only installed at install time not on fresh clones.
Complexity: High. Risk: Medium–High.

## Recommendation

**Approach A.** Fully matches existing conventions. Both downsides are mitigable.

## Architectural Fit (Approach A)

Files to CREATE:
- `scripts/kaola-workflow-claim.js`
- `hooks/kaola-workflow-pre-commit.sh`

Files to EXTEND:
- `commands/workflow-init.md` — add pre-commit hook installation
- `commands/kaola-workflow-phase{1..6}.md` — add one heartbeat invocation line each
- `.gitignore` — add kaola-workflow/.locks/, kaola-workflow/.sessions/
- `scripts/validate-workflow-contracts.js` — assert new files + .gitignore entries
- `scripts/simulate-workflow-walkthrough.js` — extend with epic Case 1

Files with NO CHANGES:
- `install.sh`, `uninstall.sh`
- `scripts/validate-kaola-workflow-contracts.js` (Codex validator — out of scope, deferred to #8)
- `plugins/kaola-workflow/scripts/` (Codex mirrors — deferred to #8)
- `hooks/hooks.json` (Claude Code hooks — git hooks are different)
- `package.json`

## Explicit Non-Goals

- No branch cutting (Sink.branch: TBD)
- No cross-machine race handling (deferred #9)
- No background heartbeat ticker (deferred #9)
- No Codex-side parity (deferred #8)
- No npm dependencies
- `~/.config/kaola-workflow/machine-id` not removed by uninstall.sh
- No changes to install.sh

## Defaults Declared

1. `status --json` shape: `{ session, lock, remote: { assignee, has_label, sentinel_comment_id }, consistent, drift[] }`
2. Pre-commit hook policy: only gates paths under `kaola-workflow/{project}/`; multi-project commit → fail with "split your commit"
3. Sweep removes remote label + posts released:stale comment (otherwise crash leaves zombie GitHub state)
4. Pre-commit install: `/workflow-init` with sentinel-bounded block; on foreign hook → write `pre-commit.kaola-workflow` + guide
5. Test offline flag: `KAOLA_WORKFLOW_OFFLINE=1`
6. session-id: `crypto.randomUUID()`
7. `claim_comment_id` exposed in workflow-state.md `## Lease` block

## Risks to Surface

- `gh` not installed: detect and fail with actionable message
- Lock fsync: call `fs.fsyncSync(fd)` before close (crash-safety)
- EEXIST race readback: 3-attempt retry with 50ms gap before declaring owned
- Pre-commit hook performance: under 100ms; no `gh` calls in hook
- `workflow-state.md` field name collision: do not reuse `started:` or `expires:` outside Lease block

## Open Questions Blocking Coding

None. All decisions can be made by implementer following this plan.
