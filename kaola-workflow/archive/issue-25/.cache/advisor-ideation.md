# Advisor Ideation Gate - issue-25

## Check

The strongest practical design is to make ownership authorization executable in
`kaola-workflow-claim.js`, then make prompts call that executable guard. Prompt
wording alone is not enough for the observed failure because the losing session
skipped the intended sequence and still had a permissive recovery command.

## Recommendation

Select script-level startup verification plus guarded handoff:

- `verify-startup` must authorize phase entry only for receipts that acquired or
  already owned the requested project.
- `can-handoff` and `handoff` must reject normal transfer when local owner
  liveness exists.
- `--force-live-takeover` may exist, but only as an explicit dangerous recovery
  override.

## Risks

- Overblocking stale work if a dead session leaves a fresh lock. This is
  acceptable for the default path because issue #25 is about preventing real
  parallel race damage. Explicit force takeover remains available for intentional
  recovery.
- Codex and Claude surfaces can drift. Contract validators must assert both
  surfaces contain the same guard vocabulary and scripts stay mirrored.
