# Review Fix 1 — Heartbeat --session flag in all 6 phase commands

## Finding addressed
CRITICAL [C1]: all 6 phase snippets passed positional arg; cmdHeartbeat requires --session flag.

## Fix applied
Added `--session` before `"$KAOLA_SESSION_ID"` in the Session Heartbeat bash block of all 6 phase files.

## Validation
`grep -l 'heartbeat --session' commands/kaola-workflow-phase*.md | wc -l` → 6
npm test → PASS
