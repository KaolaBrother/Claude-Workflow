# Code Explorer Notes - issue-102

Status: local-fallback-tool-unavailable

Issue: #102 "Bug: install-codex-agent-profiles.js injects duplicate [features] into existing config.toml"

Facts:
- `plugins/kaola-workflow/scripts/install-codex-agent-profiles.js:27-30` builds the managed block from `plugins/kaola-workflow/config/agents.toml` verbatim.
- `plugins/kaola-workflow/config/agents.toml:1-2` starts with `[features]` and `multi_agent = true`.
- `plugins/kaola-workflow/scripts/install-codex-agent-profiles.js:61-64` reads the existing target `.codex/config.toml` and upserts the full managed block without checking for a pre-existing `[features]` table outside the managed block.
- `plugins/kaola-workflow/scripts/install-codex-agent-profiles.js:32-44` only replaces content between the Kaola managed markers or appends a new block; it does not parse/merge TOML.
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js:35-66` is the smallest Codex-specific simulation file and already uses temp directories, making it a good place for an installer regression fixture.
- `package.json:37` runs the Codex simulation as part of `npm run test:kaola-workflow:codex`.
- `scripts/validate-script-sync.js` explicitly excludes `install-codex-agent-profiles.js` from shared script sync, so this change does not need a root script mirror.

Success criteria:
- Installing into an empty `.codex/config.toml` still writes the managed block with `[features]` and `multi_agent = true`.
- Installing into a config that already has `[features]` outside the managed block writes exactly one `[features]` table.
- Re-running the installer remains idempotent and does not reintroduce duplicate `[features]`.
- Agent profile copy behavior is unchanged.
- Codex workflow tests cover the duplicate-feature-table case.

Candidate files:
- `plugins/kaola-workflow/scripts/install-codex-agent-profiles.js`
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- `CHANGELOG.md` if finalize determines the user-visible installer bug fix needs a release note.
