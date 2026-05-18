# Security Review: cross-machine-followups

## Verdict: PASS — No CRITICAL or HIGH issues found

## Findings

### L1 — g flag in updateLeaseInPlace (LOW)
The `gm` replacements now rewrite every `expires:` and `last_heartbeat:` line in the file, not just the first. The `## Lease` guard confirms the section exists but doesn't scope the replacement. No current attack vector (no user-controlled content reaches this code path), but the fix introduces unscoped global replacement. Acceptable; flag for future tightening if content structure expands.

### L2 — `--` separator on git push (INFO/improvement)
Correct hardening. Branch name already validated as integer-derived workflow name. No concerns.

### MEDIUM-4 — error to stderr (INFO)
Git error messages may contain remote URLs. If user has embedded credentials in remote URL (pre-existing misconfiguration), they would appear in stderr. Not a new regression introduced here. Acceptable.

### LOW-2 — SIGINT/SIGHUP handlers (INFO)
`pidPath` closure-captured; passed `isSafeName` validation at line 511. No signal-time injection opportunity. Test correctly targets spawned child PIDs, not test process. Clean.

### I1 — Number.isFinite (INFO/improvement)
Strictly correct. No concerns.

### Shim kill -0 pattern (INFO)
`$_TICKER_PID_FILE` derives from `git rev-parse --show-toplevel` + `KAOLA_SESSION_ID` (no user input). PID file content is integer; if tampered to non-numeric, `kill -0` fails and else-branch respawns ticker (benign). No injection risk.

### Pre-existing (out of scope)
`isSafeName` at line 12 does not reject `\n` or `\r`. A project name with a newline could inject into `workflow-state.md`. Pre-existing; not introduced by this PR.
