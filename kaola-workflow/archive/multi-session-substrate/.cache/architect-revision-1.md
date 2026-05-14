# Code Architect Revision 1 — multi-session-substrate Phase 3

## Design Decisions

- Decision 1 (Blocker 1): Pre-commit hook algorithm redesigned from "block if any lock is foreign" to "block if the staged project's owner differs from current session." Two-session coexistence is now correctly supported.
- Decision 2 (Blocker 2): Sweep threshold changed from 30-minute TTL to a 24-hour cutoff applied to both `expires` and `last_heartbeat`. Locks alive within the last 24h survive sweep regardless of TTL expiry.
- Decision 3 (Blocker 3): PreToolUse contract fully specified — stdin JSON schema confirmed, `node` preferred for parsing (always available), exit code 2 signals block, exit code 0 allows, fast-path on non-commit commands.
- Decision 4 (Blocker 4): `install.sh` moves from "no changes" to "Files to Modify." Both `kaola-workflow-claim.js` and `kaola-workflow-pre-commit.sh` are copied to `~/.claude/kaola-workflow/` paths, following the existing `kaola-workflow-repair-state.js` pattern.

---

## Section 1 — Corrected pre-commit.sh Spec

### File metadata

```
hooks/kaola-workflow-pre-commit.sh
Executable: yes (chmod +x)
Shebang: #!/usr/bin/env bash
Shell options: set -uo pipefail  (NOT set -e — grep returns 1 on no-match, which must not kill the script)
```

### Complete assembled script

```bash
#!/usr/bin/env bash
set -uo pipefail

GIT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0

export HOOK_INPUT
HOOK_INPUT="$(cat)"

BASH_COMMAND="$(node -e "
  try {
    const d = JSON.parse(process.env.HOOK_INPUT);
    process.stdout.write(d.tool_input && d.tool_input.command ? d.tool_input.command : '');
  } catch(e) { process.stdout.write(''); }
" 2>/dev/null)" || true

case "$BASH_COMMAND" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

[ -z "${KAOLA_SESSION_ID:-}" ] && exit 0

STAGED="$(git -C "$GIT_ROOT" diff --cached --name-only 2>/dev/null)" || exit 0
[ -z "$STAGED" ] && exit 0

KW_PATHS="$(printf '%s\n' "$STAGED" \
  | grep '^kaola-workflow/' \
  | grep -v '^kaola-workflow/\.locks/' \
  | grep -v '^kaola-workflow/\.sessions/' \
  | grep -v '^kaola-workflow/archive/' \
  | grep -v '^kaola-workflow/ROADMAP\.md$')" || true

[ -z "$KW_PATHS" ] && exit 0

PROJECTS="$(printf '%s\n' "$KW_PATHS" \
  | awk -F'/' 'NF >= 3 { print $2 }' \
  | sort -u)" || true

PROJECT_COUNT="$(printf '%s\n' "$PROJECTS" | grep -c '.')" || PROJECT_COUNT=0

if [ "$PROJECT_COUNT" -gt 1 ]; then
  printf 'BLOCKED: split your commit — multiple kaola-workflow projects staged: %s\n' \
    "$(printf '%s\n' "$PROJECTS" | tr '\n' ' ')" >&2
  exit 2
fi

[ "$PROJECT_COUNT" -eq 0 ] && exit 0
PROJECT="$(printf '%s\n' "$PROJECTS" | head -1)"

LOCK_FILE="$GIT_ROOT/kaola-workflow/.locks/${PROJECT}.lock"
OWNER=""

if [ -f "$LOCK_FILE" ]; then
  OWNER="$(node -e "
    try {
      const d = JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));
      process.stdout.write(d.session_id || '');
    } catch(e) { process.stdout.write(''); }
  " "$LOCK_FILE" 2>/dev/null)" || true
fi

if [ -z "$OWNER" ]; then
  STATE_FILE="$GIT_ROOT/kaola-workflow/${PROJECT}/workflow-state.md"
  if [ -f "$STATE_FILE" ]; then
    OWNER="$(grep -m1 '^session_id:' "$STATE_FILE" | sed 's/^session_id:[[:space:]]*//')" || true
  fi
fi

[ -z "$OWNER" ] && exit 0

if [ "$OWNER" != "$KAOLA_SESSION_ID" ]; then
  printf 'BLOCKED: cross-session commit on project "%s". Lock held by %s; current session is %s.\n' \
    "$PROJECT" "$OWNER" "$KAOLA_SESSION_ID" >&2
  exit 2
fi

exit 0
```

---

## Section 2 — Corrected Sweep Spec

```js
function shouldSweep(lock) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;  // 24h ago in epoch ms
  const expiredAt = new Date(lock.expires).getTime();
  const heartbeatAt = new Date(lock.last_heartbeat).getTime();
  return expiredAt < cutoff && heartbeatAt < cutoff;
}
```

Lock field semantics:
- `lock.expires` — initially `claimed_at + 30min`, updated to `last_heartbeat + 30min` on each heartbeat call
- `lock.last_heartbeat` — timestamp of the last successful heartbeat write

Sweep actions per expired lock:
1. `gh issue edit --remove-label "in-progress" {issue_number}` (skipped when `KAOLA_WORKFLOW_OFFLINE=1`)
2. `fs.unlinkSync(lockFile)`

No comment is posted. No other side effects.

---

## Section 3 — Confirmed PreToolUse Contract

### stdin JSON schema for Bash PreToolUse hooks

```json
{
  "session_id": "<claude-code-session-id>",
  "tool_name": "Bash",
  "tool_input": {
    "command": "<the full bash command string>",
    "description": "<optional human-readable description>"
  }
}
```

### Reading approach

Use `node` (not `jq`). Pass stdin content via environment variable `HOOK_INPUT` to avoid reading stdin twice:

```bash
export HOOK_INPUT
HOOK_INPUT="$(cat)"
BASH_COMMAND="$(node -e "
  try {
    const d = JSON.parse(process.env.HOOK_INPUT);
    process.stdout.write(d.tool_input && d.tool_input.command ? d.tool_input.command : '');
  } catch(e) { process.stdout.write(''); }
" 2>/dev/null)" || true
```

### Exit code contract

| Exit code | Meaning |
|-----------|---------|
| 0 | Allow — tool call proceeds |
| 2 | Block — Claude Code aborts the tool call; stderr text shown as reason |
| 1 | Hook error — do NOT use to signal block |

### Fast path

```bash
case "$BASH_COMMAND" in
  *"git commit"*) ;;   # fall through
  *) exit 0 ;;
esac
```

---

## Section 4 — install.sh Changes

### Lines 7-9 — Add SUPPORT_HOOKS_DIR and SOURCE_HOOKS_DIR variables

After `SOURCE_SCRIPTS_DIR="$SCRIPT_DIR/scripts"`, add:
```bash
SUPPORT_HOOKS_DIR="$SUPPORT_DIR/hooks"
SOURCE_HOOKS_DIR="$SCRIPT_DIR/hooks"
```

### Lines 111-117 — Extend scripts loop to include kaola-workflow-claim.js

Replace:
```bash
for script_file in "$SOURCE_SCRIPTS_DIR"/kaola-workflow-repair-state.js; do
```
With:
```bash
for script_file in \
  "$SOURCE_SCRIPTS_DIR"/kaola-workflow-repair-state.js \
  "$SOURCE_SCRIPTS_DIR"/kaola-workflow-claim.js; do
```

### After scripts loop — Add hooks copy block

```bash
mkdir -p "$SUPPORT_HOOKS_DIR"
for hook_file in "$SOURCE_HOOKS_DIR"/kaola-workflow-pre-commit.sh; do
  if [[ -f "$hook_file" ]]; then
    cp "$hook_file" "$SUPPORT_HOOKS_DIR/$(basename "$hook_file")"
    chmod +x "$SUPPORT_HOOKS_DIR/$(basename "$hook_file")"
    echo "Installed support hook: $SUPPORT_HOOKS_DIR/$(basename "$hook_file")"
  fi
done
```

### Result

After install:
```
~/.claude/kaola-workflow/
  scripts/
    kaola-workflow-repair-state.js
    kaola-workflow-claim.js
  hooks/
    kaola-workflow-pre-commit.sh
```

---

## Section 5 — Updated Files Tables

### Files to Create

| File | Purpose |
|------|---------|
| `scripts/kaola-workflow-claim.js` | claim/release/heartbeat/sweep/status subcommands |
| `hooks/kaola-workflow-pre-commit.sh` | blocks cross-session commits via Claude Code PreToolUse |

### Files to Modify

| File | Changes |
|------|---------|
| `.gitignore` | add `kaola-workflow/.locks/` and `kaola-workflow/.sessions/` |
| `hooks/hooks.json` | add PreToolUse entry for Bash/git-commit guard |
| `scripts/validate-workflow-contracts.js` | assert new files, .gitignore entries, hooks.json PreToolUse, install.sh copies |
| `scripts/simulate-workflow-walkthrough.js` | add Epic Case 1 |
| `commands/workflow-next.md` | add Startup Step 0 (sweep+claim); add co-active leases block |
| `commands/workflow-init.md` | add session init + claim.js invocation |
| `commands/kaola-workflow-phase{1..6}.md` | add Session Heartbeat snippet |
| `install.sh` | extend scripts loop + add hooks copy block |

### hooks.json corrected PreToolUse entry

```json
"PreToolUse": [
  {
    "matcher": "Bash",
    "hooks": [
      {
        "type": "command",
        "command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/kaola-workflow-pre-commit.sh\"",
        "timeout": 5
      }
    ],
    "description": "Block cross-session AI-initiated git commits on kaola-workflow projects",
    "id": "kaola-workflow:pre-commit-guard"
  }
]
```

---

## Section 6 — Build Sequence

1. `.gitignore` — no deps
2. `scripts/kaola-workflow-claim.js` + `hooks/kaola-workflow-pre-commit.sh` — parallel, after step 1
3. `hooks/hooks.json` — after step 2 (needs hook script to exist)
4. `install.sh` — after step 2 (needs both new files to exist)
5. `commands/workflow-next.md` + `commands/workflow-init.md` + `commands/kaola-workflow-phase{1..6}.md` — parallel group, after step 1
6. `scripts/validate-workflow-contracts.js` + `scripts/simulate-workflow-walkthrough.js` — after steps 1–5

---

## Section 7 — Smaller Items Resolved

### status --json without session-id

Returns array of all active lock records. Empty array when no locks exist.

```json
[
  {
    "session": { "session_id": "...", "machine_id": "...", "hostname": "...", "pid": 0, "started": "..." },
    "lock": { "project": "...", "session_id": "...", "claimed_at": "...", "expires": "...", "last_heartbeat": "...", "issue_number": 0 },
    "remote": { "assignee": "...", "has_label": true, "sentinel_comment_id": "..." },
    "consistent": true,
    "drift": []
  }
]
```

With `--session <id>`: filtered to matching session (zero or one element).

### release with unknown session-id

- Write `release: no lock found for session <id>` to stderr
- Exit 0 (not an error)

### sleepMs busy-wait

```js
function sleepMs(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
}
```

3 attempts × 50ms = 150ms max. Acceptable.

---

## Section 8 — Preserved Decisions (Unchanged)

**Lock file schema** (`.locks/{project}.lock`):
```json
{ "project": "...", "session_id": "uuid-v4", "claimed_at": "ISO-8601",
  "expires": "ISO-8601", "last_heartbeat": "ISO-8601", "issue_number": null }
```

**Session file schema** (`.sessions/{session_id}.json`):
```json
{ "session_id": "uuid-v4", "machine_id": "...", "hostname": "...", "pid": 0, "started": "ISO-8601" }
```

**Session-id**: `crypto.randomUUID()`

**Lock write safety**: `fs.fsyncSync(fd)` before `fs.closeSync(fd)`

**EEXIST retry**: 3 attempts, 50ms apart

**Sweep actions**: `--remove-label` + `fs.unlinkSync` only, no comment

**workflow-state.md Sink block**:
```markdown
## Sink
branch: TBD
issue_number: {integer or unset}
claimed_at: {ISO-8601}
```

**workflow-state.md Lease block**:
```markdown
## Lease
session_id: {UUID}
expires: {ISO-8601}
last_heartbeat: {ISO-8601}
claim_comment_id: {GitHub comment id or N/A}
```

**KAOLA_WORKFLOW_OFFLINE=1**: All gh calls skipped

**Heartbeat frequency**: Phase-boundary only

**Codex validator**: No changes in issue #3 (deferred to #8)

**sleepMs**: Busy-wait loop, acceptable for ≤150ms

**Exit codes**:
- claim: 0=success, 1=internal error, 2=lock already held (EEXIST)
- release: 0=success, 1=error
- heartbeat: 0=success, 1=no lock found/error
- sweep: 0=always (idempotent)
- status: 0=always

**Epic Case 1 test structure**:
claim → verify lock file → heartbeat → status --json (consistent:true) → second claim (exit 2) → sweep (lock survives, not 24h old) → release (lock removed)
All with `KAOLA_WORKFLOW_OFFLINE: '1'` in execFileSync env.

**Out of scope**: branch cutting, cross-machine race (#9), heartbeat ticker (#9), Codex parity (#8), npm packages, manual shell commit blocking
