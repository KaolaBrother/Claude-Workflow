# Phase 3 - Plan: codex-parity

## Blueprint

### Files to Create

| File | Purpose | Key Interfaces |
|------|---------|----------------|
| `plugins/kaola-workflow/skills/kaola-workflow-next-pr/SKILL.md` | 9th Codex skill: sets `KAOLA_SINK=pr` and delegates to `kaola-workflow-next`. Mirrors `commands/workflow-next-pr.md`. ≤ 40 lines. | frontmatter: `name`, `description`; body: `export KAOLA_SINK=pr`, SCRIPTS_DIR file-path lookup, bootstrap call with `--runtime codex --sink pr` |

### Files to Modify

| File | Changes | Why |
|------|---------|-----|
| `scripts/kaola-workflow-claim.js` | Add `--runtime` to `parseArgs`; add `runtime` field to `buildLockData`; add `listOpenIssues`, `pickFirstActionableIssue`, `runBootstrapSweep`, `runBootstrapWatchPr`, `runBootstrapClassify`, `runBootstrapClaim`, `cmdBootstrap`; register `'bootstrap'` in `main()` dispatcher | Gap #10 (runtime field) + bootstrap subcommand for Startup Step 0 |
| `commands/workflow-next.md` | Collapse Startup Step 0 inner body to single `BOOTSTRAP_OUT=$(node "$CLAIM_JS" bootstrap ...)` call | Eliminates drift between Claude and Codex startup chain |
| `scripts/validate-kaola-workflow-contracts.js` | Add `'kaola-workflow-next-pr'` to `skills` array; add `function cmdBootstrap` assertion; add heartbeat assertions for 6 phase skills | Contract enforcement for new skill and bootstrap |
| `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` | Replace manual sweep/classify/claim startup steps with file-path lookup + bootstrap invocation | Gap #3, #5, #6 (branch management, classifier, sweep) |
| `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md` | Add "## Session Heartbeat" section + `init-issue` step + `patch-branch` call | Gap #2 (heartbeat) + gap #4 (roadmap) + gap #3 (branch) |
| `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md` | Add "## Session Heartbeat" section | Gap #2 |
| `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md` | Add "## Session Heartbeat" section | Gap #2 |
| `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md` | Add "## Session Heartbeat" section | Gap #2 |
| `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md` | Add "## Session Heartbeat" section | Gap #2 |
| `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` | Add "## Session Heartbeat" section + sink dispatch step | Gap #2 (heartbeat) + gap #7 (sink dispatch) |
| `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md` | Extend AGENTS.md addendum: add session lifecycle bullet | Gap #1 (claim/release lifecycle docs) |
| `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | Add Case 5: cross-runtime co-work, TWO DISTINCT projects | Gap cover for all parity items; extends test suite |

### Build Sequence

1. T1: `scripts/kaola-workflow-claim.js` — foundation; all other tasks depend on bootstrap existing
2. T2: `commands/workflow-next.md` — collapse Step 0; depends on T1
3. T3 (atomic): `plugins/kaola-workflow/skills/kaola-workflow-next-pr/SKILL.md` + `scripts/validate-kaola-workflow-contracts.js` — create 9th skill and update skills array in same write-set
4. T4: `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` — add bootstrap invocation; depends on T1
5. T5a–T5f + T6 (parallel-B): 6 phase skills + init skill; disjoint write sets; depend only on T1
6. T7: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` — Case 5; depends on all preceding tasks

### Parallelization Plan

| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| serial | T1 → T2 → T3 → T4 | dependency chain |
| parallel-B | T5a, T5b, T5c, T5d, T5e, T5f, T6 | disjoint SKILL.md files; all depend only on T1 |
| serial | T7 | final; depends on all |

### External Dependencies

No new npm packages. All dependencies already in claim.js:
- `child_process.execFileSync` — already imported
- `fs`, `path` — already imported
- `scripts/kaola-workflow-classifier.js` — resolved relative to `__filename`
- `scripts/kaola-workflow-roadmap.js` — same directory

### Canonical Codex Script Lookup (File-Path Form)

Every Node invocation in Codex skills must use this file-path form (matching `kaola-workflow-next/SKILL.md:56-58`):

```bash
claim_script="plugins/kaola-workflow/scripts/kaola-workflow-claim.js"
if [ ! -f "$claim_script" ]; then
  claim_script="$(find "$HOME/.codex/plugins/cache" -path '*/kaola-workflow/*/scripts/kaola-workflow-claim.js' -print -quit 2>/dev/null)"
fi
```

For other scripts, substitute the filename. Do NOT use directory-form `find ... -type d`.

---

## Task List

### Task 1: Add --runtime flag and bootstrap subcommand to claim.js

- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/kaola-workflow-claim.js`
- Depends On: none
- Parallel Group: serial
- Action: MODIFY
- Implement:
  1. Add `--runtime` to `parseArgs` (alongside `--session`, `--project`, etc.). Caller-passed `--runtime` flag wins; `KAOLA_RUNTIME` env var is NOT read by claim.js (per Explicit Not-to-Build list).
  2. Add `runtime: args.runtime || 'claude'` to `buildLockData` return object.
  3. Add `listOpenIssues(cwd)` (~8L): calls `execFileSync('gh', ['issue', 'list', '--state', 'open', '--json', 'number'], {cwd})`, parses JSON, returns array of issue numbers. Returns `[]` on error.
  4. Add `pickFirstActionableIssue(classifierScript, issues, args)` (~15L): iterates issue numbers, calls `execFileSync(node, [classifierScript, 'classify', '--issue', N])` for each, parses verdict; if green/yellow, derives project name via roadmap.js `project-name` subcommand (or `'issue-' + N` fallback), returns `{pick: N, project, verdict}`. Returns `{pick: null}` if none.
  5. Add `runBootstrapSweep(claimScript, cwd)` (~8L): calls `execFileSync(node, [claimScript, 'sweep'], {cwd, env: {...process.env, KAOLA_WORKFLOW_OFFLINE: '1'}})`, swallows errors gracefully.
  6. Add `runBootstrapWatchPr(claimScript, cwd)` (~8L): if `KAOLA_WORKFLOW_OFFLINE`, returns early. Calls `execFileSync(node, [claimScript, 'watch-pr'], {cwd})`, swallows errors gracefully.
  7. Add `runBootstrapClassify(classifierScript, args)` (~8L): if `KAOLA_WORKFLOW_OFFLINE` or no classifier script, returns `{pick: null}`. Calls `listOpenIssues` then `pickFirstActionableIssue`.
  8. Add `runBootstrapClaim(claimScript, args, pick)` (~15L): calls `execFileSync(node, [claimScript, 'claim', '--session', args.session, '--project', pick.project, '--issue', String(pick.pick), '--runtime', args.runtime, ...(args.sink ? ['--sink', args.sink] : [])])`. If `pick.verdict === 'yellow'`, appends to `kaola-workflow/{pick.project}/.cache/parallel-classifier.md`. Returns pick.
  9. Add `cmdBootstrap()` (~12L): parses args, asserts `args.session`, resolves classifierScript relative to `__filename`, calls sweep → watch-pr → classify → claim in sequence. If `!pick.pick`, sets `process.exitCode = 1` and returns. Writes `JSON.stringify({project, issue, verdict})` to stdout.
  10. Add `'bootstrap'` case to `main()` dispatcher.
- Mirror: `buildLockData` pattern (lines ~246-260), `cmdSweep` shell-out pattern
- Validate: `node scripts/simulate-workflow-walkthrough.js && node -e "process.exit(require('fs').readFileSync('scripts/kaola-workflow-claim.js','utf8').split('\n').length > 800 ? 1 : 0)"`

### Task 2: Collapse workflow-next.md Startup Step 0 to bootstrap call

- File: `commands/workflow-next.md`
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `commands/workflow-next.md`
- Depends On: Task 1
- Parallel Group: serial
- Action: MODIFY
- Implement: Replace the inner body of the Startup Step 0 `if` block with this exact replacement:
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
  Preserve outer guard structure. Remove KAOLA_PROJ/KAOLA_PICK/KAOLA_VERDICT variable usage and the yellow-verdict append paragraph (now handled inside `runBootstrapClaim`).
- Mirror: `commands/workflow-next-pr.md` minimal-wrapper pattern
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task 3 (atomic): Create 9th skill + update contract validator

- File: `plugins/kaola-workflow/skills/kaola-workflow-next-pr/SKILL.md`
- Test File: `scripts/validate-kaola-workflow-contracts.js`
- Write Set: `plugins/kaola-workflow/skills/kaola-workflow-next-pr/SKILL.md`, `scripts/validate-kaola-workflow-contracts.js`
- Depends On: none (atomic pair — must land together)
- Parallel Group: serial
- Action: CREATE + MODIFY
- Implement (SKILL.md ≤ 40 lines):
  - Frontmatter: `name: kaola-workflow-next-pr`, `description: Start next PR-sink workflow session`
  - Body: `export KAOLA_SINK=pr`; file-path lookup for `kaola-workflow-claim.js`; call `node "$claim_script" bootstrap --session "$KAOLA_SESSION_ID" --runtime codex --sink pr`
  - Mirror `commands/workflow-next-pr.md` structure
- Implement (validator):
  - Add `'kaola-workflow-next-pr'` to `const skills = [...]` array
  - Add `assertIncludes` check for `function cmdBootstrap` in `claim.js`
  - Add heartbeat assertions for 6 phase skills (research, ideation, plan, execute, review, finalize)
- Mirror: existing `for (const skill of skills)` loop in validator; `commands/workflow-next-pr.md`
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 4: Add bootstrap invocation to kaola-workflow-next SKILL.md

- File: `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md`
- Test File: `scripts/validate-kaola-workflow-contracts.js`
- Write Set: `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md`
- Depends On: Task 1
- Parallel Group: serial
- Action: MODIFY
- Implement: In Startup section, replace manual sweep/classify/claim steps with:
  1. File-path lookup for `kaola-workflow-claim.js` (using canonical form matching SKILL.md:56-58)
  2. Call `node "$claim_script" bootstrap --session "$KAOLA_SESSION_ID" --runtime codex${KAOLA_SINK:+ --sink "$KAOLA_SINK"}`
- Mirror: existing Startup section structure; file-path lookup pattern at SKILL.md:56-58
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 5a: Add heartbeat + init-issue + patch-branch to kaola-workflow-research SKILL.md

- File: `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md`
- Write Set: `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md`
- Depends On: Task 1
- Parallel Group: parallel-B
- Action: MODIFY
- Implement:
  1. Add "## Session Heartbeat" section before Step 1: file-path lookup for `kaola-workflow-claim.js`; ticker block mirroring `commands/kaola-workflow-phase1.md` Session Heartbeat block
  2. Add `init-issue` step after write-phase-file step (mirror `commands/kaola-workflow-phase1.md` Step 5b)
  3. Add `patch-branch` call: file-path lookup for `kaola-workflow-claim.js`; `node "$claim_script" patch-branch --session "$KAOLA_SESSION_ID" --project "$KAOLA_PROJECT" --branch "$(git rev-parse --abbrev-ref HEAD)"` (mirror `commands/kaola-workflow-phase1.md:283,290`)
- Mirror: `commands/kaola-workflow-phase1.md` Session Heartbeat block and Steps 5b, 283-290
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 5b: Add heartbeat to kaola-workflow-ideation SKILL.md

- File: `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md`
- Write Set: `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md`
- Depends On: Task 1
- Parallel Group: parallel-B
- Action: MODIFY
- Implement: Add "## Session Heartbeat" section before Steps: file-path lookup for `kaola-workflow-claim.js`; ticker block mirroring `commands/kaola-workflow-phase2.md` Session Heartbeat block
- Mirror: `commands/kaola-workflow-phase2.md` Session Heartbeat block
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 5c: Add heartbeat to kaola-workflow-plan SKILL.md

- File: `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md`
- Write Set: `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md`
- Depends On: Task 1
- Parallel Group: parallel-B
- Action: MODIFY
- Implement: Add "## Session Heartbeat" section before Steps: file-path lookup for `kaola-workflow-claim.js`; ticker block mirroring `commands/kaola-workflow-phase3.md` Session Heartbeat block
- Mirror: `commands/kaola-workflow-phase3.md` Session Heartbeat block
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 5d: Add heartbeat to kaola-workflow-execute SKILL.md

- File: `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md`
- Write Set: `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md`
- Depends On: Task 1
- Parallel Group: parallel-B
- Action: MODIFY
- Implement: Add "## Session Heartbeat" section before Steps: file-path lookup for `kaola-workflow-claim.js`; ticker block mirroring `commands/kaola-workflow-phase4.md` Session Heartbeat block
- Mirror: `commands/kaola-workflow-phase4.md` Session Heartbeat block
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 5e: Add heartbeat to kaola-workflow-review SKILL.md

- File: `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md`
- Write Set: `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md`
- Depends On: Task 1
- Parallel Group: parallel-B
- Action: MODIFY
- Implement: Add "## Session Heartbeat" section before Steps: file-path lookup for `kaola-workflow-claim.js`; ticker block mirroring `commands/kaola-workflow-phase5.md` Session Heartbeat block
- Mirror: `commands/kaola-workflow-phase5.md` Session Heartbeat block
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 5f: Add heartbeat + sink dispatch to kaola-workflow-finalize SKILL.md

- File: `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md`
- Write Set: `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md`
- Depends On: Task 1
- Parallel Group: parallel-B
- Action: MODIFY
- Implement:
  1. Add "## Session Heartbeat" section before Guardrails: file-path lookup for `kaola-workflow-claim.js`; ticker block mirroring `commands/kaola-workflow-phase6.md` Session Heartbeat block
  2. Add sink dispatch to Required Steps item 8 (Commit and push): file-path lookups for `kaola-workflow-sink-pr.js` and `kaola-workflow-sink-merge.js`; read sink field from workflow-state.md; if pr → `node "$sink_pr_script"`; else → `node "$sink_merge_script"`
- Mirror: `commands/kaola-workflow-phase6.md` for sink dispatch pattern and Session Heartbeat block
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 6: Add session lifecycle docs to kaola-workflow-init SKILL.md

- File: `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md`
- Write Set: `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md`
- Depends On: none
- Parallel Group: parallel-B
- Action: MODIFY
- Implement: Extend AGENTS.md addendum bullet list with session lifecycle bullet: "Session lifecycle: kaola-workflow-claim.js claim (acquires lock, heartbeats), release (releases lock), sweep (expires stale locks); sessions heartbeat every 5 minutes; locks expire after 30 minutes of silence."
- Mirror: existing AGENTS.md addendum bullets in SKILL.md
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 7: Add Case 5 to Codex simulator

- File: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- Write Set: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- Depends On: Tasks 1-6 all complete
- Parallel Group: serial (last)
- Action: MODIFY
- Implement: Add Case 5 after Case 4. Two temp dirs, two distinct projects (`project-alpha`/runtime:claude, `project-beta`/runtime:codex). `KAOLA_WORKFLOW_OFFLINE=1`. Must invoke actual `node claim.js bootstrap --runtime codex --session SID` subprocess (not just write lock files directly) to verify the full bootstrap code path. Temp `bin/` gh shim prepended to PATH. Assert: (a) runtime fields correct in lock files; (b) locks isolated by project; (c) double-claim on same project exits 2; (d) bootstrap with no open issues (gh shim returns empty) exits 1.
- Mirror: Epic 9 `writeLock`, `makeKwDirs`, `makeGhShim` pattern in `scripts/simulate-workflow-walkthrough.js`
- Validate: `npm run test:kaola-workflow:codex` (or `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`)

---

## Advisor Notes

Three standing notes from advisor plan gate (all incorporated above):

1. **Pre-factor runBootstrapClassify**: T1 pre-factors into `listOpenIssues(cwd)` (~8L) + `pickFirstActionableIssue(classifierScript, issues, args)` (~15L) helpers before `runBootstrapClassify` calls them. Ensures each function stays ≤ 50 lines.

2. **Case 5 must use actual bootstrap subprocess**: T7 must invoke `node claim.js bootstrap` as a real subprocess via `execFileSync`/`spawnSync`, NOT write lock files directly. This verifies the full bootstrap code path.

3. **--runtime flag precedence pinned**: Caller-passed `--runtime` flag wins over any environment variable. `KAOLA_RUNTIME` env var is NOT read by claim.js (per Explicit Not-to-Build list from Phase 2).

**SCRIPTS_DIR correction**: All SKILL.md tasks use file-path form for the two-step lookup (matching `kaola-workflow-next/SKILL.md:56-58`), not the directory-form `find ... -type d` in the architect's draft.

Architect revision loop skipped — the three standing notes are mechanical additions (function pre-factoring spec, subprocess assertion, flag precedence doc). The Phase 3 skill's "main session may synthesize" clause covers this. Full blueprint is otherwise dependency-safe and implementable as written.

---

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | | Three advisor blockers withdrawn via primary-source fact-checking; standing notes are mechanical additions synthesized by main session per Phase 3 skill |
