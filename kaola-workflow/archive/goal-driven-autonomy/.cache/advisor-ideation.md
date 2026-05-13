# Advisor Ideation Gate

Decision: apply Option B.

Checks:

- Acceptance criteria require both runtimes, so a Phase 1-only fix is insufficient.
- The selected approach should explicitly preserve true user authorization boundaries while removing internal mechanics prompts.
- Contract tests should assert the policy in both Claude command files and Codex skill files so regressions are caught.
- No external package or runtime dependency is needed.

Result: recommendation sound. Proceed with a docs/instruction and validator patch.
