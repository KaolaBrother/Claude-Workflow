# Planner: pr-sink

## Approach A — sink-pr.js mirror + watch-pr subcommand in claim.js (RECOMMENDED)

**Summary**: `sink-pr.js` mirrors `sink-merge.js` (`--branch --issue --project`). Steps: push branch → gh pr create → record PR URL in phase6-summary.md → optional `gh pr merge --auto`. `claim.js claim` gains `--sink {merge|pr}` flag; `updateSinkLease()` writes `sink:` into `## Sink` block. `claim.js watch-pr --issue N` polls `gh pr view --json state,mergedAt,url` from `/workflow-next` Startup Step 0. Phase 6 Step 8 adds 2-line conditional dispatch. `workflow-next-pr.md` is near-copy of `workflow-next.md` with `--sink pr` in Step 0 claim call.

**Pros**: State locality (per-project workflow-state.md); co-active-lease safe; mirrors proven patterns; Phase 6 dispatch is minimal.
**Cons**: claim.js grows by ~70 LOC (still under 800); three files change for one logical concept.
**Risk**: Medium — watch-pr polling loop on critical lease path
**Complexity**: Medium
**Architectural fit**: Strong

## Approach B — Sink discriminator via config flag

**Summary**: Write `sink: "pr"` to `~/.config/kaola-workflow/config.json` at session start; Phase 6 reads config to dispatch. No claim.js changes.

**Pros**: Smallest claim.js change; reuses readOrCreateConfig().
**Cons**: Machine-global config collides when two sessions run with different sinks. Stale-config risk. Violates workflow-state.md as authoritative.
**Risk**: High — cross-session corruption in co-active-lease scenario
**Complexity**: Small
**Architectural fit**: Poor

## Approach C — Separate kaola-workflow-watch-pr.js script

**Summary**: watch-pr is its own top-level script, not in claim.js. Same sink-pr.js and --sink flag.

**Pros**: claim.js stays at current size; watch-pr has single responsibility.
**Cons**: Needs lock/release internals from claim.js — either exec(claim release), duplicate, or export claim internals. DRY risk.
**Risk**: Medium
**Complexity**: Medium-Large
**Architectural fit**: Moderate

## Recommended: Approach A

Rationale: State locality in per-project workflow-state.md; co-active-lease safe; mirrors existing patterns; Phase 6 dispatch minimal.

## Explicit Non-Goals
- Auto-rebase on PR conflicts
- PR review automation (requesting reviewers, approving)
- Draft PRs
- Multi-PR per issue
- CI status gating
- Cross-repo PRs
- Configurable PR title/body template beyond defaults
- watch-pr daemon mode / background polling

## Missing Facts (10 items)
1. watch-pr poll cadence and timeout
2. watch-pr invocation point (Step 0 vs Step 1)
3. Lease expiry semantics while PR open (heartbeat-equivalent?)
4. PR-URL persistence location (phase6-summary.md + ## Sink block?)
5. Behavior when PR closed without merge
6. pr_auto_merge: false semantics (open+stop vs open+still-watch)
7. Branch retention after PR merge (sink-pr.js vs gh pr merge --delete-branch)
8. OFFLINE behavior for sink-pr.js and watch-pr
9. workflow-next-pr.md line budget (same cap as workflow-next.md?)
10. --sink value validation (enum merge|pr, default merge when omitted?)
