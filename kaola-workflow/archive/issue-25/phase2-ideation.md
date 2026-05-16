# Phase 2 - Ideation: issue-25

## Approaches Evaluated

### Option A: Prompt-Only Guardrails

Summary: Update router and phase prompts to say `claim:none` must stop and
handoff must not run against active owners.

Pros: Smallest change; easy to publish.

Cons: Does not address the actual failure mode. The agent skipped the written
sequence and invoked a permissive script command.

Risk: High recurrence risk.

Complexity: Low.

What not to build: More prose-only recovery warnings.

### Option B: Script-Level Authorization With Prompt Shims

Summary: Add executable startup receipt verification and guarded handoff checks
to `kaola-workflow-claim.js`, then make router and phase prompts call those
commands.

Pros: Fails closed even when an agent skips a prose step; handles local Claude
session liveness, unexpired locks, recent heartbeats, and live ticker PIDs;
keeps explicit force recovery available.

Cons: Slightly larger script and simulation surface.

Risk: Moderate. Default recovery may be conservative for stale-but-recent
leases, but the explicit force flag preserves manual recovery.

Complexity: Medium.

What not to build: A separate daemon or central lock service.

### Option C: Local Claude Session Only

Summary: Permit handoff unless the previous owner has a recent local Claude
JSONL session file.

Pros: Matches the narrow local-session signal from the incident.

Cons: Ignores Codex owners, ticker liveness, and fresh lock heartbeat evidence.
It would allow some real active sessions to be stolen.

Risk: Medium-high.

Complexity: Low-medium.

What not to build: A guard that treats local Claude JSONL as the only source of
truth.

## Advisor Findings

The advisor gate selected Option B. The key finding is that the ownership rule
must live in the claim script because the observed bug was caused by skipped
startup/claim flow plus an unconditional handoff command. Prompt changes should
be retained as UX and routing guidance, but not be the only enforcement.

## Selected Approach

Implement Option B:

- Add `verify-startup` for phase entry.
- Add `can-handoff` and default handoff rejection for unauthorized receipts and
  live owner evidence.
- Require explicit `--force-live-takeover` for dangerous recovery.
- Mirror root and packaged Codex scripts, prompts, validators, and simulations.

## Out of Scope

- Cross-machine distributed liveness beyond existing remote claim comments and
  lock metadata.
- New central coordinator service.
- Rewriting issue classifier ordering beyond startup issue-roadmap sync already
  delivered by the prior release.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | current session strategy analysis | subagent delegation was not explicitly requested |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
