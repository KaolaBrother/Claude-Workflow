Local security-sensitive review for roadmap-open-issues.

Risk scan:
- Files changed execute git and gh commands, edit local files, and update GitHub issue/PR metadata through gh.
- No secrets or auth tokens are introduced or logged.
- New command invocations use execFileSync argument arrays rather than shell string interpolation.
- Project and session inputs continue through existing safe-name validation before file paths are built.
- sink-merge rejects unsafe branch names and now requires a clean worktree before checkout.
- clearClaimComment only edits the session's own stored claim_comment_id and does not remove labels or assignees during yield cleanup.

Findings:
- CRITICAL: none
- HIGH: none
- MEDIUM/LOW: none blocking

Status: PASSED
