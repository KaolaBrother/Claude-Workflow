# Planner Output — Issue #125

## Recommendation: Approach A (verbatim Gitea mirror) + README doc fix

## Verified facts beyond Phase 1
- `root` confirmed identical in both validators: `path.resolve(__dirname, '..', '..', '..')` at line 7 of both. Gitea assertion copies verbatim.
- Only 2 forge editions have `.claude-plugin/plugin.json` — shared helper NOT warranted
- **New scope finding**: `README.md:356-357` "Release versioning" block shows `3.8.1` for BOTH GitHub and GitLab editions (drifted from `3.10.0`). README text at lines 362-363 explicitly states the GitLab pack tracks `package.json`, making these stale lines a direct contradiction.

## Approach A (Recommended)
- Bump `plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json:3` from `3.8.1` → `3.10.0`
- Insert version assertion after `validate-kaola-workflow-gitlab-contracts.js:93` (verbatim Gitea pattern)
- Fix `README.md:356-357` — both GitHub+GitLab edition lines from `3.8.1` → `3.10.0`
- Risk: Low | Complexity: S

## Approach B — Shared helper
- Rejected: only 2 callers; standalone-per-forge-validator duplication is the established convention
- Risk: Medium | Complexity: M

## Approach C — Root validator meta-check
- Rejected: scope creep, ownership ambiguity; defer if 3rd forge edition added
- Risk: Medium | Complexity: M

## Decision flagged: README scope
- **Recommended**: Fix both README lines 356-357 (same drift class, trivial, README's own text contradicts if left stale)
- **Narrower**: Fix only GitLab line 357, file separate issue for GitHub line 356

## Touch list
1. `plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json:3` — version bump
2. `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js:94` — insert assertion
3. `README.md:356-357` — both edition version lines updated
4. `CHANGELOG.md` — [Unreleased] entry

## Items NOT to build
- No shared helper (Approach B)
- No root validator meta-check (Approach C)
- No `.codex-plugin/plugin.json` changes (different versioning track)
- No main GitHub plugin changes (has no `.claude-plugin/plugin.json`)
- No `package-lock.json` hand-edits
