# Planner: codex-parity

## Approach A: Direct Mirror in Skills

- Summary: Embed identical bash blocks from commands/*.md directly into each Codex skill SKILL.md. Add --runtime flag to claim.js. No new Node subcommands.
- Pros: Minimal claim.js change (~10 lines). Each runtime's prose self-contained. Lowest Claude regression risk.
- Cons: Startup Step 0 (~30 lines of sweep → classify → claim chain) in workflow-next.md gets mirrored verbatim — guaranteed drift when patched. Sink dispatch (~15 lines) same risk.
- Risk: High (long-term drift on complex chains); Medium (Codex script lookup wrapper must appear around every node invocation)
- Complexity: Medium
- Architectural Fit: Acceptable but anti-DRY for complex chains

## Approach B: Shared Node Subcommand Layer

- Summary: Push every multi-step chain into new claim.js subcommands (bootstrap, dispatch-sink). Both runtimes call these thin wrappers.
- Pros: Zero drift risk. Subcommands unit-testable. Skills trivially short.
- Cons: claim.js at 646/800 lines — adding bootstrap + dispatch-sink risks crossing 800-line ceiling mid-task. Forces simultaneous edits to existing Claude commands.
- Risk: High (file-size violation); Medium (Claude regression during migration)
- Complexity: Large
- Architectural Fit: Cleanest long-term but premature given code-size constraints

## Approach C: Hybrid (Recommended)

- Summary: Inline-mirror trivial blocks (heartbeat 6L, branch-cut, init-issue, sink-case) in Codex skills. Extract one complex chain (Startup Step 0: sweep → watch-pr → classify → claim) into new claim.js `bootstrap` subcommand. Both runtimes call bootstrap as a single node invocation. Add --runtime flag to cmdClaim. Create 9th skill kaola-workflow-next-pr. Extend Codex simulator with cross-runtime case.
- Pros: Eliminates drift where it matters (the 30-line orchestration chain). Bounded claim.js growth (~30-50 added lines). Trivial blocks stay readable as bash. Claude commands change minimally.
- Cons: Two patterns coexist (inline vs subcommand) — requires documentation.
- Risk: Low (bootstrap subcommand semantics need clear spec)
- Complexity: Medium
- Architectural Fit: Strongest — mirrors existing pattern of pushing complex logic into Node (classifier.js, roadmap.js, repair-state.js)

## Recommendation: Approach C

### Key decisions settled in ideation:
1. `runtime` field: caller-passed `--runtime claude|codex` flag (default `claude` for backward compat)
2. `bootstrap` subcommand contract: returns JSON `{project, issue, verdict}` on stdout, exit 0 success, exit 1 no candidate, exit 2 infrastructure failure
3. Cross-runtime simulator: per-project locks prevent "same project, two runtimes" by design. Simulator uses two DISTINCT projects/issues, one tagged runtime:claude, one runtime:codex

## Explicit Not-to-Build
- Bash include/templating system
- Module split of claim.js
- Modification of Claude commands beyond Startup Step 0 collapse + --runtime flag
- Real GitHub API tests in simulator
- Auto-detection of runtime from env vars
- Separate bootstrap script file (stays as claim.js subcommand)
- Migration logic for existing locks (read sites default to `claude` when field absent)
- Changes to classifier.js, roadmap.js, sink-merge.js, sink-pr.js
- Third per-runtime validator script

## Files Affected
- scripts/kaola-workflow-claim.js — add --runtime arg, bootstrap subcommand (~30-50 lines)
- plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md — add bootstrap call
- plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md — add heartbeat, branch-cut, init-issue
- plugins/kaola-workflow/skills/kaola-workflow-{ideation,plan,execute,review}/SKILL.md — add heartbeat block
- plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md — add heartbeat + sink dispatch
- plugins/kaola-workflow/skills/kaola-workflow-next-pr/SKILL.md — NEW 9th skill
- plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js — add cross-runtime case
- scripts/validate-kaola-workflow-contracts.js — bump skill count 8→9, add assertions
- commands/workflow-next.md — Startup Step 0 collapses to bootstrap call
