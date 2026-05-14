# Code Architect Output — multi-session-substrate Phase 3

## Design Summary

Single-machine lease substrate. Monolithic `scripts/kaola-workflow-claim.js` (flat, mirrors repair-state.js). Pre-commit guard via Claude Code `hooks.json` PreToolUse. KAOLA_WORKFLOW_OFFLINE=1 for test isolation.

## Known Limitations Flagged

1. **install.sh does not ship new files** — only plugin install covers `scripts/` and `hooks/`; document as plugin-install-only constraint. Do NOT touch install.sh.
2. **PreToolUse hooks.json matcher shape not verified** — must check JSON schema at https://json.schemastore.org/claude-code-settings.json before implementing; wrong matcher = silent no-op.
3. **workflow-next.md has 220-line cap** (validate-workflow-contracts.js line 152); additions must keep total ≤ 220 lines.

## Files to Create

| File | Purpose |
|------|---------|
| `scripts/kaola-workflow-claim.js` | claim/release/heartbeat/sweep/status subcommands |
| `hooks/kaola-workflow-pre-commit.sh` | blocks cross-session commits via Claude Code PreToolUse |

## Files to Modify

| File | Changes |
|------|---------|
| `.gitignore` | add kaola-workflow/.locks/ and kaola-workflow/.sessions/ |
| `hooks/hooks.json` | add PreToolUse entry for Bash/git-commit guard |
| `scripts/validate-workflow-contracts.js` | add assertions for new files, .gitignore entries, Sink/Lease schema |
| `scripts/simulate-workflow-walkthrough.js` | add epic Case 1 (claim/heartbeat/release/sweep/status cycle) |
| `commands/workflow-next.md` | add Startup Step 0 (sweep+claim), Co-active Leases block |
| `commands/workflow-init.md` | add session init + claim.js invocation |
| `commands/kaola-workflow-phase{1..6}.md` | add Session Heartbeat snippet (identical insert, 6 files) |

## Data Flow

workflow-next startup → sweep → claim → write session + lock → append Sink/Lease to workflow-state.md
phase-N startup → heartbeat
workflow-next/phase6 done → release → unlink lock + remove gh label
PreToolUse (git commit) → pre-commit.sh → checks lock ownership via KAOLA_SESSION_ID env var

## claim.js Specification

### Imports
fs, path, os, crypto, child_process (execFileSync)

### Structure
```
try { main() } catch (err) { process.stderr.write(...); process.exitCode = 1; }
// assert(cond, msg), field(content, name), sleepMs(ms)
// dispatch: claim | release | heartbeat | sweep | status
```

### Session Schema (.sessions/{session_id}.json)
```json
{ "session_id": "uuid-v4", "machine_id": "os.hostname()", "runtime": "node",
  "pid": "process.pid", "worktree": "process.cwd()", "started_at": "ISO-8601",
  "last_heartbeat": "ISO-8601" }
```

### Lock Schema (.locks/issue-{N}.lock)
```json
{ "session_id": "uuid-v4", "machine_id": "os.hostname()", "runtime": "node",
  "branch": "string or 'unknown'", "project": "string",
  "claimed_at": "ISO-8601", "last_heartbeat": "ISO-8601",
  "expires": "ISO-8601 (claimed_at + 30min)", "claim_comment_id": "string|null" }
```

### Subcommand Exit Codes
- claim: 0=success, 1=internal error, 2=lock already held (EEXIST)
- release: 0=success, 1=error
- heartbeat: 0=success, 1=no lock found/error
- sweep: 0=always (idempotent)
- status: 0=always (drift surfaces inside JSON only)

### O_EXCL + fsync
```js
fd = fs.openSync(lockPath, 'wx')  // throws EEXIST if locked
fs.writeSync(fd, JSON.stringify(lock, null, 2))
fs.fsyncSync(fd)
fs.closeSync(fd)
```

### EEXIST Retry
```js
function sleepMs(ms) { const end = Date.now() + ms; while (Date.now() < end) {} }
// 3 attempts, sleepMs(50) between each
```

### Sweep Scope
Remove expired locks (expires < now): gh issue edit N --remove-label + fs.unlinkSync. No comment.

### status --json Shape
```json
{ "session": {...|null}, "lock": {...|null}, "remote": { "assignee": "?", "has_label": "bool|null",
  "sentinel_comment_id": "?|null" }, "consistent": true, "drift": [] }
```

## pre-commit.sh Specification

```bash
#!/usr/bin/env bash
LOCKS_DIR="${KAOLA_WORKFLOW_ROOT:-$(pwd)}/kaola-workflow/.locks"
[ -d "$LOCKS_DIR" ] || exit 0
lock_files=("$LOCKS_DIR"/*.lock)
[ -e "${lock_files[0]}" ] || exit 0
[ -z "${KAOLA_SESSION_ID:-}" ] && exit 0  # not an AI-session commit
for lock_file in "$LOCKS_DIR"/*.lock; do
  lock_session=$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('$lock_file','utf8')).session_id)")
  if [ "$lock_session" != "$KAOLA_SESSION_ID" ]; then
    printf 'BLOCKED: cross-session commit. Lock held by %s; current is %s.\n' "$lock_session" "$KAOLA_SESSION_ID" >&2
    exit 1
  fi
done
exit 0
```

## hooks.json PreToolUse Entry

```json
"PreToolUse": [{
  "matcher": "Bash",
  "hooks": [{ "type": "command",
    "command": "bash \"$CLAUDE_PLUGIN_ROOT/hooks/kaola-workflow-pre-commit.sh\"",
    "timeout": 5 }],
  "description": "Block cross-session AI-initiated git commits",
  "id": "kaola-workflow:pre-commit-guard"
}]
```

⚠️ VERIFY: matcher shape must be confirmed against JSON schema before implementation.

## workflow-state.md New Blocks

```markdown
## Sink
issue: {N}
branch: TBD

## Lease
session_id: {uuid}
lock_file: kaola-workflow/.locks/issue-{N}.lock
claimed_at: {ISO-8601}
expires: {ISO-8601}
```

Placed after ## Last Updated. Do NOT reuse field names started:/expires: outside Lease block.

## workflow-next.md Additions

Add "## Startup Step 0 - Sweep And Claim" before Startup Step 1. Check total line count ≤ 220.
Add "## Co-active Leases" section.

## Phase Heartbeat Snippet (identical, add to phase1-6)

```markdown
## Session Heartbeat

If a claim session is active, update the heartbeat before proceeding:

```bash
[ -n "${KAOLA_SESSION_ID:-}" ] && \
  node "${CLAUDE_PLUGIN_ROOT:-./}/scripts/kaola-workflow-claim.js" heartbeat "$KAOLA_SESSION_ID"
```
```

## Build Sequence

1. .gitignore (no deps)
2. scripts/kaola-workflow-claim.js + hooks/kaola-workflow-pre-commit.sh (parallel, after step 1)
3. hooks/hooks.json (after step 2)
4. commands/* (parallel: workflow-next, workflow-init, phase1-6 heartbeats; after step 1)
5. scripts/validate-workflow-contracts.js + simulate-workflow-walkthrough.js (after steps 1-4)

## Parallelization Groups

Group A: claim.js + pre-commit.sh (disjoint creates, after .gitignore)
Group B: commands/workflow-next.md + commands/workflow-init.md + commands/phase{1..6}.md (all disjoint edits)
Sequential gates: hooks.json after Group A; validate/simulate after all

## Exact Validation Commands

```bash
bash -n hooks/kaola-workflow-pre-commit.sh
node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json', 'utf8'))"
KAOLA_WORKFLOW_OFFLINE=1 node scripts/kaola-workflow-claim.js status --json
node scripts/validate-workflow-contracts.js
node scripts/simulate-workflow-walkthrough.js
npm test
claude plugin validate .
```

## Epic Case 1 Test Structure

claim → verify lock file → heartbeat → status --json (consistent:true, drift:[]) → second claim (exit 2) → sweep (lock survives) → release (lock removed)
All execFileSync calls pass env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' }
Sandbox: fs.mkdtempSync + try/finally fs.rmSync

## Out of Scope

- validate-kaola-workflow-contracts.js (deferred #8)
- install.sh / uninstall.sh
- plugins/kaola-workflow/
- Branch cutting (Sink.branch = TBD)
- Heartbeat ticker (deferred #9)
- Cross-machine race (deferred #9)
