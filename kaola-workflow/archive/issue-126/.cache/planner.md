# Planner Output — Issue #126

## Recommendation: Approach 1 (Scoped parity sweep)

## Verified Facts
- All three Codex manifests are `1.5.0` (`plugins/*/.codex-plugin/plugin.json:3`). README:358-359 stale at `1.4.1`.
- Gitea Claude plugin manifest is `3.10.0` — matches root `package.json` and README:356-357. Release block is missing a Gitea line.
- No validator asserts on the version strings, release-block structure, install-edition lines, or env-var prose being edited.
- Active worktree: `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-126`

## Approach 1 — Scoped parity sweep (Recommended)
- Edit exactly the 7 confirmed exclusionary sites + release-block Gitea line + CHANGELOG
- Defer the 5 additional GitHub-branding sites (lines 442, 457, 533, 585+, 674)
- Pros: Surgical, matches issue scope, low review burden, no risk of touching edition-specific content
- Risk: Low | Complexity: Low

## Approach 2 — Full GitHub-branding rewrite
- Also edit lines 442, 457, 533, 585+ (section header + body), 674; retitle "GitHub roadmap cycle"
- Pros: Maximally forge-neutral docs in one pass
- Cons: Scope creep; those sites are descriptively GitHub-specific (e.g., `gh pr create` is correct for GitHub row); risks corrupting intentionally edition-specific content
- Risk: Medium | Complexity: Medium

## Implementation Steps (Approach 1)

**Phase A — Release block (README.md:354-360)**
1. Fix `1.4.1` → `1.5.0` on lines 358-359 for `kaola-workflow` and `kaola-workflow-gitlab` Codex manifests
2. Add `- Claude Code command install, Gitea edition: \`3.10.0\`` after the GitLab edition line

**Phase B — README parity sweep (4 sites)**
3. `README.md:424-426` — add `~/.claude/kaola-workflow-gitea/scripts/` for Gitea
4. `README.md:465-468` — add Gitea to OFFLINE, FORCE_FF_FAIL*, FORCE_MERGE_IMPOSSIBLE env vars
5. `README.md:627-628` — add `--forge=gitea` to hooks re-run instruction

**Phase C — docs/ sweep (3 sites)**
6. `docs/workflow-state-contract.md:9` — generalize "GitHub issues" to all three forges
7. `docs/api.md:7` — add Gitea to sink description
8. `docs/api.md:51-53` — broaden "both editions" to all three where accurate

**Phase D — Changelog**
9. CHANGELOG.md — add issue #126 bullet under `[Unreleased]`

## Missing Facts (1 verification needed at implementation)
- Does Gitea sink-merge honor `KAOLA_WORKFLOW_FORCE_FF_FAIL`? Grep `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js` for `FORCE_FF_FAIL`. If absent, do NOT broaden FF_FAIL line to include Gitea — only broaden MERGE_IMPOSSIBLE and OFFLINE.

## Deferred: Additional omissions
- README:442, 457, 533, 585+, 674 — descriptive GitHub-flavored prose, not exclusionary claims. Defer to future issue.

## Explicitly NOT in Scope
- No validator or test changes
- No retitle of "## GitHub roadmap cycle"
- No edits to 5 additional GitHub-branding sites
- No code changes
