# Advisor Ideation Gate - issue-102

Status: invoked

Review:
- Option 1 is correctly scoped and matches the issue's preferred behavior.
- The detection must ignore the existing Kaola managed block; otherwise re-running the installer after a fresh install would strip `[features]` from its own managed block on the second run.
- Removing a top-level table should stop at the next top-level table header. The template currently has `[features]` followed by `[agents.code-explorer]`, so this is straightforward.
- Test should cover idempotency because the bug report mentions reinstall persistence.
- A full TOML parser is unnecessary for the repository's current no-dependency Node scripts and would be disproportionate for this fixed template shape.

Selected recommendation remains Option 1.
