# Advisor Plan Gate: codex-parity

## Verdict

Blueprint confirmed. Three initial blockers withdrawn after primary-source fact-checking. Three non-blocking standing notes incorporated into phase3-plan.md.

## Initial Blockers — All Withdrawn

### Blocker 1: patch-branch missing from bootstrap (WITHDRAWN)
- **Initial concern**: `runBootstrapPatchBranch` was missing from `cmdBootstrap` pseudocode.
- **Evidence**: `commands/kaola-workflow-phase1.md:283,290` owns patch-branch. `commands/workflow-next.md` Step 0 (lines 50-81) does NOT call patch-branch. Patch-branch belongs in T5a (kaola-workflow-research SKILL.md), not in `cmdBootstrap`.
- **Resolution**: Architect pseudocode was correct. Blocker withdrawn.

### Blocker 2: KAOLA_PROJ/KAOLA_PICK/KAOLA_VERDICT shell vars stranded (WITHDRAWN)
- **Initial concern**: Downstream workflow-next.md Steps might consume Step 0 shell vars that disappear when Step 0 collapses to `BOOTSTRAP_OUT=...`.
- **Evidence**: Grep of workflow-next.md confirmed KAOLA_PROJ/KAOLA_PICK/KAOLA_VERDICT are ONLY referenced on lines 60-78 (inside Step 0 body). Step 1+ does not reference them. BOOTSTRAP_OUT replacement is safe.
- **Resolution**: Blocker withdrawn.

### Blocker 3: dual-field workflow-state.md write unspecified (WITHDRAWN)
- **Initial concern**: Blueprint didn't specify where `next_command`+`next_skill` dual write happens in bootstrap.
- **Evidence**: `updateSinkLease` (claim.js:148) writes ONLY `## Sink` and `## Lease` blocks (session_id, expires, last_heartbeat, claim_comment_id). `next_command`/`next_skill` are written by phase commands independently, not by bootstrap.
- **Resolution**: Blocker withdrawn. Bootstrap does not need to write next_command/next_skill.

## Standing Notes (Non-Blocking — Incorporated Into phase3-plan.md)

### Note 1: Pre-factor runBootstrapClassify
T1's Implement field must pre-factor `runBootstrapClassify` into two helpers:
- `listOpenIssues(cwd)` — calls `gh issue list` subprocess; returns array of issue numbers
- `pickFirstActionableIssue(classifierScript, issues, args)` — iterates, classifies, derives project, returns first green/yellow pick

This ensures `runBootstrapClassify` stays ≤ 20 lines and neither helper exceeds 50 lines.

### Note 2: Case 5 must use actual bootstrap subprocess
T7's Implement field must invoke `node claim.js bootstrap --runtime codex --session SID` as a real subprocess (via `execFileSync` or `spawnSync`), not just write lock files directly. The test must verify the full claim.js bootstrap code path executes correctly.

### Note 3: Pin --runtime flag precedence
T1's Implement field must document: "caller-passed `--runtime` flag wins; `KAOLA_RUNTIME` env var is NOT read by claim.js (per Explicit Not-to-Build list)."

## SCRIPTS_DIR Lookup Correction

Architect's blueprint used directory-form `find ... -type d` — this must be replaced with the canonical file-path form matching `kaola-workflow-next/SKILL.md:56-58`:

```bash
claim_script="plugins/kaola-workflow/scripts/kaola-workflow-claim.js"
if [ ! -f "$claim_script" ]; then
  claim_script="$(find "$HOME/.codex/plugins/cache" -path '*/kaola-workflow/*/scripts/kaola-workflow-claim.js' -print -quit 2>/dev/null)"
fi
```

Each SKILL.md task must specify this form explicitly for each script file (claim.js, sink-pr.js, sink-merge.js) rather than a generic SCRIPTS_DIR directory lookup.

## Build Sequence Confirmed

T1 → T2 → T3(atomic) → T4 → parallel-B(T5a-f + T6) → T7. Dependency-safe. No circular dependencies. Disjoint write sets within parallel-B confirmed.

## Integration Points Verified

- Epic 9 test assertions: no exact-shape lock JSON equality assertions found — adding `runtime: "claude"` to `buildLockData` is safe.
- Contract validator `const skills = [...]` enumerated array: T3 write set correctly includes both SKILL.md creation and validator update atomically.
- Codex two-step lookup: file-path form corrected from architect's directory-form.

## Final Instruction

Write `phase3-plan.md` with the architect's blueprint plus these three standing notes in the Advisor Notes section. Skip the architect-revision loop — these are mechanical additions, not approach changes. The Phase 3 skill's "main session may synthesize" clause covers this.
