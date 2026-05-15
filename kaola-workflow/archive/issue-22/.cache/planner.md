# Planner Notes - issue-22

## Strategy Options

### Option A: Patch docs only

- Summary: Document that users should set `KAOLA_SESSION_ID` manually and use recovery manually.
- Pros: Smallest code change.
- Cons: Does not satisfy issue #22 because normal startup still adopts another session owner.
- Risk: High; bug remains.
- Do not build: rejected because it relies on user discipline.

### Option B: Ownership-aware helpers with platform-derived ids

- Summary: Add platform session id resolution to the claim helper, make `session --project` validate the current session against project ownership, add explicit `handoff`, and filter repair/routing to owned projects only.
- Pros: Directly addresses root cause; keeps user command surface small; testable offline; works for lock-backed and state-only leases.
- Cons: Requires coordinated docs, command snippets, plugin skills, and tests.
- Risk: Medium; existing tests encode old behavior and need careful update.
- Do not build: no model semantic routing, no new default user command, no implicit adoption.

### Option C: New `/workflow-start` vs `/workflow-next` command split

- Summary: Add a separate start command to always claim new work and leave next as resume.
- Pros: Easy mental model for some users.
- Cons: User rejected more command complexity; does not solve phase heartbeat adoption by itself.
- Risk: High; diverges from current design principle.
- Do not build: rejected per user instruction to keep commands few and automatically determined.

## Recommendation

Option B. It changes the ownership primitive instead of adding user-facing branching. The platform session id becomes the stable authority, normal startup remains automatic, and the only explicit path is recovery/handoff for intentional ownership transfer.
