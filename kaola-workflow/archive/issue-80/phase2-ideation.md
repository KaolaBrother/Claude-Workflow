# Phase 2 - Ideation: issue-80

## Approaches Evaluated

### Option A: Minimal mirror (selected)
Port the correct pattern from the GitHub Codex skill into `commands/workflow-next.md` (Git Freshness Block Recovery section) and `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md` (missing subsection).
- Risk: Low | Complexity: Small | Architectural fit: High
- Con: GitLab command file still has the gap (deferred to #86)

### Option B: Symmetric fix across all four docs
Same as A, plus `plugins/kaola-workflow-gitlab/commands/workflow-next.md`.
- Risk: Low | Complexity: Small | Fit: High
- Rejected: third file is in scope of issue #86 ("GitLab release/status/startup safeguards lag GitHub active-folder behavior"); bundling violates single-issue scope

### Option C: Shared shell helper (rejected)
Factor cleanup into a shared subcommand or sourced snippet.
- Risk: Medium | Complexity: Medium | Fit: Low
- Fights per-plugin isolation pattern; contradicts "no script changes" constraint

## Advisor Findings

Advisor recommends Approach A. Key points:
- Issue AC and body explicitly limit scope to "Claude `workflow-next`" / "the Claude command path"
- `plugins/kaola-workflow-gitlab/commands/workflow-next.md` gap belongs to #86
- Must guard against empty `KAOLA_PROJECT`: `[ -n "$KAOLA_PROJECT" ] && node "$CLAIM_JS" release ...`
- `cmdRelease` is safe to call from main worktree against issue project (`cwdInside` check does not block)
- Test extension is a reason-string regression guard, not proof of doc change; frame it honestly

## Selected Approach: Option A

Files to modify:
1. `commands/workflow-next.md` — extract `KAOLA_PROJECT` after `KAOLA_WORKTREE_PATH`, add guarded `release` call in `### Git Freshness Block Recovery`
2. `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md` — insert `### Git Freshness Block Recovery` subsection

No script changes. The GitLab command file is explicitly deferred to issue #86.

## Out of Scope (explicit)
- `plugins/kaola-workflow-gitlab/commands/workflow-next.md` — deferred to #86
- `scripts/kaola-workflow-claim.js` — already correct
- `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` — already correct (reference)
- New claim-script subcommands or shared helpers
- Auto-merge/rebase/stash logic
- Retry loops after block

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
