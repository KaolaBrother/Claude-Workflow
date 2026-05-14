# Advisor Ideation Gate: pr-sink

## Ruling

Approach A is correct — commit to it. Apply fixes and missing-fact answers below in Phase 3 task definitions.

## Critical Correction to Approach A

**watch-pr must scan ALL locks, not one project's**
The planner described `watch-pr --issue N` reading "the current project's workflow-state.md." This breaks the multi-project case: sessionA's PR never gets polled if the user runs `/workflow-next` in project-Y.
Fix: `watch-pr` iterates every `.lock` file (same pattern as `sweep`), and for each with `sink: pr` and a `pr_url`, calls `gh pr view` and acts. Optional `--issue N` for targeted testing.

**workflow-next-pr.md should be a thin wrapper, not a near-copy**
Drift from workflow-next.md is fragile. Instead: `workflow-next-pr.md` is 5-10 lines that sets `sink: pr` and delegates to `/workflow-next`. No duplication, no cap issues, no drift test needed.
Add one contract assertion: `assert(routerLines <= 40, 'workflow-next-pr.md must be a thin delegator')`.

## Missing Facts — Resolved

1. **watch-pr cadence**: one-shot per `/workflow-next` startup. No script-level timeout.
2. **Invocation point**: Startup Step 0, after sweep, before classify. Order: sweep → watch-pr → classify → claim.
3. **Lease expiry while PR open**: watch-pr updates `last_heartbeat` AND extends `expires` when PR still open. Normal 24h sweep handles if user goes idle.
4. **PR-URL persistence**: BOTH `phase6-summary.md` AND `## Sink` block (`pr_url:`, `pr_number:` lines).
5. **PR closed without merge**: release (reason=aborted), do NOT delete branch. Issue stays open.
6. **pr_auto_merge: false semantics**: "open PR, do not pass --auto, still watch." User merges manually; watch-pr detects and releases.
7. **Branch deletion on merge**: `pr_auto_merge: true` → `gh pr merge --auto --squash --delete-branch` (GitHub handles remote). watch-pr detects merge → `git branch -D` (local only). No double-delete.
8. **OFFLINE behavior**: write `pr_url: OFFLINE_PLACEHOLDER`, `pr_number: 0` to both places; exit 0. Epic Case 7 happy path uses gh shim, not OFFLINE.
9. **workflow-next-pr.md line budget**: moot (thin wrapper, ≤40 lines cap).
10. **--sink validation**: enum `merge|pr`, default `merge` when omitted. `assert(['merge','pr'].includes(args.sink || 'merge'), ...)`.

## Backward Compatibility
When Phase 6 Step 8 reads `sink:` from `## Sink` block and field is absent (pre-feature claims) → default to `sink: merge`. Protects in-flight projects.

## Epic Case 7 Sub-Tests
- 7A: sink=pr + gh shim → `gh pr create` called, PR URL written to phase6-summary.md and `## Sink` block
- 7B: sink=pr + `pr_auto_merge: true` → `gh pr merge --auto --squash --delete-branch` called
- 7C: watch-pr sees MERGED → release called, local branch deleted, lock removed
- 7D: watch-pr sees CLOSED (no merge) → release reason=aborted, branch NOT deleted
- 7E: watch-pr sees OPEN → last_heartbeat + expires updated; lock retained
- 7F: sink-pr.js OFFLINE → placeholder URL written, exit 0, no gh calls
- 7G: workflow-next-pr.md wrapper sets sink: pr in `## Sink` block

## Phase 3 Notes
- `gh pr view --json` field set: `state,mergedAt,url,number,closedAt`
- Extract `releaseSession(sessionId, reason)` helper from `cmdRelease` so `watch-pr` can call directly (DRY — avoids exec'ing `node claim.js release`)

## Date
2026-05-15T10:05:00Z
