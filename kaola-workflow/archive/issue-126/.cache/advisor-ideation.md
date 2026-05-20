# Advisor — Ideation Gate: Issue #126

## Verdict: Approach 1 confirmed. Proceed, but flag four things before/in Phase 4.

### Missed approaches?
No. The two approaches are the right decomposition. A hybrid (do the 7 confirmed sites but skip the Gitea release-block line) is a micro-variant of Approach 1, not a third option.

### Are risks accurate?
Yes. Approach 2's risk is slightly understated: the `gh pr create` line at README:442 is in an agent-directed steps section, so changing it could silently break agent prompts that parse that section. Deferring lines 442, 457, 533, 585+, 674 is the right call; those are descriptively GitHub-specific, not exclusionary claims.

### Is the recommendation sound?
Yes. Approach 1 is the correct choice. Surgical edits to the 7 confirmed exclusionary sites plus the release-block Gitea line covers the issue's explicit scope without touching content that is intentionally edition-specific.

### Gotchas that should change the decision?

1. **FF_FAIL grep is a hard prerequisite, not "at implementation time."**
   The planner correctly identified the verification but labeled it "missing fact (1 verification needed at implementation)." That framing is wrong — Phase 3 cannot write accurate task definitions for the env-var table (README:465-468) or docs/api.md:51-53 until this is resolved. Run the grep before writing the Phase 3 task list, not during Phase 4.
   Record this as resolved in `phase2-ideation.md` itself (not just the planner note) so Phase 3 has a definitive answer.
   **RESOLVED**: `grep -n "FORCE_FF_FAIL" plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js` returns lines 14 and 174 — Gitea DOES support `KAOLA_WORKFLOW_FORCE_FF_FAIL`. All three env vars (OFFLINE, FORCE_FF_FAIL, FORCE_MERGE_IMPOSSIBLE) can be broadened to include Gitea.

2. **CHANGELOG section: `### Fixed` or `### Changed`, not `### Added`.**
   This is corrective documentation work — doc parity, not a new feature. `### Added` would be misleading. Use `### Fixed` (preferred) or `### Changed` if the team uses the latter for doc corrections.

3. **Deferred items must be in `Out of Scope (explicit)` of `phase2-ideation.md`.**
   The distinction between "exclusionary claims" and "descriptively brand-specific prose" is defensible but subtle. Making it explicit in the phase file protects against a future reviewer treating the deferred lines as forgotten rather than intentionally deferred. List lines 442, 457, 533, 585+, 674 by number with the reason.

4. **Worktree constraint for Phase 4.**
   All Phase 4 agent prompts must include `Working directory: /Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-126/` so the `tdd-guide` (or whichever agent executes) writes into the feature branch worktree, not the main worktree. The Phase 3 task list should carry this constraint explicitly on each task.
