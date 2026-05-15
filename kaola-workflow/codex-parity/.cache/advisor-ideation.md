# Advisor Ideation Gate: codex-parity

## Verdict

Approach C (Hybrid) confirmed. No missed approaches. Risks are accurately assessed.

## Key Affirmations

- Hybrid pattern (inline trivial blocks + `bootstrap` subcommand for the complex chain) mirrors the established project pattern of extracting complex multi-step logic into Node subcommands (classifier.js, roadmap.js, repair-state.js). Architecturally sound.
- `--runtime claude|codex` flag with `claude` default is the correct backward-compatible choice. Existing sessions with no `runtime` field read as `claude` by default.
- Per-project lock design correctly prevents same-project co-claim. Cross-runtime Case 5 must use two DISTINCT projects — this interpretation is correct and must be pinned explicitly in phase2-ideation.md to prevent the architect from designing an impossible same-project test.

## Gotchas / Required Phase 3 Actions

1. **`bootstrap` function size**: The 30-line chain (sweep → watch-pr → classify → claim → patch-branch → write-state) will exceed the 50-line function limit. Phase 3 plan must pre-factor `cmdBootstrap` into sub-functions (e.g., `runBootstrapSweep`, `runBootstrapClassify`, `runBootstrapClaim`) before implementation begins. This is non-negotiable — don't let tdd-guide discover the violation mid-task.

2. **Startup Step 0 regression vector**: Collapsing the 30-line chain in `commands/workflow-next.md` to a single `node claim.js bootstrap` call is the highest regression risk in the entire implementation. Phase 3 must define the exact `cmdBootstrap` contract (inputs, outputs, exit codes) before the workflow-next.md edit is planned. The Epic 9 walkthrough tests exercise this path heavily.

3. **Default `--runtime claude` backward compatibility**: Phase 3 must verify that adding `runtime: "claude"` to `buildLockData` output does not break any existing Epic 9 test assertions that inspect lock file contents. The lock JSON shape changes — confirm no tests assert `JSON.stringify` equality or exact key order.

4. **`validate-kaola-workflow-contracts.js` enumerated list**: The contract validator uses a named array `const skills = [...]`, not a count. The 9th entry (`kaola-workflow-next-pr`) must be added to this array simultaneously with the SKILL.md file creation. Phase 3 task for creating the 9th skill must include the validator update in the same write set.

5. **Codex script lookup wrapper**: Every Node invocation added to Codex skills must use the two-step lookup pattern (`plugins/kaola-workflow/scripts/` → `$HOME/.codex/plugins/cache`). Phase 3 must specify this pattern explicitly for each new node call in each skill, or tdd-guide will inline direct paths.

## Risks Re-Assessed

- Low: `bootstrap` subcommand semantics — contract is clearly spec'd (JSON stdout, exit 0/1/2)
- Low: Trivial block drift — heartbeat blocks are 6 lines each; drift risk is real but manageable; Phase 6 doc-docking catches it
- Low: claim.js file size — 646 + ~50 = ~696 lines, well under 800-line ceiling
- Medium (unchanged): Startup Step 0 regression — mitigated by pinning contract before edit

## No Changes to Out-of-Scope List

The explicit not-to-build list in planner.md stands as-is.
