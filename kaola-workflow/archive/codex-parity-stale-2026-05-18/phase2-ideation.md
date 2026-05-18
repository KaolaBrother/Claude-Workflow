# Phase 2 - Ideation: codex-parity

## Approaches Evaluated

### Option A: Direct Mirror in Skills
- Summary: Embed identical bash blocks from commands/*.md directly into each Codex skill SKILL.md. Add `--runtime` flag to claim.js. No new Node subcommands.
- Pros: Minimal claim.js change (~10 lines). Each runtime's prose self-contained. Lowest Claude regression risk.
- Cons: Startup Step 0 (~30 lines of sweep → classify → claim chain) in workflow-next.md gets mirrored verbatim — guaranteed drift when patched. Sink dispatch (~15 lines) same risk.
- Risk: High (long-term drift on complex chains)
- Complexity: Medium

### Option B: Shared Node Subcommand Layer
- Summary: Push every multi-step chain into new claim.js subcommands (bootstrap, dispatch-sink). Both runtimes call these thin wrappers.
- Pros: Zero drift risk. Subcommands unit-testable. Skills trivially short.
- Cons: claim.js at 646/800 lines — adding bootstrap + dispatch-sink risks crossing 800-line ceiling mid-task. Forces simultaneous edits to existing Claude commands.
- Risk: High (file-size violation)
- Complexity: Large

### Option C: Hybrid (Selected)
- Summary: Inline-mirror trivial blocks (heartbeat 6L, branch-cut, init-issue, sink-case) in Codex skills. Extract one complex chain (Startup Step 0: sweep → watch-pr → classify → claim) into new claim.js `bootstrap` subcommand. Both runtimes call bootstrap as a single node invocation. Add `--runtime` flag to `cmdClaim`. Create 9th skill `kaola-workflow-next-pr`. Extend Codex simulator with cross-runtime case.
- Pros: Eliminates drift where it matters (the 30-line orchestration chain). Bounded claim.js growth (~50 added lines → ~696 total). Trivial blocks stay readable as bash.
- Cons: Two patterns coexist (inline vs subcommand) — requires documentation.
- Risk: Low (bootstrap subcommand semantics clearly spec'd)
- Complexity: Medium

## Advisor Findings

Approach C confirmed with no missed alternatives. Risks accurately assessed. Key actions flagged for Phase 3:

1. **`bootstrap` sub-extraction required**: The `cmdBootstrap` function must be pre-factored into sub-functions (e.g., `runBootstrapSweep`, `runBootstrapClassify`, `runBootstrapClaim`) before implementation — the full chain will exceed the 50-line limit.
2. **AC #2 pinned**: Cross-runtime Case 5 must use two DISTINCT projects/issues (per-project locks prevent same-project co-claim by design). The simulator cannot and should not model two sessions on the same project.
3. **Startup Step 0 regression**: The collapse of `commands/workflow-next.md` to a `bootstrap` call is the highest regression risk. `cmdBootstrap` contract must be fully spec'd in Phase 3 before workflow-next.md edit is planned. Epic 9 tests exercise this path.
4. **Default `--runtime claude` backward compat**: Adding `runtime: "claude"` to `buildLockData` changes the lock JSON shape — Phase 3 must verify no Epic 9 test asserts exact lock JSON equality.
5. **Validator enumerated list**: `validate-kaola-workflow-contracts.js` uses `const skills = [...]` — the 9th skill entry must be added in the same write set as the SKILL.md creation.
6. **Codex script lookup**: Every node invocation in Codex skills must use the two-step lookup pattern — Phase 3 must specify this per-call.

## Selected Approach

**Option C: Hybrid**

Rationale: Eliminates drift where it matters most (the complex 30-line orchestration chain) while keeping trivial blocks readable as inline bash. Bounded claim.js growth stays well under the 800-line ceiling. Mirrors the established project pattern of extracting complex multi-step logic into Node subcommands. The explicit not-to-build list prevents scope creep.

## Key Decisions

1. `runtime` field: caller-passed `--runtime claude|codex` flag; default `claude` for backward compat; read sites default to `claude` when field absent in existing locks
2. `bootstrap` subcommand contract: returns JSON `{project, issue, verdict}` on stdout; exit 0 success, exit 1 no candidate, exit 2 infrastructure failure
3. Cross-runtime simulator (Case 5): two DISTINCT projects/issues — one tagged `runtime:claude`, one `runtime:codex`; same-project co-claim is blocked by design and is not tested

## Out of Scope (explicit)

- Bash include/templating system
- Module split of claim.js
- Modification of Claude commands beyond Startup Step 0 collapse + `--runtime` flag
- Real GitHub API tests in simulator
- Auto-detection of runtime from env vars
- Separate bootstrap script file (stays as claim.js subcommand)
- Migration logic for existing locks (absent field reads as `claude`)
- Changes to classifier.js, roadmap.js, sink-merge.js, sink-pr.js
- Third per-runtime validator script
- Pre-commit guard Codex wiring (out of scope per issue)

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
