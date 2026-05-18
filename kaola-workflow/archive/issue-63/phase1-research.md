# Phase 1 - Research: issue-63

## Facts

- #65 blocks the redesigned GitLab track on #63.
- #63 requires reducing workflow state to local workflow files plus GitHub issues.
- The existing draft in `workflow/issue-63` already removes the legacy lock, session, ticker, heartbeat, TTL sweep, and handoff machinery.
- #64 is a separate active Phase alpha slice; #63 proceeds in its own worktree with the broader simplified-core implementation.

## Success Criteria

- No code reads or writes `.locks`, `.sessions`, or `.tickers`.
- No phase command starts a heartbeat ticker.
- Classifier, startup, resume, sink, and cleanup use active workflow folders.
- Closed-issue local folders are treated as residue.
- Safe discard is script-owned.
- `kaola-workflow-claim.js` is under 800 lines.
- Simulators and validators pass.
