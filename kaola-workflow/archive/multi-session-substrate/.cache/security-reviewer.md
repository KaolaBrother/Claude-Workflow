# Security Review — multi-session-substrate Phase 4

## Verdict: 2 HIGH, 2 MEDIUM, 2 LOW

### HIGH

**[S-H1] Path traversal via unsanitized --project arg**
File: scripts/kaola-workflow-claim.js, parseArgs lines 42-51; lockPath/stateFile construction lines 55-56
args.project fed directly into path.join → lock file at arbitrary FS location via "../../" traversal.
fs.openSync 'wx' would create arbitrary file. updateSinkLease does fs.writeFileSync without guard.
repair-state.js already has isSafeName() — claim.js does not use it.
Fix: assert(isSafeName(args.project), '--project must be a simple name with no path separators')

**[S-H2] Poisoned lock file project field propagates traversal in release/heartbeat**
File: scripts/kaola-workflow-claim.js, cmdRelease lines 220, 245-246; cmdHeartbeat
match.project read from lock JSON and fed directly into lockPath() → fs.unlinkSync/fs.writeFileSync.
If a traversal-crafted lock was written via S-H1, release/heartbeat amplifies it to arbitrary delete/overwrite.
Fix: Re-validate match.project (and match.session_id) with isSafeName after reading lock file JSON.

### MEDIUM

**[S-M1] --session arg unsanitized before use as session filename**
File: scripts/kaola-workflow-claim.js, line 56 (sessionPath)
args.session used directly as filename. Apply isSafeName to args.session at parse time.

**[S-M2] --issue coerces to NaN without positive integer validation**
File: scripts/kaola-workflow-claim.js, line 48
Number('abc') → NaN. NaN != null is true. "NaN" reaches gh CLI as issue number.
Fix: parseInt(argv[++i], 10) + assert(Number.isInteger(args.issue) && args.issue > 0)

### LOW

**[S-L1] Lock/session files world-readable (mode 0644)**
Fix: fs.openSync(lp, 'wx', 0o600) and fs.writeFileSync with { mode: 0o600 }

**[S-L2] claim_comment_id unescaped in workflow-state.md**
GitHub URL written to structured markdown. Low exploitability (GitHub controls the value).

### Confirmed Safe
- pre-commit.sh: stdin → HOOK_INPUT env var → node -e. No shell injection path.
- Shell variable quoting in pre-commit.sh: all variables properly double-quoted.
- execFileSync array form in claim.js: no shell interpolation.
- O_EXCL lock creation: atomic and correct.
- No hardcoded secrets.
- install.sh path construction: properly quoted.
