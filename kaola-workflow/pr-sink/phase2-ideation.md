# Phase 2 - Ideation: pr-sink

## Approaches Evaluated

### Option A: sink-pr.js mirror + watch-pr subcommand in claim.js (RECOMMENDED)
- Summary: `sink-pr.js` mirrors `sink-merge.js` (push branch → gh pr create → record PR URL → optional gh pr merge --auto). `claim.js claim` gains `--sink {merge|pr}` flag; `updateSinkLease()` writes `sink:` into `## Sink` block. `claim.js watch-pr` scans ALL `.lock` files (not one project) for `sink: pr` entries and polls `gh pr view --json state,mergedAt,url,number,closedAt`. `workflow-next-pr.md` is a thin wrapper (≤40 lines) that sets `sink: pr` in the Sink block and delegates to `/workflow-next`. Phase 6 Step 8 gains a 2-line conditional dispatch.
- Pros: State locality in per-project workflow-state.md; co-active-lease safe; mirrors proven patterns; Phase 6 dispatch is minimal; multi-project polling is correct by scanning all locks
- Cons: claim.js grows by ~70 LOC (still under 800); three files change for one logical concept
- Risk: Medium — watch-pr polling on critical lease path
- Complexity: Medium
- Architectural fit: Strong

### Option B: Sink discriminator via config flag
- Summary: Write `sink: "pr"` to `~/.config/kaola-workflow/config.json` at session start; Phase 6 reads config to dispatch. No claim.js changes.
- Pros: Smallest claim.js change; reuses readOrCreateConfig()
- Cons: Machine-global config collides when two sessions run with different sinks. Stale-config risk. Violates workflow-state.md as authoritative.
- Risk: High — cross-session corruption in co-active-lease scenario
- Complexity: Small
- Architectural fit: Poor

### Option C: Separate kaola-workflow-watch-pr.js script
- Summary: watch-pr is its own top-level script, not in claim.js. Same sink-pr.js and --sink flag.
- Pros: claim.js stays at current size; single responsibility
- Cons: Needs lock/release internals from claim.js — either exec(claim release), duplicate, or export claim internals. DRY risk.
- Risk: Medium
- Complexity: Medium-Large
- Architectural fit: Moderate

## Advisor Findings

Approach A confirmed as correct. Two critical corrections applied:

1. **watch-pr must scan ALL locks**: The planner's description of `watch-pr --issue N` reading "the current project's workflow-state.md" breaks the multi-project case. Fix: `watch-pr` iterates every `.lock` file (same pattern as `sweep`), and for each with `sink: pr` and a `pr_url`, calls `gh pr view` and acts. Optional `--issue N` for targeted testing only.

2. **workflow-next-pr.md must be a thin wrapper**: Near-copy of workflow-next.md creates drift risk. Fix: `workflow-next-pr.md` is 5-10 lines that sets `sink: pr` in the `## Sink` block and delegates to `/workflow-next`. Cap assertion: `routerLines <= 40`.

Missing facts resolved:
- watch-pr cadence: one-shot per `/workflow-next` startup; no script-level timeout
- Invocation point: Startup Step 0, order: sweep → watch-pr → classify → claim
- Lease expiry while PR open: watch-pr updates `last_heartbeat` AND extends `expires`; normal 24h sweep handles if user goes idle
- PR-URL persistence: BOTH `phase6-summary.md` AND `## Sink` block (`pr_url:`, `pr_number:` lines)
- PR closed without merge: release reason=aborted, do NOT delete branch, issue stays open
- pr_auto_merge: false semantics: open PR, do not pass --auto, still watch; user merges manually
- Branch deletion on merge: `gh pr merge --auto --squash --delete-branch` (GitHub handles remote); watch-pr detects merge → `git branch -D` (local only); no double-delete
- OFFLINE behavior: write `pr_url: OFFLINE_PLACEHOLDER`, `pr_number: 0` to both places; exit 0
- --sink validation: enum `merge|pr`, default `merge` when omitted
- Phase 3 DRY: extract `releaseSession(sessionId, reason)` helper from `cmdRelease` so watch-pr calls it directly

Backward compatibility: absent `sink:` field in `## Sink` block defaults to `merge` (protects in-flight projects).

## Selected Approach

**Option A — sink-pr.js mirror + watch-pr subcommand in claim.js**

Rationale: Approach B is disqualified by machine-global config collision risk in co-active-lease scenarios. Approach C introduces DRY violations by duplicating lock/release internals. Approach A's state locality in per-project workflow-state.md, correct multi-lock polling, and minimal Phase 6 dispatch make it architecturally sound. The two advisor corrections (all-lock scanning, thin wrapper) are incorporated into the design.

## Key Design Decisions

- `sink:` field written to `## Sink` block in workflow-state.md by `claim.js updateSinkLease()`
- `--sink {merge|pr}` flag on `claim.js claim`; enum; default `merge`
- Phase 6 dispatch in `commands/kaola-workflow-phase6.md` Step 8 (lines ~427-452); NOT in workflow-next.md
- `releaseSession(sessionId, reason)` extracted from `cmdRelease` — watch-pr calls this helper directly
- `gh pr view --json state,mergedAt,url,number,closedAt` — complete field set
- watch-pr invocation in Startup Step 0: sweep → watch-pr → classify → claim
- Epic Case 7 sub-tests: 7A (pr opened), 7B (auto-merge flag), 7C (watch-pr merge detected), 7D (closed no-merge), 7E (still open), 7F (OFFLINE), 7G (thin wrapper sets sink:pr)

## Out of Scope (explicit)

- Auto-rebase on PR conflicts
- PR review automation (requesting reviewers, approving)
- Draft PRs
- Multi-PR per issue
- CI status gating
- Cross-repo PRs
- Configurable PR title/body template beyond defaults
- watch-pr daemon mode / background polling
- Codex parity (`commands/codex-workflow-next-pr.md`) — separate issue #8

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
