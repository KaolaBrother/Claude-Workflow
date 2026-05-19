# Phase 2 - Ideation: issue-102

## Approaches Evaluated

### Option A: Strip duplicate-prone `[features]` stanza when target already owns it (SELECTED)
- Summary: Before upserting the managed block, detect `[features]` outside Kaola markers in the existing config. If present, remove the `[features]` stanza from the injected template block.
- Pros: Matches issue's preferred fix; preserves self-contained fresh installs; does not mutate user-owned config tables; small and testable.
- Cons: If an existing `[features]` table lacks `multi_agent`, this option will not add it.
- Risk: Low. The template shape is fixed and table removal can be bounded to top-level TOML table headers.
- Complexity: Small.
- What not to build: no general TOML parser, no full config rewrite, no management of user-owned `[features]` keys.

### Option B: Merge `multi_agent = true` into the existing `[features]` table
- Summary: Detect existing `[features]` and insert `multi_agent = true` into that table if missing, while stripping it from the managed block.
- Pros: Preserves feature enablement even for existing configs.
- Cons: Higher formatting and semantic risk without a TOML parser; edits user-owned config outside the managed block.
- Risk: Medium.
- Complexity: Medium.
- What not to build: broad TOML mutation utilities.

### Option C: Remove `[features]` from the template permanently
- Summary: Delete `[features]` from `config/agents.toml` so the managed block never injects it.
- Pros: Very small diff.
- Cons: Regresses empty/fresh Codex config installs; weakens the installer contract documented in README.
- Risk: Medium.
- Complexity: Small.
- What not to build: template split without preserving fresh install behavior.

## Advisor Findings
The advisor check supports Option A. The key hidden risk is idempotency: detection must ignore the existing Kaola managed block so re-running the installer does not strip its own `[features]` stanza from fresh installs. Regression coverage should run the installer twice against a config with an external `[features]` table.

## Selected Approach
**Option A**. It is the smallest fix that satisfies the issue and avoids surprising writes to user-owned config. Fresh configs continue to receive `[features]\nmulti_agent = true` inside the managed block; existing configs with their own `[features]` table receive only the agent profile stanzas inside the managed block.

## Out of Scope
- Full TOML parsing.
- Editing existing user-owned `[features]` tables.
- GitLab plugin changes unless implementation discovers an equivalent installer script there.
- Changes to agent profile TOML files.

## Required Agent Compliance
Plain `invoked` is intentional for non-Codex-role workflow gates such as
advisor review; delegation vocabulary applies only to Codex role rows like
`planner`.

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | local-fallback-tool-unavailable | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
