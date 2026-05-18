# Preserved Stale Evidence for #51

## issue-46 lock (deleted to unblock #51 claim)

Original location: `.git/kaola-workflow/.locks/issue-46.lock`
Backup preserved at: `/tmp/kaola-issue-46-stale-evidence.lock.json`

Contents:

```json
{
  "project": "issue-46",
  "session_id": "5d5060b2-7726-4632-81ad-9eab33d0da75",
  "machine_id": "269df7a8-f7f5-4f7c-aa1d-82aff10f0a4e",
  "claimed_at": "2026-05-17T23:29:16.005Z",
  "expires": "2026-05-17T23:59:16.005Z",
  "last_heartbeat": "2026-05-17T23:29:16.005Z",
  "issue_number": 46,
  "claim_comment_id": "4472848629",
  "sink": "merge",
  "pr_url": null,
  "pr_number": null,
  "runtime": "claude",
  "worktree_path": "/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-46",
  "branch": "workflow/issue-46",
  "owner_session_id": "unverified"
}
```

Observations at deletion time (2026-05-18T01:17Z):
- Lock expired 1h 18m before deletion.
- `node scripts/kaola-workflow-claim.js sweep` was a no-op (sweep's 24h dual cutoff did not fire).
- `status --json` reported `consistent: true, drift: ["issue closed"]` — GitHub issue #46 state was CLOSED.
- The watch-pr path emitted `watch-pr: gh pr view failed for workflow/issue-46` because the merge-sink branch was never opened as a PR (direct merge).
- The startup transaction for #51 refused with `verdict: user_target_red, reasoning: exact file path overlap at "commands/kaola-workflow-phase6.md" with a claimed project` — i.e. the closed-#46 lease was blocking work on every issue that touches the same file.

This is exactly the cleanup-and-classifier gap #51 documents.

## Active project dirs still flagged status=active (per audit body)

| Project dir | step | issue closed? |
|-------------|------|---------------|
| kaola-workflow/issue-32 | final-validation | yes (verify in Phase 4) |
| kaola-workflow/issue-46 | final-validation | yes (lock now removed; dir remains) |
| kaola-workflow/codex-parity | complete | n/a (no issue number) |
| kaola-workflow/cross-machine-followups | complete | n/a |
| kaola-workflow/minimal-ecc-config | complete | n/a |

These will be archived as part of #51 acceptance criteria 4 (top-level dirs with status:active + step:complete archived or marked closed).

## Worktree registry drift

`node scripts/kaola-workflow-claim.js worktree-status` (per audit body) reported registered closed-issue worktrees: issue-40, issue-42, issue-46. Phase 3/4 must decide whether to clean these via a new `sweep --closed-issues` flag or a separate finalize call.
