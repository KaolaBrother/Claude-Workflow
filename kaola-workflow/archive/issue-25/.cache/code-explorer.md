# Code Explorer - issue-25

Research performed in the current session because subagent delegation was not explicitly requested.

## Incident Facts

- `startup` correctly acquired issue #16 for the first Claude session in KaolaTerminal.
- A second Claude session later received `claim: "none"` and a skipped entry for issue #16 with reason `already claimed`.
- The second session still inspected the active project folder and ran `handoff`, taking over a live lock.
- The owner session JSONL existed under the matching local Claude project directory:
  `~/.claude/projects/-Volumes-WorkspaceA-ylminiserver-workspace-KaolaTerminal/<session>.jsonl`.

## Current Code

1. `scripts/kaola-workflow-claim.js`
   - `cmdHandoff` rewrites an existing lock owner without checking owner liveness, lock expiry, heartbeat recency, startup receipt authorization, or an explicit force flag.
   - `parseArgs` handles only value flags; boolean force flags need support.
   - `startupReceiptPath` and `writeStartupReceipt` exist, but there is no verifier subcommand.
   - `cmdSession` can detect foreign ownership, but phase prompts currently do not reject a receipt with `claim: "none"` for the project.

2. `commands/workflow-next.md`
   - Startup text says startup must run.
   - Later routing still allows active workflow folder inspection and has a generic explicit recovery/handoff snippet.
   - It needs to say `claim: "none"` stops normal routing and `handoff` must be guarded.

3. Phase commands and Codex phase skills
   - All have a "Startup Receipt Guard" prose section.
   - The guard does not call a script verifier and can be interpreted too shallowly as "receipt exists".

4. Simulations
   - Root `scripts/simulate-workflow-walkthrough.js` Case 8K currently asserts explicit handoff succeeds.
   - Packaged `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` Case 5g mirrors the same behavior.
   - Both need regression coverage for rejecting handoff when a live local Claude session owns the lock, and for force takeover as the explicit recovery path.

## Implementation Targets

- Add `verify-startup` subcommand:
  - passes only when receipt session matches and `claim` is `acquired` or `owned` for the requested project.
  - fails for `claim: "none"`, missing receipt, project mismatch, or foreign receipt.
- Add `can-handoff` subcommand and make `handoff` call it internally:
  - reject live owner by local Claude JSONL recency in the matching worktree project directory.
  - reject live owner by alive ticker pid.
  - reject non-expired lock and recent heartbeat.
  - permit force only through `--force-live-takeover`.
- Update router and phase prompts to use the verifier and to make `claim: "none"` a stop condition for normal routing.
- Mirror root script into packaged Codex script.

## Test Targets

- Root simulation: session A owns issue; session B startup receipt has `claim: "none"`; default handoff rejected while owner has live local Claude JSONL; force takeover succeeds.
- Packaged Codex simulation: same handoff guard behavior.
- Contract validators: assert new subcommands and prompt guard strings exist.

## Risks

- Claude project path encoding is inferred from observed local paths: replace path separators with `-`, preserving the leading slash as a leading dash.
- Old stale locks without local Claude session evidence should remain recoverable.
- Force takeover must be explicit and visible.
