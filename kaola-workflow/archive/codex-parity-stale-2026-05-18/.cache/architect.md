# Code Architect: codex-parity

## Design Decisions

- **Shell-out sub-functions in cmdBootstrap**: `runBootstrapSweep`, `runBootstrapWatchPr`, `runBootstrapClassify`, and `runBootstrapClaim` each invoke `execFileSync(process.execPath, [__filename, subcommand, ...])` or call `classifier.js` as a subprocess. Preserves existing command function signatures untouched, eliminates risk of process.argv-dependent refactors, and stays within the 50-line-per-function limit. Budget: ~63 net new lines, bringing claim.js from 645 to ~708 lines (well under 800 ceiling).

- **`--runtime` field defaults to `"claude"` when flag absent**: `parseArgs` adds `--runtime` handling. `buildLockData` adds `runtime: args.runtime || 'claude'`. Epic 9 `writeLock` fixture omits `runtime` and only spot-checks named fields — no exact-shape assertions — so this addition is safe.

- **Yellow-verdict cache append moves into `cmdBootstrap`**: Today the `parallel-classifier.md` append is inline bash in `workflow-next.md` Step 0. When Step 0 collapses to `node claim.js bootstrap`, the append must live inside `runBootstrapClaim` so Codex inherits it without additional bash.

- **`--project` is optional in bootstrap**: When absent and `--issue` is provided, `runBootstrapClassify` derives project name. When both absent, bootstrap returns exit code 1.

- **9th SKILL.md and `validate-kaola-workflow-contracts.js` update are one atomic write-set**: The contract validator will fail if SKILL.md exists but skills array is not updated. They must land in the same task.

- **`commands/workflow-next.md` Step 0 collapse is high-regression-risk**: Exact replacement text specified below. Outer guard preserved; only inner body changes.

- **Two-step `SCRIPTS_DIR` lookup is canonical Codex pattern**: All new node invocations in Codex skill SKILL.md files follow this lookup. The repair-state skill already uses the analogous pattern.

- **No modifications to**: `classifier.js`, `roadmap.js`, `sink-merge.js`, `sink-pr.js`. `--runtime` flag added only to `claim.js`.

---

## Files to Create

| File | Purpose | Key Interfaces |
|------|---------|----------------|
| `plugins/kaola-workflow/skills/kaola-workflow-next-pr/SKILL.md` | 9th Codex skill: sets `KAOLA_SINK=pr` and delegates to `kaola-workflow-next`. Mirrors `commands/workflow-next-pr.md`. ≤ 40 lines. | frontmatter: `name`, `description`; body: `export KAOLA_SINK=pr`, bootstrap call, SCRIPTS_DIR two-step lookup |

---

## Files to Modify

| File | Changes | Why |
|------|---------|-----|
| `scripts/kaola-workflow-claim.js` | Add `--runtime` to `parseArgs`; add `runtime` field to `buildLockData`; add `runBootstrapSweep`, `runBootstrapWatchPr`, `runBootstrapClassify`, `runBootstrapClaim`, `cmdBootstrap`; register `'bootstrap'` in `main()` dispatcher | Gap #10 (runtime field) + bootstrap subcommand for Startup Step 0 |
| `commands/workflow-next.md` | Collapse Startup Step 0 inner body to single `node "$CLAIM_JS" bootstrap` call | Eliminates drift between Claude and Codex startup chain |
| `scripts/validate-kaola-workflow-contracts.js` | Add `'kaola-workflow-next-pr'` to `skills` array; add `function cmdBootstrap` assertion; add heartbeat assertions for 6 phase skills | Contract enforcement for new skill and bootstrap |
| `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` | Replace manual sweep/classify/claim startup steps with bootstrap invocation + SCRIPTS_DIR two-step lookup | Gap #3, #5, #6 (branch management, classifier, sweep) |
| `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md` | Add "## Session Heartbeat" section + `init-issue` step | Gap #2 (heartbeat) + gap #4 (roadmap) |
| `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md` | Add "## Session Heartbeat" section | Gap #2 |
| `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md` | Add "## Session Heartbeat" section | Gap #2 |
| `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md` | Add "## Session Heartbeat" section | Gap #2 |
| `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md` | Add "## Session Heartbeat" section | Gap #2 |
| `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` | Add "## Session Heartbeat" section + sink dispatch step | Gap #2 (heartbeat) + gap #7 (sink dispatch) |
| `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md` | Extend AGENTS.md addendum: add session lifecycle bullet | Gap #1 (claim/release lifecycle docs) |
| `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | Add Case 5: cross-runtime co-work, TWO DISTINCT projects | Gap cover for all parity items; extends test suite |

---

## Build Sequence

1. **T1: `scripts/kaola-workflow-claim.js`** — Add `--runtime`, `buildLockData` field, and all bootstrap functions. Foundation for all other tasks.
2. **T2: `commands/workflow-next.md`** — Collapse Startup Step 0 to bootstrap call. Depends on T1.
3. **T3 (atomic): `plugins/kaola-workflow/skills/kaola-workflow-next-pr/SKILL.md` + `scripts/validate-kaola-workflow-contracts.js`** — Create 9th skill + update skills array in same write-set.
4. **T4: `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md`** — Add bootstrap invocation. Depends on T1.
5. **T5a–T5f + T6 (parallel group B)**: All 6 phase skills + kaola-workflow-init. Disjoint write sets, depend only on T1.
6. **T7: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`** — Case 5. Depends on all preceding tasks.

---

## Parallelization Plan

| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| serial | T1 → T2 → T3 → T4 | dependency chain |
| parallel-B | T5a, T5b, T5c, T5d, T5e, T5f, T6 | disjoint SKILL.md files; can run after T1 |
| serial | T7 | final; depends on all |

---

## Exact Replacement Text: workflow-next.md Startup Step 0

```bash
CLAIM_JS="${CLAUDE_PLUGIN_ROOT:-./}/scripts/kaola-workflow-claim.js"
if [ -f "$CLAIM_JS" ] && [ -n "$KAOLA_SESSION_ID" ]; then
  KAOLA_SINK_FLAG=""
  [ -n "${KAOLA_SINK:-}" ] && KAOLA_SINK_FLAG="--sink $KAOLA_SINK"
  BOOTSTRAP_OUT=$(node "$CLAIM_JS" bootstrap \
    --session "$KAOLA_SESSION_ID" \
    --runtime claude \
    $KAOLA_SINK_FLAG 2>/dev/null) || true
fi
```

---

## Exact Snippet: SCRIPTS_DIR Two-Step Lookup (canonical Codex pattern)

```bash
if [ -f "plugins/kaola-workflow/scripts/kaola-workflow-claim.js" ]; then
  SCRIPTS_DIR="plugins/kaola-workflow/scripts"
else
  SCRIPTS_DIR="$(find "$HOME/.codex/plugins/cache" -path '*/kaola-workflow/*/scripts' -maxdepth 6 -type d -print -quit 2>/dev/null)"
fi
```

---

## cmdBootstrap Function Breakdown (pseudocode)

```
runBootstrapSweep(claimScript, cwd):           // ~8 lines
  execFileSync(node, [claimScript, 'sweep'], {cwd, OFFLINE})
  // swallows errors gracefully

runBootstrapWatchPr(claimScript, cwd):         // ~8 lines
  if OFFLINE: return
  execFileSync(node, [claimScript, 'watch-pr'], {cwd})
  // swallows errors gracefully

runBootstrapClassify(classifierScript, args):  // ~20 lines
  if OFFLINE or no classifier: return {pick: null}
  for each issue number in open issues (gh issue list):
    result = execFileSync(node, [classifierScript, 'classify', '--issue', N])
    verdict = JSON.parse(result).verdict
    if green or yellow:
      project = derive via roadmap.js project-name || 'issue-N'
      return {pick: N, project, verdict}
  return {pick: null}

runBootstrapClaim(claimScript, args, pick):    // ~15 lines
  execFileSync(node, [claimScript, 'claim',
    '--session', args.session,
    '--project', pick.project,
    '--issue', String(pick.pick),
    '--runtime', args.runtime,
    ...(args.sink ? ['--sink', args.sink] : [])
  ])
  if pick.verdict === 'yellow':
    append to kaola-workflow/{pick.project}/.cache/parallel-classifier.md
  return pick

cmdBootstrap():                                // ~12 lines
  args = parseArgs(process.argv.slice(3))
  assert args.session
  root = getRoot()
  classifierScript = resolve kaola-workflow-classifier.js
  runBootstrapSweep(__filename, root)
  runBootstrapWatchPr(__filename, root)
  pick = runBootstrapClassify(classifierScript, args)
  if !pick.pick: process.exitCode = 1; return
  runBootstrapClaim(__filename, args, pick)
  process.stdout.write(JSON.stringify({project: pick.project, issue: pick.pick, verdict: pick.verdict}) + '\n')
```

Total: ~63 new lines in claim.js → 645 + 63 = 708. Under 800.

---

## External Dependencies

No new npm packages needed. All dependencies already available:
- `child_process.execFileSync` — already imported in `claim.js`
- `fs`, `path` — already imported
- `scripts/kaola-workflow-classifier.js` — resolved relative to `__filename`
- `scripts/kaola-workflow-roadmap.js` — same directory

`KAOLA_WORKFLOW_OFFLINE` env var already gates all `gh` calls in both `claim.js` and `classifier.js`.

---

## Task List (detailed)

### Task 1: Add --runtime flag and bootstrap subcommand to claim.js
- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/kaola-workflow-claim.js`
- Depends On: none
- Parallel Group: serial
- Action: MODIFY
- Implement: Add `--runtime` handling to `parseArgs`; add `runtime: args.runtime || 'claude'` to `buildLockData`; implement `runBootstrapSweep` (~8L), `runBootstrapWatchPr` (~8L), `runBootstrapClassify` (~20L), `runBootstrapClaim` (~15L), `cmdBootstrap` (~12L); add `'bootstrap'` case to `main()` dispatcher. Yellow-verdict cache append in `runBootstrapClaim`.
- Mirror: `buildLockData` pattern (lines ~246-260), `cmdSweep` shell-out pattern
- Validate: `node scripts/simulate-workflow-walkthrough.js && node -e "process.exit(require('fs').readFileSync('scripts/kaola-workflow-claim.js','utf8').split('\n').length > 800 ? 1 : 0)"`

### Task 2: Collapse workflow-next.md Startup Step 0 to bootstrap call
- File: `commands/workflow-next.md`
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `commands/workflow-next.md`
- Depends On: Task 1
- Parallel Group: serial
- Action: MODIFY
- Implement: Replace the inner body of the Startup Step 0 `if` block with the exact 7-line bootstrap call. Preserve outer `if` guard. Add `BOOTSTRAP_OUT` documentation note. Remove yellow-verdict append paragraph (now in bootstrap).
- Mirror: `commands/workflow-next-pr.md` minimal-wrapper pattern
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task 3a+3b (atomic): Create 9th skill + update contract validator
- File: `plugins/kaola-workflow/skills/kaola-workflow-next-pr/SKILL.md`
- Test File: `scripts/validate-kaola-workflow-contracts.js`
- Write Set: `plugins/kaola-workflow/skills/kaola-workflow-next-pr/SKILL.md`, `scripts/validate-kaola-workflow-contracts.js`
- Depends On: none (atomic pair)
- Parallel Group: serial
- Action: CREATE + MODIFY
- Implement (SKILL.md): frontmatter `name: kaola-workflow-next-pr`, body sets `KAOLA_SINK=pr`, SCRIPTS_DIR two-step lookup, calls bootstrap with `--runtime codex --sink pr`. ≤ 40 lines.
- Implement (validator): Add `'kaola-workflow-next-pr'` to `skills` array; add `assertIncludes` for `function cmdBootstrap` in `claim.js`; add heartbeat assertions for 6 phase skills.
- Mirror: `commands/workflow-next-pr.md`; existing `for (const skill of skills)` loop
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 4: Add bootstrap invocation to kaola-workflow-next SKILL.md
- File: `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md`
- Test File: `scripts/validate-kaola-workflow-contracts.js`
- Write Set: `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md`
- Depends On: Task 1
- Parallel Group: serial
- Action: MODIFY
- Implement: Add SCRIPTS_DIR two-step lookup then `node "${SCRIPTS_DIR}/kaola-workflow-claim.js" bootstrap --session "$KAOLA_SESSION_ID" --runtime codex [--sink "$KAOLA_SINK"]` to Startup section, replacing manual sweep/classify/claim steps.
- Mirror: existing Startup section structure, Codex script lookup pattern from `kaola-workflow-next/SKILL.md:60`
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 5a: Add heartbeat + init-issue to kaola-workflow-research SKILL.md
- File: `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md`
- Write Set: `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md`
- Depends On: Task 1
- Parallel Group: parallel-B
- Action: MODIFY
- Implement: Add "## Session Heartbeat" section before Step 1 (SCRIPTS_DIR two-step lookup + ticker block). Add init-issue step after write-phase-file step.
- Mirror: `commands/kaola-workflow-phase1.md` Session Heartbeat block and Step 5b
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Tasks 5b-5e: Add heartbeat to ideation, plan, execute, review SKILL.md files
- Files: `kaola-workflow-{ideation,plan,execute,review}/SKILL.md` (4 files)
- Write Set: each respective SKILL.md
- Depends On: Task 1
- Parallel Group: parallel-B
- Action: MODIFY
- Implement: Add "## Session Heartbeat" section before Steps in each. SCRIPTS_DIR two-step lookup then ticker block.
- Mirror: `commands/kaola-workflow-phase{2,3,4,5}.md` Session Heartbeat block respectively
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 5f: Add heartbeat + sink dispatch to kaola-workflow-finalize SKILL.md
- File: `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md`
- Write Set: `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md`
- Depends On: Task 1
- Parallel Group: parallel-B
- Action: MODIFY
- Implement: Add "## Session Heartbeat" section before Guardrails. Add sink dispatch block to Required Steps item 8 (Commit and push): read sink field from workflow-state.md; if pr → `node "${SCRIPTS_DIR}/kaola-workflow-sink-pr.js"`; else → `node "${SCRIPTS_DIR}/kaola-workflow-sink-merge.js"`.
- Mirror: `commands/kaola-workflow-phase6.md` for sink dispatch pattern and Session Heartbeat block
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 6: Add session lifecycle docs to kaola-workflow-init SKILL.md
- File: `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md`
- Write Set: `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md`
- Depends On: none
- Parallel Group: parallel-B
- Action: MODIFY
- Implement: Extend AGENTS.md addendum bullet list with session lifecycle bullet describing claim/release/ticker flow.
- Mirror: existing AGENTS.md addendum bullets
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 7: Add Case 5 to Codex simulator
- File: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- Write Set: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- Depends On: Tasks 1-6 all complete
- Parallel Group: serial (last)
- Action: MODIFY
- Implement: Add Case 5 after Case 4. Two temp dirs, two distinct projects (`project-alpha`/runtime:claude, `project-beta`/runtime:codex). `KAOLA_WORKFLOW_OFFLINE=1`. Write lock files directly. Assert: (a) runtime fields correct; (b) locks isolated; (c) double-claim exits 2; (d) bootstrap with no open issues exits 1. Temp `bin/` gh shim prepended to PATH.
- Mirror: Epic 9 `writeLock`, `makeKwDirs`, `makeGhShim` pattern in `scripts/simulate-workflow-walkthrough.js`
- Validate: `npm run test:kaola-workflow:codex`
