# Advisor Ideation Gate - issue-24

## Review

Option C is the right scope. The observed failure was not a race inside `claim`; it was a skipped startup sequence. Therefore the design needs a single startup command and a receipt that later routing/phase logic can require.

## Required constraints

- Keep `bootstrap` for compatibility, but route new prompts/skills through `startup`.
- Do not make `ROADMAP.md` authoritative when GitHub is available.
- Keep offline behavior conservative.
- Add tests against local `gh` shims so the new behavior is deterministic.
- Avoid a full priority framework; implement `workflow:queued` first, then stable issue number ordering.

## Decision

Proceed with a new `startup` command plus issue sync, receipt writing, router/phase guidance, and root/Codex simulations.
