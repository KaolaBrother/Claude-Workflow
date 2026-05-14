# Code Explorer — branch-issue-merge-sink

## Entry Points
- `scripts/kaola-workflow-claim.js`: invoked by workflow-next.md Startup Step 0 and all phase heartbeat blocks. Subcommands: claim, release, heartbeat, sweep, status.
- `scripts/simulate-workflow-walkthrough.js`: run by `npm run test:kaola-workflow:claude` (package.json:36).

---

## Q1 — Similar Implementations to Mirror

**All scripts live flat in `scripts/`, no subdirectory exists.** New script: `scripts/kaola-workflow-sink-merge.js`.

**kaola-workflow-claim.js patterns to mirror:**
- Shebang + CJS: `#!/usr/bin/env node` + require('fs'), require('path'), require('os'), require('child_process') — claim.js:1-6
- OFFLINE guard: `const OFFLINE = process.env.KAOLA_WORKFLOW_OFFLINE === '1';` — claim.js:8
- `isSafeName(name)`: excludes '/', '\\', '\0', '.', '..' — claim.js:12-16
- `field(content, name)`: regex extraction from markdown `key: value` lines — claim.js:18-22
- `parseArgs(argv)`: manual `--flag value` parser, no third-party dependency — claim.js:48-57
- `getRoot()`: execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }) — claim.js:31-36
- `ghExec(args)`: wraps execFileSync('gh', args, { encoding: 'utf8' }).trim(), returns '' when OFFLINE — claim.js:26-29
- Top-level try/catch: `try { main(); } catch (err) { process.stderr.write(err.message + '\n'); process.exitCode = 1; }` — claim.js:353
- `assert(cond, msg)`: throws Error(msg) — claim.js:10

**Exit codes:**
- process.exitCode = 2: lock contention (EEXIST after retries) — claim.js:199
- process.exitCode = 1: subprocess failures via top-level catch — claim.js:353
- process.exitCode = 1: heartbeat when no lock found — claim.js:258-260

## Q2 — Naming and File Organization

No subdirectories. All scripts flat under `scripts/` with `kaola-workflow-` prefix. New script: `scripts/kaola-workflow-sink-merge.js`.

## Q3 — Error Handling Patterns

- execFileSync throws on nonzero exit; propagates to top-level catch
- GitHub calls wrapped in try/catch with _ suppression (non-fatal) — claim.js:206, 238, 295
- writeLockFile uses fs.openSync(lp, 'wx') for atomic exclusive create — claim.js:140-147
- Subprocess exit codes: 1 = error, 2 = contention/block

## Q4 — Test Locations and Structure

**Location:** `scripts/simulate-workflow-walkthrough.js`
**Framework:** none — uses custom `assert(condition, message)` — simulate.js:10-13
**Case structure:** sequential numbered steps inside try/finally blocks with fs.mkdtempSync tmpdir
**Epic Case 1:** lines 329-408; calls execFileSync(process.execPath, [...], { cwd: epicTmp, KAOLA_WORKFLOW_OFFLINE: '1' })
**Helpers:**
- write(file, content) — line 16
- read(file) — line 21
- assertNext(stateFile, expected) — reads next_command: line — line 78
- assertFileIncludes(file, needle) — line 83
- assertCommandIncludes(relativePath, needles) — line 88
- assertHookOutput(workdir, ...) — line 95
- runRepair(workdir, projectArg) — line 105

**Zero existing git operations** in any test. Cases 3 and 4 will be the first to invoke real git. All git scaffolding (git init, commit, branch, remote) must be written from scratch.

## Q5 — workflow-state.md Sink Block and Phase 6 Step 8

**Current Sink block written by cmdClaim (claim.js:99-104):**
```
## Sink
branch: TBD
issue_number: <value>
claimed_at: <ISO timestamp>
```

`updateSinkLease` (claim.js:95-125): only appends Sink+Lease if `## Sink` absent; `branch: TBD` is NEVER updated after initial write. sink-merge.js or modified cmdClaim must write the real branch name.

**workflow-next.md Required Output block (lines 179-190):** prints Workflow project, Current phase, Current step, Pending gates, Next command. No `Branch:` line currently.

**Phase 6 Step 8 (kaola-workflow-phase6.md:405-428):** currently manual — git status, stage files, conventional commit, git push. Explicitly forbids amend/rebase/merge without user approval. sink-merge.js replaces this with automated rebase-then-FF-merge.

## Q6 — Config, Env Vars, Feature Flags

- KAOLA_WORKFLOW_OFFLINE: claim.js:8 — when '1', all ghExec calls return '' and skip network
- KAOLA_SESSION_ID: used in bash contexts only (workflow-next.md, phase files, pre-commit.sh); not read in any .js script
- CLAUDE_PLUGIN_ROOT: used in bash contexts only
- MAX_AUTOMERGE_RETRIES: **does NOT exist anywhere** — must be introduced as new constant in sink-merge.js (value: 3 per issue spec)

## Q7 — Git Helper Patterns

No abstraction layer. Raw execFileSync:
- execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }) — claim.js:33
- execFileSync('gh', args, { encoding: 'utf8' }).trim() — claim.js:28
- simulate.js invokes scripts via execFileSync(process.execPath, [scriptPath, ...args], { cwd, env }) — simulate.js:342-345

## Q8 — install.sh

Hard-coded script list at install.sh:113-121:
```bash
for script_file in \
  "$SOURCE_SCRIPTS_DIR"/kaola-workflow-repair-state.js \
  "$SOURCE_SCRIPTS_DIR"/kaola-workflow-claim.js; do
```
**kaola-workflow-sink-merge.js must be added as a third line.**

**Contract validator:** validate-workflow-contracts.js:192 asserts `assertIncludes('install.sh', 'kaola-workflow-claim.js')`. A new `assertIncludes('install.sh', 'kaola-workflow-sink-merge.js')` must also be added.

## Key Files

| File | Role |
|------|------|
| scripts/kaola-workflow-claim.js | Primary mirror for sink-merge.js structure; contains updateSinkLease, cmdClaim, ghExec, isSafeName, parseArgs |
| scripts/simulate-workflow-walkthrough.js | Integration test harness; Epic Case 1 (lines 329-408) is template for Cases 3 and 4 |
| commands/kaola-workflow-phase6.md | Step 8 (lines 405-428) is what sink-merge.js replaces |
| commands/workflow-next.md | Required output block (lines 179-190) lacks Branch: line; Co-active Leases at 109-111 |
| install.sh | Hard-coded script list at lines 113-115; sink-merge.js must be added |
| scripts/validate-workflow-contracts.js | Contract assertions for install.sh at lines 187-193; new assertion needed |

## Codex Parallel Tree

claim.js is NOT in plugins/kaola-workflow/scripts/. Codex contract validator only asserts repairScript and simulateScript. sink-merge.js is Claude Code-only — no Codex twin required.

## Dependencies

- External: child_process.execFileSync (Node built-in), gh CLI binary, git binary
- Internal: all scripts standalone (no cross-require)
- Test runner: npm test → node scripts/simulate-workflow-walkthrough.js + node scripts/validate-workflow-contracts.js
