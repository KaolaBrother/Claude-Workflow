# Security Review Notes - issue-22

## Risk Scan

Security-relevant files changed:

- `hooks/hooks.json`
- `scripts/kaola-workflow-session-env.js`
- `scripts/kaola-workflow-claim.js`

## Findings

none

## Notes

- The Claude hook helper reads JSON from stdin and writes only `KAOLA_SESSION_ID` to `CLAUDE_ENV_FILE`.
- Session ids are rejected if they contain path separators, NUL, `.`, or `..`.
- Shell export values are single-quoted with embedded single quotes escaped.
- `handoff` requires explicit `--project` and `--session`, validates simple names, and does not execute user-controlled command strings.
- Existing GitHub calls use `execFileSync` argument arrays, not shell interpolation.
