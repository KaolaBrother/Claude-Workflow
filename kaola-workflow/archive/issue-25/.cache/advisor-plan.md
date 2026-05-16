# Advisor Plan Gate - issue-25

## Review

The implementation plan is sufficiently narrow if it keeps the authoritative
logic inside `kaola-workflow-claim.js` and treats prompts, skills, and validators
as consumers of that logic.

## Required Adjustments

- Regression tests must cover both `can-handoff` and direct `handoff`, because
  the historical failure used direct handoff.
- Startup verifier tests must include a successful acquired receipt, a receipt
  for the wrong project, and a `claim:none` receipt.
- The packaged Codex plugin script must remain byte-for-byte mirrored with the
  root shared script.
- Release metadata must be bumped so marketplace installs can detect the new
  version.

## Recommendation

Proceed with the script-first plan and keep the default guard conservative.
Forced takeover is the escape hatch for deliberate operator recovery.
