# Code Architect Notes - issue-102

Status: local-fallback-tool-unavailable

Blueprint:

1. Add regression coverage in `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`.
   - Use a temp project.
   - Pre-create `.codex/config.toml` with an external `[features]` table.
   - Run `plugins/kaola-workflow/scripts/install-codex-agent-profiles.js` twice.
   - Assert the config has exactly one `[features]` header, preserves the external key, and includes the managed agent block.
   - Add a fresh-config assertion that the managed block still contains `[features]` and `multi_agent = true`.

2. Implement text-scoped installer preprocessing in `plugins/kaola-workflow/scripts/install-codex-agent-profiles.js`.
   - Strip existing managed block before checking for external tables.
   - Detect top-level `[features]`.
   - Remove the top-level `[features]` stanza from the template when needed.
   - Leave user-owned config outside managed markers untouched.

3. Validate with:
   - `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
   - `npm run test:kaola-workflow:codex`
   - `node scripts/simulate-workflow-walkthrough.js`
   - `npm test`

4. Finalize docs if needed:
   - Add a concise `CHANGELOG.md` entry under `[Unreleased]` for issue #102.
   - No README/API/architecture/env updates expected because usage and public interfaces remain unchanged.
