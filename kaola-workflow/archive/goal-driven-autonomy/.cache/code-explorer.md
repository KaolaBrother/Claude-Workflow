# Code Explorer Notes

Issue: KaolaBrother/Kaola-Workflow#1

## Relevant Surfaces

- `commands/kaola-workflow-phase1.md` currently tells Phase 1 to use `_phase1-pending`, ask the user to confirm a generated project name, and confirm again before Phase 2.
- `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md` mirrors that behavior for Codex by creating `_phase1-pending` until the name is confirmed and listing project-name confirmation as a step.
- `commands/kaola-workflow-phase2.md` and `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md` currently stop for user strategy selection even after planner/advisor analysis exists.
- `commands/kaola-workflow-phase3.md` and `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md` currently stop for user approval before Phase 4.
- `commands/workflow-next.md` and `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` define router behavior and roadmap sync. These are the right places for goal-driven continuation rules.
- `README.md` and `commands/workflow-init.md` document durable workflow behavior and must distinguish autonomous bookkeeping from true user authorization.
- `scripts/validate-workflow-contracts.js` and `scripts/validate-kaola-workflow-contracts.js` assert cross-surface workflow contracts; they should add assertions for autonomous naming, goal contracts, and internal advisor decisions.

## Test Patterns

- Framework: Node.js assertion scripts plus shell syntax checks.
- Claude validation path: `npm run test:kaola-workflow:claude`.
- Codex validation path: `npm run test:kaola-workflow:codex`.
- Full validation path: `npm test`.
- Existing contract scripts use `assertIncludes(file, needle)` to enforce durable instruction snippets across docs, commands, and skills.
- Walkthrough scripts create synthetic phase artifacts and verify state repair routing.

## Constraints

- Keep `commands/workflow-next.md` under 220 lines; the existing validator enforces that.
- Preserve local workflow state semantics: brand-new work should not have repaired state synthesized by the repair helper until phase artifacts exist.
- Do not make external authorization automatic. Risky Git sync, destructive rewrites, unresolved ambiguity, issue reorganization, and final push still need explicit user authorization when not already covered by the user's request.
- Codex instructions need an equivalent goal contract because a user-facing `/goal` command may not exist in all installed Codex versions.
