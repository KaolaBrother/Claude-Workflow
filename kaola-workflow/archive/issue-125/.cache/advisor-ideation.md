# Advisor Ideation Gate — Issue #125

## Verdict: Approach A confirmed. Include both README lines. Proceed.

## Scope Decision
Include both `README.md:356-357` lines (GitHub + GitLab edition versions). Same drift class, same root cause, README's own contract text (lines 362-363) explicitly contradicts leaving `3.8.1` there.

## Pre-Phase-4 Verification Requirements
1. **Read `README.md:350-370`** before editing. If a Codex-edition line is also drifted in that block, **exclude it** — Codex plugins are on a separate versioning track. Only touch Claude-edition lines that should equal `package.json`.
2. **Prove the guard catches drift**: in Phase 4, temporarily revert `plugin.json` to `"3.8.1"` and confirm the new assertion fires with the expected message, then restore. Document as RED evidence.

## Items Confirmed Out of Scope
- No shared helper (Approach B)
- No root validator meta-check (Approach C)
- No Codex-edition README lines (separate versioning track)
- No README content assertion in the validator

## User Authorization
User's /goal says "follow advisor's recommendation" — no stop required for the README scope expansion. Phase 2 ideation file must explicitly note the README:356-357 fix as deliberate scope so Phase 5 review is not surprised.
