# Phase 2 - Ideation: issue-126

## Approaches Evaluated

### Option A: Scoped Parity Sweep (Approach 1)
- Summary: Edit exactly the 7 confirmed exclusionary sites + add Gitea release-block line + CHANGELOG `### Fixed` entry. Defer the 5 additional GitHub-branding sites.
- Pros: Surgical, matches issue scope, low review burden, no risk of touching edition-specific content
- Cons: Leaves 5 additional GitHub-branding sites untouched (deliberately deferred)
- Risk: Low
- Complexity: Small

### Option B: Full GitHub-Branding Rewrite
- Summary: Also edit lines 442, 457, 533, 585+ (section header + body), 674; retitle "GitHub roadmap cycle"
- Pros: Maximally forge-neutral docs in one pass
- Cons: Scope creep; those sites are descriptively GitHub-specific (e.g., `gh pr create` is correct for GitHub row); risks corrupting intentionally edition-specific content; `gh pr create` in agent-directed steps could silently break agent prompts
- Risk: Medium
- Complexity: Medium

## Advisor Findings

Approach 1 confirmed. Four items flagged:

1. **FF_FAIL resolved before Phase 3**: Gitea DOES support `KAOLA_WORKFLOW_FORCE_FF_FAIL` (lines 14, 174 of `kaola-gitea-workflow-sink-merge.js`). All three env vars (OFFLINE, FORCE_FF_FAIL, FORCE_MERGE_IMPOSSIBLE) can be broadened to include Gitea.
2. **CHANGELOG section**: Use `### Fixed` (not `### Added`) — this is corrective doc work, not a new feature.
3. **Deferred items**: Must appear explicitly in Out of Scope with line numbers and rationale.
4. **Worktree constraint**: All Phase 4 agent prompts must specify `Working directory: /Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-126/`.

Full advisor output: `.cache/advisor-ideation.md`

## Selected Approach

**Approach 1 — Scoped Parity Sweep**

Rationale: The 7 exclusionary sites are confirmed stale, directly mislead users about Gitea support, and are safe to change without touching edition-specific content. The Gitea release-block line is required for parity. FF_FAIL verification is complete — all three env vars apply to all three forges. CHANGELOG goes under `### Fixed`.

## Implementation Sites (Phase 3 task inputs)

**README.md — Release Block**
- Fix `1.4.1` → `1.5.0` on lines 358-359 for `kaola-workflow` and `kaola-workflow-gitlab` Codex manifests
- Add `- Claude Code command install, Gitea edition: \`3.10.0\`` after the GitLab edition line (line 357)

**README.md — Install Paths (lines 424-426)**
- Add `~/.claude/kaola-workflow-gitea/scripts/` for the Gitea edition

**README.md — Env Var Table (lines 465-468)**
- `KAOLA_WORKFLOW_OFFLINE`: broaden "Skip GitHub/GitLab calls" → all three forges
- `KAOLA_WORKFLOW_FORCE_FF_FAIL`: "(GitHub and GitLab)" → "(GitHub, GitLab, and Gitea)"
- `KAOLA_WORKFLOW_FORCE_MERGE_IMPOSSIBLE`: "(GitHub and GitLab)" → "(GitHub, GitLab, and Gitea)"

**README.md — Hooks Re-run (lines 627-628)**
- Add `` `--forge=gitea` `` to the re-run instruction alongside `--forge=github` and `--forge=gitlab`

**docs/workflow-state-contract.md:9**
- "GitHub issues are the canonical backlog and closure source when online" → forge-neutral wording

**docs/api.md:7**
- "updating GitHub/GitLab metadata" → include Gitea

**docs/api.md:51-53**
- "Applies to both GitHub and GitLab editions" → "Applies to GitHub, GitLab, and Gitea editions" (all three hook entries)
- "Applies to both editions" → "Applies to all three editions"

**CHANGELOG.md**
- Add `### Fixed` bullet under `[Unreleased]` for issue #126

## Out of Scope (explicit)

The following sites were found during Phase 1 exploration but are NOT in scope for this issue. They describe GitHub-specific tooling or roadmap prose, not exclusionary claims about forge support.

| Location | Current Text | Reason Deferred |
|----------|-------------|-----------------|
| README.md:442 | "open a GitHub PR via `gh pr create`" | `gh pr create` is the correct GitHub CLI command; changing to forge-neutral phrasing could break agent prompts that parse this step |
| README.md:457 | "GitHub issue/PR state as the durable coordination contract" | Descriptive of how GitHub coordinates; GitLab/Gitea equivalents are a separate doc concern |
| README.md:533 | "Fetch open GitHub issues" in agent-directed selection step | GitHub-specific workflow step; changing requires careful forge-conditional rewrite |
| README.md:585+ | `## GitHub roadmap cycle` section header and body | Entire section is GitHub-branded by design; retitling requires broader roadmap content audit |
| README.md:674 | "GitHub issue state used to reject closed issues" | GitHub-specific behavioral description; other forges may differ |

These will be addressed in a future issue covering full forge-neutral documentation rewrite.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
