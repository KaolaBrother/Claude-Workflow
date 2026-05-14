# Phase 2 - Ideation: multi-session-substrate

## Approaches Evaluated

### Option A: Monolithic flat script + `hooks.json` PreToolUse + `KAOLA_WORKFLOW_OFFLINE` test isolation (SELECTED)

- Summary: Single `scripts/kaola-workflow-claim.js` mirroring `kaola-workflow-repair-state.js` structure. Pre-commit protection wired as Claude Code `PreToolUse` hook in `hooks/hooks.json` (matcher: Bash on `git commit`). `KAOLA_WORKFLOW_OFFLINE=1` skips `gh` calls in tests.
- Pros: Matches all existing conventions (flat script, no helper modules, no dual-purpose installer); natural per-repo trigger via plugin hook; env-var test isolation keeps tests fast and network-free
- Cons: ~500–650 lines (within 800-line ceiling; below 200–400 typical — acceptable single-file); hook is Claude Code only (doesn't block manual shell commits — but spec says "block from session B", meaning AI-initiated commits)
- Risk: Low–Medium
- Complexity: Medium

### Option B: Split into `kaola-workflow-claim.js` + `scripts/lib/` helpers

- Summary: Factor lock I/O, session identity, and `gh` calls into `scripts/lib/lock-store.js` and `scripts/lib/session.js`
- Pros: Smaller individual files; cleaner unit-test seams
- Cons: Zero precedent for `scripts/lib/`; violates YAGNI (one consumer); repo's integration-only test model means unit seams add no real coverage
- Risk: Medium
- Complexity: Medium–High

### Option C: Monolithic claim.js + `install.sh --in-project` + PATH-shim `gh` stub for tests

- Summary: Extend `install.sh` with in-project mode to install `.git/hooks/pre-commit`; test with PATH shim
- Pros: Single install entry point
- Cons: Dual-purpose `install.sh` is surprising; PATH shim fragile cross-shell; hook only installed at install time (not on fresh clone); directly contradicts spec's "wired via hooks.json PreToolUse"
- Risk: Medium–High
- Complexity: High

## Advisor Findings

**Critical correction (from advisor):** Issue #3 spec explicitly says the hook is "wired via `hooks.json` PreToolUse on `Bash` matching `git commit`" — not a `.git/hooks/pre-commit` file. Planner's Approach A initially assumed git-hooks wiring; advisor corrected to Claude Code PreToolUse hook. This changes where the hook fires (AI Bash-tool `git commit` invocations only — exactly the "session B" case the spec targets).

**Sweep scope:** Planner proposed posting a `released:stale` comment during sweep; advisor noted acceptance #6 only requires removing the label. Sweep is kept minimal.

**Codex validator scope:** Acceptance #7 in issue #3 names `validate-kaola-workflow-contracts.js` (Codex-side). This is interpreted as a spec typo — extending the Codex validator creeps into issue #8 scope. Only `validate-workflow-contracts.js` (Claude-side) is extended in issue #3.

## Selected Approach

**Option A** (with advisor's hook correction).

Rationale: Only approach that fully matches existing conventions (flat script, no helper modules, no install.sh changes). The critical correction — routing the hook through `hooks/hooks.json` PreToolUse instead of `.git/hooks/` — makes the implementation spec-compliant and simpler (no per-repo hook installation step needed).

## Implementation Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| Script location | `scripts/kaola-workflow-claim.js` (flat) | Matches existing flat prefix convention; spec says nested but convention wins |
| Hook wiring | `hooks/hooks.json` PreToolUse on Bash matching `git commit` | Spec requirement; blocks AI-initiated commits from non-owning sessions |
| session-id | `crypto.randomUUID()` | Standard stdlib since Node 14.17; hostname+pid+timestamp in same JSON for debuggability |
| Lock fsync | `fs.fsyncSync(fd)` before close | Crash-safety; prevents half-written lock file |
| EEXIST readback | 3-attempt retry, 50ms apart | Race guard; other process may be mid-write |
| Sweep scope | `--remove-label` + unlink lock only; no comment | Matches acceptance #6 exactly |
| status --json shape | `{ session, lock, remote: { assignee, has_label, sentinel_comment_id }, consistent, drift[] }` | Covers all acceptance #5 consistency checks |
| Test isolation | `KAOLA_WORKFLOW_OFFLINE=1` skips all `gh` calls | No network in tests |
| Codex validator | No changes (deferred to #8) | Spec typo; Claude-side validator is the right target |
| `claim_comment_id` | Exposed in `## Lease` block of `workflow-state.md` | Visible for heartbeat edits without reading gitignored lock file |
| workflow-state.md Sink/Lease | New `## Sink` + `## Lease` top-level sections | Net-new; do NOT reuse field names `started:` / `expires:` in other blocks |
| Heartbeat frequency | Phase-boundary only (not ticker) | Ticker deferred to issue #9 |
| `~/.config/kaola-workflow/machine-id` | Written once, never cleaned by uninstall.sh | Informational only; acceptable |

## Files to Create

- `scripts/kaola-workflow-claim.js`
- `hooks/kaola-workflow-pre-commit.sh`

## Files to Extend

- `hooks/hooks.json` — add PreToolUse entry for Bash / git commit
- `.gitignore` — add `kaola-workflow/.locks/` and `kaola-workflow/.sessions/`
- `scripts/validate-workflow-contracts.js` — assert new files + .gitignore entries + workflow-state.md Sink/Lease blocks
- `scripts/simulate-workflow-walkthrough.js` — add epic Case 1 (two sessions, distinct locks, second claim blocked)
- `commands/workflow-next.md` — add `claim.js sweep` on startup + `claim.js claim` before routing + Co-active leases block in output
- `commands/workflow-init.md` — add claim.js claim and session initialization (no git hook install needed)
- `commands/kaola-workflow-phase{1..6}.md` — add phase-boundary heartbeat call

## Files with No Changes

- `install.sh` / `uninstall.sh`
- `scripts/validate-kaola-workflow-contracts.js` (Codex — deferred to #8)
- `plugins/kaola-workflow/scripts/` (Codex — deferred to #8)
- `hooks/hooks.json` existing SessionStart entry (keep compact-context hook)
- `package.json`

## Out of Scope (explicit)

- Branch cutting — `Sink.branch: TBD` in Phase 1
- Cross-machine race tiebreaker — deferred to issue #9
- Background heartbeat ticker — deferred to issue #9
- Codex-side parity — deferred to issue #8
- npm dependencies — Node.js stdlib only
- Manual shell `git commit` blocking — Claude Code PreToolUse hook only guards AI-initiated commits

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
