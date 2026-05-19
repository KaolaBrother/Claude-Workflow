# Task: Issue 92 Orchestrator-Only Codex Kaola-Workflow

## Acceptance Criteria
- [ ] Codex Kaola-Workflow defaults to `delegation_policy: delegate`; no startup question asks whether to delegate.
- [ ] GitHub and GitLab Codex phase skills state that the main session is orchestrator-only.
- [ ] Required role work has concrete `spawn_agent` orchestration instructions and evidence fields.
- [ ] Required full-workflow role rows do not accept `local-fallback-explicit` or `local-fallback-tool-unavailable` as normal success states.
- [ ] If subagents cannot be used, the workflow blocks with a typed refusal instead of proceeding locally.
- [ ] #91 overlap: resume/routing reads `delegation_policy` and validators cross-check policy/ledger semantics where practical.
- [ ] Tests remain green: `npm test` and `npm run test:kaola-workflow:gitlab`.

## Workstreams
1. GitHub Codex skills and validator - `plugins/kaola-workflow/skills/**`, `scripts/validate-kaola-workflow-contracts.js`, Codex simulation if needed.
2. GitLab Codex skills and validator - `plugins/kaola-workflow-gitlab/skills/**`, GitLab contract validator, GitLab Codex simulation if needed.
3. Shared docs - `README.md`, `docs/workflow-state-contract.md` only if behavior/schema changes require documentation.
4. Review and verification - delegated review after implementation plus full test gates.

## Integration Notes
- Existing dirty files from prior interrupted work must not be reverted unless they directly conflict with #92/#91.
- Main session coordinates, integrates results, runs tests, and records status. Role work should be delegated.
- Issue #91 is included only for the overlapping policy/ledger enforcement; do not broaden into unrelated workflow cleanup.

## Risks
- Validators can prove skill text and artifact schema, but cannot directly observe runtime `spawn_agent` calls unless evidence metadata is required and checked.
- `spawn_agent` is a platform tool, not a shell command; instructions must describe the orchestration protocol for Codex, not a script invocation.
