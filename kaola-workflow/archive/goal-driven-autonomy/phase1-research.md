# Phase 1 - Research / Discovery: goal-driven-autonomy

## Deliverable

Implement GitHub issue #1: make Kaola-Workflow autonomous for routine workflow bookkeeping, especially generated workflow project/folder names, and add goal-driven continuation guidance for Claude Code and Codex.

## Why

Phase 1 currently interrupts users for a generated folder name even when the name is nonessential and safe. The workflow should keep moving until the phase objective is actually satisfied, while preserving prompts for true authorization and materially user-owned choices.

## Affected Area

- Claude command files under `commands/`
- Codex skill files under `plugins/kaola-workflow/skills/`
- User-facing workflow docs in `README.md` and `commands/workflow-init.md`
- Contract tests in `scripts/validate-workflow-contracts.js` and `scripts/validate-kaola-workflow-contracts.js`
- Walkthrough simulations if wording assumptions change

## Key Patterns Found

1. `commands/kaola-workflow-phase1.md:39` describes `_phase1-pending` and waits for project-name confirmation.
2. `commands/kaola-workflow-phase1.md:131` explicitly asks `Confirm? (yes / rename to: ...)`.
3. `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md:18` creates `_phase1-pending` until the project name is confirmed.
4. `commands/kaola-workflow-phase2.md:54` waits for user strategy selection before writing Phase 2.
5. `commands/kaola-workflow-phase3.md:50` confirms with the user before Phase 4.
6. `scripts/validate-workflow-contracts.js` and `scripts/validate-kaola-workflow-contracts.js` already enforce instruction text as durable workflow contracts.

## Test Patterns

- Framework: Node.js contract scripts and workflow simulations.
- Location: `scripts/validate-workflow-contracts.js`, `scripts/validate-kaola-workflow-contracts.js`, `scripts/simulate-workflow-walkthrough.js`, `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`.
- Structure: `assertIncludes` contract checks plus synthetic workflow artifact routing checks.

## Config & Env

- No runtime env vars or feature flags are needed.
- Claude Code advisor guidance uses the existing Opus/advisor configuration documented in the README.
- Codex guidance uses skill instructions and available goal mechanism, with strongest available expert/profile wording instead of a user-facing `/goal` dependency.

## External Docs

- Claude Code hooks: `https://code.claude.com/docs/en/hooks`
- Claude Code skills/commands: `https://code.claude.com/docs/en/slash-commands`
- Claude Code subagents: `https://code.claude.com/docs/en/sub-agents`
- Claude Code model config: `https://code.claude.com/docs/en/model-config`
- Codex quickstart: `https://developers.openai.com/codex/quickstart`
- OpenAI code generation guide: `https://developers.openai.com/api/docs/guides/code-generation#use-codex`

## GitHub Issue

KaolaBrother/Kaola-Workflow#1

## Completeness Score

10/10

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | invoked | .cache/docs-lookup.md | |

## Notes / Future Considerations

No deferred research questions.
