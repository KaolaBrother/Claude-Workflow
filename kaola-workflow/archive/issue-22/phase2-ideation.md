# Phase 2 - Ideation: issue-22

## Approaches Evaluated

### Option A: Documentation-Only Session Discipline

- Summary: Tell users and agents to set `KAOLA_SESSION_ID` manually.
- Pros: Minimal implementation work.
- Cons: Leaves automatic startup unsafe; phase heartbeat can still adopt another session's lease.
- Risk: High.
- Complexity: Low.
- What not to build: rejected because it does not fix the issue.

### Option B: Platform-Derived Ownership Contract

- Summary: Make the claim/repair/router surfaces derive the current session id from the host platform, validate ownership before routing or heartbeat, skip foreign active work, and add explicit handoff for recovery.
- Pros: Fixes the root cause while preserving a small user command surface; supports Claude and Codex; testable with offline simulations.
- Cons: Touches several mirrored command/skill/docs/test files.
- Risk: Medium.
- Complexity: Medium.
- What not to build: no new default command split, no semantic planner for conflicts, no implicit adoption.

### Option C: Add Separate Start/Next Commands

- Summary: Add `/workflow-start` for fresh work and leave `/workflow-next` for resume.
- Pros: Could be clear when used correctly.
- Cons: User rejected extra command complexity; does not solve implicit adoption in phase heartbeat.
- Risk: High.
- Complexity: Medium.
- What not to build: rejected.

## Advisor Findings

The advisor gate recommends Option B. The decisive point is that the ownership primitive is wrong: normal startup and phase heartbeat must never ask a project for its owner id and then treat that id as the current session. Recovery needs a deliberate handoff path, but default routing should only continue work whose lease matches the current platform session id.

## Selected Approach

Implement Option B:

- Resolve current id from `KAOLA_SESSION_ID`, then `CODEX_THREAD_ID`, then a generated fallback.
- Persist Claude Code's `SessionStart.session_id` into `KAOLA_SESSION_ID` with a hook helper.
- Change session validation so `session --project` succeeds only for the current owner and exits occupied for foreign leases.
- Add explicit `handoff --project --session` to transfer an unfinished project to a new session.
- Make repair/routing ignore active projects owned by other sessions during normal startup.
- Replace phase heartbeat snippets so they derive/validate current id instead of adopting project owner ids.
- Update docs and simulations.

## Out of Scope

- No separate default `/workflow-start` command.
- No broad redesign of the parallel conflict classifier; issue #23 tracks exact-path classifier hardening.
- No semantic model-based conflict analysis.
- No git merge simulation.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | performed in main session because delegated subagents were not explicitly requested |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | performed in main session |
