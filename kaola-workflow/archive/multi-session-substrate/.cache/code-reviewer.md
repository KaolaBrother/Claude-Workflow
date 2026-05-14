# Code Review — multi-session-substrate Phase 4

## Verdict: BLOCK — 1 CRITICAL

### CRITICAL

**[C1] Heartbeat signature mismatch — all 6 phase snippets broken**
Files: commands/kaola-workflow-phase{1..6}.md (Session Heartbeat section)
All snippets pass `"$KAOLA_SESSION_ID"` as positional arg, but cmdHeartbeat at claim.js:228 requires `--session` flag.
`parseArgs` silently discards the positional value → args.session is undefined → assert throws → heartbeat exits 1 every time.
Epic Case 1 in simulate-workflow-walkthrough.js uses `--session` correctly and masks this bug.
Fix (Option A): change all 6 snippets to `heartbeat --session "$KAOLA_SESSION_ID"`

### HIGH

**[H1] cmdClaim is 67 lines (50-line limit)**
File: scripts/kaola-workflow-claim.js, lines 133-199
Four concerns conflated: arg validation+lock write, session file write, GitHub side-effects, workflow-state update.
Fix: Extract writeLockFile, writeSessionFile, postGitHubClaim helpers. cmdClaim becomes orchestration ~25 lines.

### MEDIUM

**[M1] Stale Sink block on re-claim**
File: scripts/kaola-workflow-claim.js, updateSinkLease lines 108-119
When ## Sink exists, only Lease is replaced. Re-claim against different issue leaves stale issue_number/claimed_at.

**[M2] updateLeaseInPlace silently no-ops when ## Lease absent**
File: scripts/kaola-workflow-claim.js, line 124
Heartbeat refreshes lock but silently skips workflow-state.md if ## Lease missing. Creates undetected drift.

### LOW

**[L1] sleepMs busy-wait** — approved by architect-revision-1. Informational.
**[L2] Heartbeat exit 1 on new work** — by design with && guard. Comment recommended.
**[L3] pre-commit false positive on "echo git commit"** — fail-open is safe.
**[L4] console.log in validate-contracts + simulate-walkthrough** — pre-existing, out of Phase 4 write set.

### Scope Compliance
All modified files are within Phase 4 write set. No violations.
