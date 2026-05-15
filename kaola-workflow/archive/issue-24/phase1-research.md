# Phase 1 - Research: issue-24

## Deliverable

Make workflow startup a script-level contract so sessions cannot safely skip bootstrap/claim, and synchronize GitHub issues into the roadmap mirror before selecting the next issue.

## Why

Prompt-only bootstrap can be skipped by an agent. In parallel sessions, that means one session may bypass stale-lease sweep, PR lease release, owned-work detection, issue classification, and claim acquisition before selecting work.

## Affected Area

- Shared workflow claim/startup script
- Root Claude Code command prompts
- Packaged Codex skills and scripts
- Roadmap mirror generation
- Root and Codex walkthrough simulations
- Contract validators

## Key Patterns Found

1. `scripts/kaola-workflow-claim.js` owns session claims, locks, sweep, watch-pr, bootstrap, and GitHub claim comments.
2. `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` mirrors the root script for Codex packaging and must stay in sync.
3. `scripts/kaola-workflow-roadmap.js` generates `ROADMAP.md` only from existing `.roadmap/issue-N.md` files.
4. `commands/workflow-next.md` and `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` currently instruct startup as a code block instead of a single mandatory transaction.
5. Existing simulations already use local `gh` shims, which can cover online issue sync and dependency-blocked startup without network.

## Test Patterns

- Framework: Node.js script-based walkthrough simulations plus contract validators.
- Location: `scripts/simulate-workflow-walkthrough.js`, `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`, `scripts/validate-*.js`.
- Structure: add assertions for startup receipt writing, issue sync before selection, missing/skipped startup corpus markers, claimed-next-issue selection, and dependency-blocked selection.

## External Docs

N/A. See `.cache/docs-lookup.md`.

## Completeness Score

9/10

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | no external behavior lookup needed |
