# Phase 1 - Research / Discovery: issue-126

## Deliverable
Update `README.md` and `docs/` to consistently name GitHub, GitLab, and Gitea as sibling forge editions; fix two stale Codex manifest version strings in README.md; and add Gitea wherever the docs currently list only GitHub/GitLab.

## Why
Docs still describe the workflow as GitHub/GitLab-only despite Gitea being fully implemented and tested. This misleads users into treating Gitea support as partial, and causes future agents to receive conflicting design guidance.

## Affected Area
- `README.md` — lines 358-359 (stale `1.4.1` Codex manifest versions), 424-426 (Gitea install path omitted), 465-468 (env var table, Gitea omitted), 627-628 (hooks re-run, Gitea omitted)
- `docs/workflow-state-contract.md` — line 9 (GitHub-only backlog source)
- `docs/api.md` — line 7 (sink description, Gitea omitted), lines 51-53 (env var docs, "both editions" excludes Gitea)

## Key Patterns Found
1. README.md:358-359 shows `1.4.1` for `kaola-workflow` and `kaola-workflow-gitlab` Codex manifests; actual `plugins/*/codex-plugin/plugin.json` files show `1.5.0` for all three — `plugins/kaola-workflow/.codex-plugin/plugin.json:3`
2. Install path sentence at README.md:424-426 lists `~/.claude/kaola-workflow/scripts/` and `~/.claude/kaola-workflow-gitlab/scripts/` only — `~/.claude/kaola-workflow-gitea/scripts/` pattern mirrors prior two
3. docs/api.md:57 already states `KAOLA_WORKFLOW_OFFLINE` applies to all three editions — README.md:465 must match; similar Gitea parity pattern applies to FORCE_FF_FAIL and FORCE_MERGE_IMPOSSIBLE

## Test Patterns
- Framework: hand-rolled assert (no framework)
- Location: `scripts/simulate-workflow-walkthrough.js`, `scripts/validate-workflow-contracts.js`
- No test asserts on the specific doc strings being changed — doc edits will not cause test failures

## Config & Env
No env vars needed. No feature flags. No config file changes.

## External Docs
None required.

## GitHub Issue
KaolaBrother/Kaola-Workflow#126

## Completeness Score
10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | internal text edits only; no external library or framework behavior needed |

## Notes / Future Considerations
- Additional README omissions found beyond issue scope (lines 442, 457, 533, 585, 674 — GitHub-specific branding in agent-directed steps and roadmap section header). Ideation phase should decide whether to include or defer these.
- README.md currently has no "Claude Code command install, Gitea edition" line in the release block — the issue doesn't require it, but it's consistent with adding full Gitea parity. Ideation should rule in/out.
- The issue scope is documentation only — no code changes, no validator changes needed.
