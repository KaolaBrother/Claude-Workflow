# Phase 2 - Ideation: issue-125

## Approaches Evaluated

### Option A: Verbatim Gitea mirror + README doc fix (Selected)
- Summary: Bump `plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json` version to `3.10.0`; copy the Gitea version assertion verbatim into the GitLab validator; fix both stale `3.8.1` lines in `README.md:356-357`.
- Pros: Minimal diff; mirrors established per-forge convention exactly; closes the drift for both plugin manifest and README in one commit; README's own contract text explicitly contradicts leaving `3.8.1` there.
- Cons: None identified for this scope.
- Risk: Low
- Complexity: S

### Option B: Shared helper module
- Summary: Extract a shared `assertPluginVersionMatchesPackage()` helper used by both GitLab and Gitea validators.
- Pros: DRY if more forge editions are added.
- Cons: Only 2 callers; standalone-per-forge-validator duplication is the established convention; introduces a new module boundary for marginal gain.
- Risk: Medium
- Complexity: M

### Option C: Root validator meta-check
- Summary: Add a cross-forge version consistency assertion at the root validator level.
- Pros: Catches drift across all editions at once.
- Cons: Scope creep; ownership ambiguity; defer until a third forge edition exists.
- Risk: Medium
- Complexity: M

## Advisor Findings

Approach A confirmed. Both `README.md:356-357` lines (GitHub + GitLab edition versions) must be included in the fix — same drift class, same root cause, README's own contract text at lines 362-363 explicitly contradicts leaving `3.8.1` there.

Pre-Phase-4 verification requirements:
1. Read `README.md:350-370` before editing. If a Codex-edition line is in that block, exclude it — Codex plugins are on a separate versioning track. Only touch Claude-edition lines.
2. Prove the guard catches drift: temporarily revert `plugin.json` to `"3.8.1"`, confirm the new assertion fires with the expected message (RED evidence), then restore.

## Selected Approach

**Option A — Verbatim Gitea mirror + README doc fix**

Rationale: The `root` variable resolves identically in both validators (`path.resolve(__dirname, '..', '..', '..')`), so the Gitea assertion can be copied verbatim. The README fix is deliberate scope expansion — same drift class, trivially small, and required by README's own stated contract. The advisor explicitly authorized this scope at the ideation gate; Phase 5 review should treat `README.md:356-357` as expected, not drift.

## Out of Scope (explicit)
- No shared helper module (Approach B)
- No root validator meta-check (Approach C)
- No `.codex-plugin/plugin.json` changes (Codex is on a separate versioning track)
- No changes to the GitHub main plugin (has no `.claude-plugin/plugin.json`)
- No README content assertion added to the validator
- No `package-lock.json` hand-edits

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
