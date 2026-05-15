# Advisor — Phase 3 Plan Gate: minimal-ecc-config

## Verdict
Approve. The blueprint is implementable from the plan alone. Both edits are independent text-anchor changes — sequence is flexible. Proceed to Phase 4.

## Contract Preservation (verify after Edit)
- `## ECC Hook Policy` heading: untouched ✓
- `ECC_HOOK_PROFILE=minimal` substring: now appears in TWO places (new inline-backtick bullet + preserved code block). `assertIncludes` still passes.
- After applying, run: `grep -c 'ECC_HOOK_PROFILE=minimal' README.md` → expect `2`.

## Implementation Gotchas (Phase 4 risk)

1. **Edit tool exact-match risk** — the 5-line anchor block should be unique in the file (the closing fence → bare `>` → "ECC's current npm package name" sequence appears nowhere else). If uniqueness is in doubt, use a slightly larger anchor.

2. **Sanity checks after each Edit** (run before contract validation):
   - After Task 1: `grep -c 'Minimal Kaola-Workflow ECC configuration' README.md` → expect `1`
   - After Task 2: `grep -c 'recommends this profile by default' README.md` → expect `1`
   - Also: `grep -c '^## ECC Hook Policy' README.md` → expect `1`

3. **Minor stylistic concern, non-blocking**: "this profile" and "the lighter hook profile" both refer to minimal, slight redundancy. Acceptable; do not revise unless a cleaner phrasing appears during Phase 4 visual review.

## Phase 2 Decisions Confirmed
- Tighter resolution applied (one-sentence prepend, heading + code block untouched) ✓
- "do not install ECC language rules" stays direct ✓
- "ECC subagents listed in the table above" (not a hardcoded count) ✓
- Inline backtick avoids second code block ✓

## Anchor Link
`#ecc-hook-policy` is correct per GitHub/CommonMark slug rules. Visual verification in Phase 4 is sufficient.

## Missed Concerns
None that change the plan. The two real risks are (a) Edit tool exact-match and (b) blockquote `> ` continuity — both already addressed in the blueprint.

## Recommendation
Proceed to Phase 4 with the blueprint as written. No architect revision needed.
