# Advisor — Phase 2 Ideation Gate: minimal-ecc-config

## Verdict
Endorse Option A. Placement is correct: the 9-agent table is the canonical "install only these" inventory, and the four recommendations are install-time decisions that belong next to it. Options B and C are correctly rejected — B drifts under a contract-locked heading; C fragments ECC guidance across three sections.

## Key Finding — Tonal Mismatch (must decide before Phase 3)

The existing `## ECC Hook Policy` section (lines 351–369) currently frames `ECC_HOOK_PROFILE=minimal` as a tip for "heavy Phase 4 implementation bursts". The new bullet will frame the same flag as the recommended setup default — a contradiction a reader will notice.

Two resolutions:
- **Tighter (recommended)**: In the same edit, tweak the Hook Policy lead-in with one sentence (e.g., "Kaola-Workflow recommends this profile by default; it is particularly useful for heavy Phase 4 bursts"). Preserves `## ECC Hook Policy` heading and code block — contract-safe.
- **Looser**: Leave Hook Policy as-is and accept the tonal gap.

Advisor leans tighter — one sentence removes the contradiction. Phase 3 blueprint must make this an explicit decision (either "edit point 1" or explicit out-of-scope).

## Wording Precision (verify in Phase 3)

- "do not install ECC language rules as part of Kaola-Workflow setup" — keep direct, do not soften to "optional"
- "for common rules, users are free to choose based on their own project preferences" — "free to choose" appears only here; do not bleed into the language-rules bullet
- "subagents → install only the ECC subagents listed in the table above" — phrase it this way so it stays robust if the table count ever changes

## Anchor Check

`## ECC Hook Policy` auto-anchors to `#ecc-hook-policy` on GitHub. Verify during Phase 4 visual review.

## Missed Approaches?
None that would change the decision. Option A is dominant.

## Risks Accurate?
Yes. The two real risks are: (a) blockquote `> ` continuity and (b) the tonal mismatch above.

## Recommendation
Proceed to Phase 3 with Option A. Have the Phase 3 architect make an explicit call on the Hook Policy lead-in tweak.
