# Phase 1 - Research / Discovery: minimal-ecc-config

## Deliverable

Update `README.md` with a "Minimal ECC Configuration" guidance block recommending:
1. Configure ECC hooks with the minimal profile (`ECC_HOOK_PROFILE=minimal`)
2. Install/enable only the 9 ECC subagents Kaola-Workflow actually uses
3. Do not install ECC language rules as part of Kaola-Workflow setup
4. Common rules are user choice based on their own project preferences

## Why

Kaola-Workflow depends on ECC-provided subagents, but users should not be pushed into unrelated language-rule or common-rule choices when installing the workflow. The setup path should stay narrow and aligned with actual workflow requirements.

## Affected Area

- `README.md` — primary: add minimal ECC configuration guidance near the existing "Dependency — Everything Claude Code (ECC)" section (lines 23–60) or the "ECC Hook Policy" section (lines 351–369)
- No code, test, or config file changes needed

## Key Patterns Found

1. Existing "Dependency — ECC" section (`README.md:23–60`) — lists all 9 agents in a table with phase/model; currently no "which agents to install vs. skip" or language/common rules guidance
2. Existing "ECC Hook Policy" section (`README.md:351–369`) — already contains `ECC_HOOK_PROFILE=minimal` as a recommendation for heavy bursts; should also be framed as the recommended default for setup
3. `install.sh:36` — `REQUIRED_AGENTS` array is ground truth for the 9 required agents; README guidance must match this list

## Test Patterns

- Framework: Hand-rolled Node.js assertions (no external framework)
- Location: `scripts/validate-workflow-contracts.js`
- Structure: `assert(readme.includes('## ECC Hook Policy'), ...)` and `assert(readme.includes('ECC_HOOK_PROFILE=minimal'), ...)`

## Config & Env

- `ECC_HOOK_PROFILE=minimal` — env var already documented in README; must be preserved (contract test)
- No ECC config files in the repo; configuration is env-var-only

## Critical Constraints

- `validate-workflow-contracts.js` enforces that README must include `'## ECC Hook Policy'` and `'ECC_HOOK_PROFILE=minimal'` — these strings must not be removed or renamed
- `validate-kaola-workflow-contracts.js` enforces that the Codex plugin must NOT depend on ECC — no changes to Codex plugin files

## External Docs

N/A — all required facts are already present in the codebase and issue body. No external ECC API or framework behavior lookup needed.

## GitHub Issue

KaolaBrother/Kaola-Workflow#13

## Completeness Score

10/10
- Goal clarity: 3/3 (specific bullets defined in issue)
- Expected outcome: 3/3 (README section with explicit content requirements)
- Scope boundaries: 2/2 (README.md only; no code changes)
- Constraints: 2/2 (contract tests, agent list ground truth)

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | — | Documentation-only task; all facts in codebase and issue body; no external ECC API/framework behavior needed |

## Notes / Future Considerations

- The "ECC Hook Policy" section currently frames `ECC_HOOK_PROFILE=minimal` as a tip for heavy implementation bursts. The new guidance could also recommend it as the default for all Kaola-Workflow usage, which is consistent with Phase 6 skill instructions.
- The 9-agent list in `install.sh` REQUIRED_AGENTS and the README table must stay in sync after this change.
