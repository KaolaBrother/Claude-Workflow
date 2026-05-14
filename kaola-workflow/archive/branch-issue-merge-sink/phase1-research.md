# Phase 1 - Research / Discovery: branch-issue-merge-sink

## Deliverable

`scripts/kaola-workflow-sink-merge.js` — a new CLI script implementing the branch-per-issue + auto-merge sink for kaola-workflow. Plus modifications to:
- `scripts/kaola-workflow-claim.js` — write real branch name at claim time (replaces `branch: TBD`)
- `commands/kaola-workflow-phase6.md` — Step 8 becomes sink-merge.js invocation
- `commands/workflow-next.md` — add `Branch:` line to required output block
- `install.sh` — add kaola-workflow-sink-merge.js to hard-coded copy list
- `scripts/validate-workflow-contracts.js` — add install.sh assertion for sink-merge.js
- `scripts/simulate-workflow-walkthrough.js` — add Cases 3 and 4 (sibling merge + FF race)

## Why

After this stage, a session running `/goal` lands its work on `main` automatically via a safe rebase-then-ff-merge sequence. Sibling-merge incompatibilities surface before integration. The common single-session case pays zero re-validation cost via the merge-base skip-check.

## Affected Area

| File | Change |
|------|--------|
| scripts/kaola-workflow-sink-merge.js | CREATE — ~200 lines, 10-step merge sequence |
| scripts/kaola-workflow-claim.js | MODIFY — cmdClaim writes real branch name instead of TBD |
| commands/kaola-workflow-phase6.md | MODIFY — Step 8 replaced with sink-merge.js invocation |
| commands/workflow-next.md | MODIFY — Branch: line added to Required Output |
| install.sh | MODIFY — sink-merge.js added to hard-coded copy loop |
| scripts/validate-workflow-contracts.js | MODIFY — assertIncludes for sink-merge.js in install.sh |
| scripts/simulate-workflow-walkthrough.js | MODIFY — Cases 3 and 4 added |

## Key Patterns Found

1. **Script structure**: Shebang `#!/usr/bin/env node` + CJS require, OFFLINE guard, isSafeName, assert, ghExec, getRoot, parseArgs, top-level try/catch — `scripts/kaola-workflow-claim.js:1-57,353`
2. **Git subprocess calls**: `execFileSync('git', [...], { encoding: 'utf8' })` — no abstraction layer — `claim.js:33`
3. **Sink block written by cmdClaim**: `branch: TBD` (never updated after initial write) — `claim.js:99-104`; `updateSinkLease` only appends when `## Sink` absent — `claim.js:114-117`
4. **Phase 6 Step 8**: manual stage/commit/push at `commands/kaola-workflow-phase6.md:405-428` — to be replaced
5. **install.sh hard-coded script loop**: `install.sh:113-121` — explicit file list, no glob
6. **Simulate case template**: try/finally + mkdtempSync + sequential execFileSync calls — `simulate-workflow-walkthrough.js:329-408`

## Test Patterns

- Framework: none (custom `assert` helper, simulate.js:10-13)
- Location: `scripts/simulate-workflow-walkthrough.js`
- Structure: Epic Case N blocks inside try/finally with temp dir (`fs.mkdtempSync`)
- subprocess: `execFileSync(process.execPath, [scriptPath, ...args], { cwd: tmpDir, env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' } })`
- Cases 3 and 4 will be first tests using real git operations (git init, commit, branch, merge-base); all git scaffolding must be written from scratch

## Config & Env

- `KAOLA_WORKFLOW_OFFLINE=1` — skips all gh CLI calls; must also be used to skip `git push` in test scenarios
- `KAOLA_SESSION_ID` — bash-only; not read by .js scripts
- `CLAUDE_PLUGIN_ROOT` — bash-only; not read by .js scripts
- `MAX_AUTOMERGE_RETRIES` — not defined anywhere; must be introduced as constant `3` in kaola-workflow-sink-merge.js

## External Docs

None needed — git and gh CLI behavior is stable and all patterns are internal mirrors of claim.js.

## GitHub Issue

KaolaBrother/Kaola-Workflow#4

## Completeness Score

10/10
- Goal clarity: 3/3 — detailed issue body with exact 10-step merge sequence
- Expected outcome: 3/3 — 6 explicit acceptance criteria (Cases 3 and 4, skip-check correctness, conflict stops, FF race retry)
- Scope boundaries: 2/2 — explicit "Out of scope" (PR sink, roadmap split, classifier)
- Constraints: 2/2 — skip-check algorithm, MAX_AUTOMERGE_RETRIES=3, no inline conflict resolution, ff-merge only

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | | All patterns are internal (git/gh CLI); no external library behavior needed |

## Notes / Future Considerations

- Codex twin of sink-merge.js not needed — claim.js is Claude Code-only and Codex contract validator only asserts repairScript + simulateScript
- Stage 1 migration: if a lease has `branch: null` in lock (created before this issue), Phase 1 on resume cuts the branch and patches the lock + Sink block + GitHub comment — this is in-scope per issue body
- sink-merge.js exit codes: 0 = success, 1 = error/conflict/stopped, 2 = FF race exhausted (mirror claim.js convention)
- Pre-commit hook is unaffected by ff-merge (no merge commit means no pre-commit trigger for merge)
