# Phase 6 - Summary: issue-77

## Delivered

- Replaced ungated fallback language ("when subagents are available; otherwise perform locally") in all 6 Codex phase skills (GitHub + GitLab editions) with a typed-acknowledgement gate requiring one of: `subagent-invoked` / `local-fallback-explicit` / `local-fallback-tool-unavailable` / `N/A`
- Added "Delegation Contract" section to `kaola-workflow-next/SKILL.md` (both editions): agents must ask the user to authorize a delegation policy at startup, then append `delegation_policy:` to `workflow-state.md`
- Updated compliance ledger template rows for all delegation-gated requirements across 6 phases
- Added `doc-updater` compliance row to finalize skill (it was missing before)
- Added 8 negative + 21 positive validator assertions to `scripts/validate-kaola-workflow-contracts.js`
- Added parallel assertion block to `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`
- Updated CHANGELOG.md, README.md, and docs/workflow-state-contract.md
- Filed follow-up issue #91: policy-ledger cross-check (delegation_policy vs. ledger entries)

## Final Validation Evidence

All test suites passed after branch fast-forward to main (resolved 3-commit base lag from issue-76 and CLAUDE.md untrack commits):
- `npm run test:kaola-workflow:codex` — PASSED
- `npm run test:kaola-workflow:gitlab` — PASSED
- `KAOLA_WORKFLOW_OFFLINE=1 npm test` — PASSED (full suite)

See `.cache/final-validation.md`

## Documentation Docking

DOCKED — `.cache/doc-docking.md`

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| final validation | invoked | .cache/final-validation.md | |
| doc-updater | subagent-invoked | .cache/doc-updater.md | |
| documentation docking | invoked | .cache/doc-docking.md | |
| roadmap refresh | invoked | kaola-workflow/ROADMAP.md | |
| archive completed folder | invoked | kaola-workflow/archive/issue-77 | |
| final commit and push | invoked | git status --short --branch | clean and synced |
