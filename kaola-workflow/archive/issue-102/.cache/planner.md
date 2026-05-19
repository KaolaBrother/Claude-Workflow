# Planner Notes - issue-102

Status: local-fallback-tool-unavailable

Options considered:

1. Strip the template `[features]` stanza from the managed block only when the existing config already has `[features]` outside the Kaola managed block.
   - Best match to issue expectation.
   - Keeps fresh configs self-contained.
   - Avoids writing into user-owned config tables.
   - Needs a small text helper for marker stripping and top-level table detection.

2. Merge `multi_agent = true` into an existing user-owned `[features]` table.
   - Preserves feature enablement even when `[features]` already exists.
   - Higher risk: text-based TOML mutation can accidentally touch comments, arrays, or formatting.
   - More invasive than the issue requires.

3. Remove `[features]` from `plugins/kaola-workflow/config/agents.toml` permanently.
   - Simplest installer code.
   - Regresses fresh config installs by no longer enabling the multi-agent feature automatically.

Recommendation: Option 1.

Implementation sketch:
- Add `stripManagedBlock(existing)` so table detection ignores any old managed block.
- Add `hasTopLevelTable(existing, 'features')`.
- Add `removeTopLevelTable(template, 'features')`.
- Change `managedBlock(existing)` to omit `[features]` from the template when `existing` has an external `[features]` table.
- Update `updateConfig()` to pass `existing` to `managedBlock(existing)`.
- Add a Codex simulation regression that runs the installer twice against a temp config with `[features]` already present and asserts only one `[features]` header remains.
