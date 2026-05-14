# Phase 3 - Plan: multi-session-substrate

## Blueprint

### Files to Create

| File | Purpose | Key Interfaces |
|------|---------|----------------|
| `scripts/kaola-workflow-claim.js` | Subcommands: claim / release / heartbeat / sweep / status | `main()` dispatch; `try { main() } catch`; exits 0/1/2 per subcommand |
| `hooks/kaola-workflow-pre-commit.sh` | Blocks cross-session AI-initiated git commits via Claude Code PreToolUse | Reads stdin JSON; exits 2 to block, 0 to allow |

### Files to Modify

| File | Changes | Why |
|------|---------|-----|
| `.gitignore` | Add `kaola-workflow/.locks/` and `kaola-workflow/.sessions/` | Lock/session files must not be committed |
| `hooks/hooks.json` | Add PreToolUse entry for Bash/git-commit guard | Wires pre-commit.sh to Claude Code hook system |
| `scripts/validate-workflow-contracts.js` | Assert new files exist, .gitignore entries, hooks.json PreToolUse, install.sh copies | Acceptance #7 contract checking |
| `scripts/simulate-workflow-walkthrough.js` | Add Epic Case 1 (claim→heartbeat→status→second-claim-blocked→sweep→release) | Proves the full lease lifecycle works |
| `commands/workflow-next.md` | Add Startup Step 0 (sweep+claim before routing); add co-active leases block | Session must be claimed before phase routing |
| `commands/workflow-init.md` | Add session init + `claim.js claim` invocation | Session registration on workflow start |
| `commands/kaola-workflow-phase{1..6}.md` | Add Session Heartbeat snippet (identical, 6 files) | Phase-boundary heartbeat per acceptance #4 |
| `install.sh` | Extend scripts loop to include `claim.js`; add hooks copy block and `SUPPORT_HOOKS_DIR` var | Ensures manual-install users get claim.js and pre-commit.sh |

### Build Sequence

1. `.gitignore` — no dependencies
2. `scripts/kaola-workflow-claim.js` + `hooks/kaola-workflow-pre-commit.sh` — parallel, depends on step 1 only
3. `hooks/hooks.json` — depends on step 2 (hook script must exist)
4. `install.sh` — depends on step 2 (scripts/hooks must exist to copy)
5. `commands/workflow-next.md` + `commands/workflow-init.md` + `commands/kaola-workflow-phase{1..6}.md` — parallel group, depends on step 1
6. `scripts/validate-workflow-contracts.js` + `scripts/simulate-workflow-walkthrough.js` — depends on steps 1–5

### Parallelization Plan

| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | claim.js, pre-commit.sh | Disjoint creates, no shared write |
| B | workflow-next.md, workflow-init.md, phase{1..6}.md | Disjoint file edits |
| C | validate-workflow-contracts.js, simulate-workflow-walkthrough.js | Disjoint files, both read-only deps |
| Serial | .gitignore → Group A → hooks.json, install.sh → Group B, Group C | Dependency order |

### External Dependencies

Node.js stdlib only: `fs`, `path`, `os`, `crypto`, `child_process` (execFileSync). No npm packages.

---

## Task List

### Task 1: .gitignore
- File: `.gitignore`
- Test File: `scripts/validate-workflow-contracts.js`
- Write Set: `.gitignore`
- Depends On: none
- Parallel Group: serial (first)
- Action: MODIFY
- Implement: Append two lines — `kaola-workflow/.locks/` and `kaola-workflow/.sessions/` — to the existing .gitignore
- Mirror: Existing .gitignore patterns
- Validate: `grep 'kaola-workflow/\.locks/' .gitignore && grep 'kaola-workflow/\.sessions/' .gitignore`

### Task 2: scripts/kaola-workflow-claim.js
- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/kaola-workflow-claim.js`
- Depends On: Task 1
- Parallel Group: A
- Action: CREATE
- Implement:
  - Top-level structure: `#!/usr/bin/env node`, stdlib requires, `try { main() } catch (err) { process.stderr.write(err.message + '\n'); process.exitCode = 1; }`
  - `main()` dispatches on `process.argv[2]`: claim | release | heartbeat | sweep | status
  - Helper: `function assert(cond, msg) { if (!cond) throw new Error(msg); }`
  - Helper: `function field(content, name) { ... }` (parse field from markdown content)
  - Helper: `function sleepMs(ms) { const end = Date.now() + ms; while (Date.now() < end) {} }`
  - **claim subcommand**: Take `--session <id>` and `--project <name>` and `--issue <n>` args. O_EXCL atomic write (`fs.openSync(lockPath, 'wx')`), `fs.fsyncSync`, `fs.closeSync`. Lock file at `kaola-workflow/.locks/{project}.lock`. Session file at `kaola-workflow/.sessions/{session_id}.json`. GitHub-side: `gh issue edit --add-label "in-progress"`, set assignee, post sentinel comment (store `claim_comment_id`). All gh calls skipped when `KAOLA_WORKFLOW_OFFLINE=1`. Exit 0 success, 2 EEXIST (retried 3×50ms), 1 other errors.
  - **release subcommand**: Take `--session <id>`. Find lock file for session. `gh issue edit --remove-label`, `fs.unlinkSync`. Session file unlinked. If not found: stderr info, exit 0.
  - **heartbeat subcommand**: Take `--session <id>`. Read lock, update `last_heartbeat` and `expires` (+30min), rewrite. Exit 0 success, 1 no lock.
  - **sweep subcommand**: Read all `.locks/*.lock`. For each: `shouldSweep(lock)` = `new Date(lock.expires).getTime() < cutoff && new Date(lock.last_heartbeat).getTime() < cutoff` where `cutoff = Date.now() - 24*60*60*1000`. On match: `gh issue edit --remove-label`, `fs.unlinkSync`. Exit 0 always.
  - **status subcommand**: `--session <id>` optional. If provided, filter to matching session. For each lock: read session file, optionally query gh for remote state (skipped offline). Output JSON array to stdout. `consistent: true` when all fields agree; `drift: [...]` lists mismatches.
  - **workflow-state.md Sink/Lease**: Written/updated by claim and heartbeat. Sink block: `## Sink\nbranch: TBD\nissue_number: {n}\nclaimed_at: {ISO}`. Lease block: `## Lease\nsession_id: {uuid}\nexpires: {ISO}\nlast_heartbeat: {ISO}\nclaim_comment_id: {id or N/A}`
  - **~/.config/kaola-workflow/machine-id**: Read on startup; generate and write once if missing.
- Mirror: `scripts/kaola-workflow-repair-state.js` — top-level structure, process.stdout.write (not console.log), assert helper, execFileSync for gh calls
- Validate: `KAOLA_WORKFLOW_OFFLINE=1 node scripts/kaola-workflow-claim.js status --json`

### Task 3: hooks/kaola-workflow-pre-commit.sh
- File: `hooks/kaola-workflow-pre-commit.sh`
- Test File: (tested via simulate-workflow-walkthrough.js and manual Claude Code hook invocation)
- Write Set: `hooks/kaola-workflow-pre-commit.sh`
- Depends On: Task 1
- Parallel Group: A
- Action: CREATE
- Implement:
  - `#!/usr/bin/env bash` + `set -uo pipefail` (NOT `set -e` — grep exits 1 on no-match)
  - `GIT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0`
  - Read stdin into `HOOK_INPUT`; export it; parse `tool_input.command` via node one-liner into `BASH_COMMAND`
  - Fast path: `case "$BASH_COMMAND" in *"git commit"*) ;; *) exit 0 ;; esac`
  - `[ -z "${KAOLA_SESSION_ID:-}" ] && exit 0`
  - `STAGED=$(git -C "$GIT_ROOT" diff --cached --name-only)` → filter to `kaola-workflow/` paths, excluding `.locks/`, `.sessions/`, `archive/`, `ROADMAP.md`
  - Extract distinct project names from second path component via awk
  - Multi-project guard: if count > 1, exit 2 with split-your-commit message to stderr
  - Per-project owner: read `.locks/{project}.lock` session_id via node (or fall back to `workflow-state.md` Lease.session_id via grep)
  - Compare owner to `$KAOLA_SESSION_ID`; exit 2 if mismatch, exit 0 if match or no owner
  - Block exit code: 2 (not 1)
- Mirror: see architect-revision-1.md Section 1 for complete assembled script
- Validate: `bash -n hooks/kaola-workflow-pre-commit.sh`

### Task 4: hooks/hooks.json
- File: `hooks/hooks.json`
- Test File: `scripts/validate-workflow-contracts.js`
- Write Set: `hooks/hooks.json`
- Depends On: Task 3
- Parallel Group: serial (after Group A)
- Action: MODIFY
- Implement: Add PreToolUse array entry alongside the existing SessionStart entry:
  ```json
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [{ "type": "command", "command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/kaola-workflow-pre-commit.sh\"", "timeout": 5 }],
      "description": "Block cross-session AI-initiated git commits on kaola-workflow projects",
      "id": "kaola-workflow:pre-commit-guard"
    }
  ]
  ```
- Mirror: Existing hooks.json SessionStart entry shape
- Validate: `node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json', 'utf8'))"`

### Task 5: install.sh
- File: `install.sh`
- Test File: `scripts/validate-workflow-contracts.js`
- Write Set: `install.sh`
- Depends On: Tasks 2, 3
- Parallel Group: serial (after Group A)
- Action: MODIFY
- Implement:
  1. Near existing `SOURCE_SCRIPTS_DIR` line (~line 7), add: `SUPPORT_HOOKS_DIR="$SUPPORT_DIR/hooks"` and `SOURCE_HOOKS_DIR="$SCRIPT_DIR/hooks"`
  2. Extend the scripts copy loop (lines ~111-117) to include `kaola-workflow-claim.js` alongside `kaola-workflow-repair-state.js`
  3. After scripts loop, add hooks copy block: `mkdir -p "$SUPPORT_HOOKS_DIR"` + loop over `kaola-workflow-pre-commit.sh` with `cp + chmod +x + echo`
- Mirror: Existing repair-state.js copy loop at lines 111-117
- Validate: `bash -n install.sh`

### Task 6: commands/workflow-next.md
- File: `commands/workflow-next.md`
- Test File: `scripts/validate-workflow-contracts.js`
- Write Set: `commands/workflow-next.md`
- Depends On: Task 1
- Parallel Group: B
- Action: MODIFY
- Implement:
  - Add "## Startup Step 0 - Sweep And Claim" before existing "## Startup Step 1":
    ```markdown
    ## Startup Step 0 - Sweep And Claim

    Run sweep to remove abandoned locks, then claim the session before routing:

    ```bash
    node "${CLAUDE_PLUGIN_ROOT:-./}/scripts/kaola-workflow-claim.js" sweep
    node "${CLAUDE_PLUGIN_ROOT:-./}/scripts/kaola-workflow-claim.js" claim \
      --session "$KAOLA_SESSION_ID" --project "{project}" --issue {N}
    ```
    ```
  - Add "## Co-active Leases" section describing how multiple sessions coexist (distinct project locks)
  - Keep total line count ≤ 220 (validate-workflow-contracts.js line 152 enforces this)
- Mirror: Existing workflow-next.md Startup Step 1 style
- Validate: `wc -l commands/workflow-next.md` (must be ≤ 220)

### Task 7: commands/workflow-init.md
- File: `commands/workflow-init.md`
- Test File: `scripts/validate-workflow-contracts.js`
- Write Set: `commands/workflow-init.md`
- Depends On: Task 1
- Parallel Group: B
- Action: MODIFY
- Implement: Add session initialization block:
  ```markdown
  ## Session Initialization

  Generate a session ID and claim the issue before starting:

  ```bash
  export KAOLA_SESSION_ID="$(node -e "process.stdout.write(require('crypto').randomUUID())")"
  node "${CLAUDE_PLUGIN_ROOT:-./}/scripts/kaola-workflow-claim.js" claim \
    --session "$KAOLA_SESSION_ID" --project "{project}" --issue {N}
  ```
  ```
- Mirror: Existing workflow-init.md command block style
- Validate: (manual review)

### Task 8: commands/kaola-workflow-phase{1..6}.md
- File: `commands/kaola-workflow-phase1.md` through `commands/kaola-workflow-phase6.md`
- Test File: `scripts/validate-workflow-contracts.js`
- Write Set: all 6 phase command files
- Depends On: Task 1
- Parallel Group: B
- Action: MODIFY (identical change to all 6 files)
- Implement: Add "## Session Heartbeat" section at the top of each phase's startup block:
  ```markdown
  ## Session Heartbeat

  If a claim session is active, update the heartbeat before proceeding:

  ```bash
  [ -n "${KAOLA_SESSION_ID:-}" ] && \
    node "${CLAUDE_PLUGIN_ROOT:-./}/scripts/kaola-workflow-claim.js" heartbeat "$KAOLA_SESSION_ID"
  ```
  ```
- Mirror: Identical snippet in all 6 files
- Validate: `grep -l 'Session Heartbeat' commands/kaola-workflow-phase*.md | wc -l` (must be 6)

### Task 9: scripts/validate-workflow-contracts.js
- File: `scripts/validate-workflow-contracts.js`
- Test File: itself
- Write Set: `scripts/validate-workflow-contracts.js`
- Depends On: Tasks 1–8
- Parallel Group: C
- Action: MODIFY
- Implement: Add assertions for:
  - `scripts/kaola-workflow-claim.js` exists
  - `hooks/kaola-workflow-pre-commit.sh` exists
  - `.gitignore` contains `kaola-workflow/.locks/`
  - `.gitignore` contains `kaola-workflow/.sessions/`
  - `hooks/hooks.json` contains `PreToolUse` key
  - `install.sh` contains `kaola-workflow-claim.js`
  - `install.sh` contains `kaola-workflow-pre-commit.sh`
  - `commands/workflow-next.md` contains `Startup Step 0`
  - All 6 phase files contain `Session Heartbeat`
- Mirror: Existing `validate-workflow-contracts.js` assertion pattern (assert(condition, message))
- Validate: `node scripts/validate-workflow-contracts.js`

### Task 10: scripts/simulate-workflow-walkthrough.js
- File: `scripts/simulate-workflow-walkthrough.js`
- Test File: itself
- Write Set: `scripts/simulate-workflow-walkthrough.js`
- Depends On: Tasks 1–5
- Parallel Group: C
- Action: MODIFY
- Implement: Add Epic Case 1 after existing walkthrough cases:
  ```
  Epic Case 1: claim → verify lock file → heartbeat → status --json (consistent:true, drift:[]) →
               second claim same project (exit 2, EEXIST) → sweep (lock survives — not 24h old) →
               release (lock removed) → status --json (empty array)
  ```
  - Sandbox: `fs.mkdtempSync` per test + `try/finally fs.rmSync`
  - All `execFileSync` calls pass `env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' }`
  - Verify lock file JSON after claim (session_id matches, expires > claimed_at)
  - Verify status --json `consistent: true` and `drift: []`
  - Verify second claim exits with code 2
  - Verify sweep does NOT remove the lock (it's < 24h old)
  - Verify release removes the lock file
- Mirror: Existing simulate-workflow-walkthrough.js case structure + execFileSync pattern
- Validate: `node scripts/simulate-workflow-walkthrough.js`

---

## Advisor Notes

Advisor review (`.cache/advisor-plan.md`) found 4 blockers resolved by architect-revision-1:

1. **pre-commit.sh algorithm**: Corrected from "block on any foreign lock" to project-scoped algorithm. Now reads stdin JSON (PreToolUse delivers `tool_input.command`), filters staged files to `kaola-workflow/{project}/` paths only, extracts distinct project names, blocks multi-project commits, and checks per-project owner only. Exit 2 (not exit 1) signals block to Claude Code.

2. **Sweep threshold**: Corrected from 30-min LOCK_TTL_MS to 24h grace window on both `expires` AND `last_heartbeat`. A lock heartbeat-refreshed within 24h survives sweep regardless of 30-min TTL expiry.

3. **PreToolUse contract**: stdin JSON schema confirmed: `{ session_id, tool_name: "Bash", tool_input: { command, description } }`. Node used for parsing (always available). Exit 2 = block, 0 = allow, 1 = error (do not use for blocking).

4. **install.sh gap**: Decided option (a) — extend install.sh. `kaola-workflow-claim.js` and `kaola-workflow-pre-commit.sh` are now copied to `~/.claude/kaola-workflow/scripts/` and `~/.claude/kaola-workflow/hooks/` respectively. install.sh moves from "no changes" to "Files to Modify."

Smaller items resolved:
- `status --json` without session-id: returns array of all active sessions
- `release` with unknown session-id: graceful skip, exit 0
- `sleepMs` busy-wait: acceptable at ≤150ms

---

## Validation Commands

```bash
bash -n hooks/kaola-workflow-pre-commit.sh
node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json', 'utf8'))"
bash -n install.sh
KAOLA_WORKFLOW_OFFLINE=1 node scripts/kaola-workflow-claim.js status --json
node scripts/validate-workflow-contracts.js
node scripts/simulate-workflow-walkthrough.js
npm test
claude plugin validate .
```

---

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect-revision-1 | invoked | .cache/architect-revision-1.md | 4 blockers resolved |
