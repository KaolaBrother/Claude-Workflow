# Advisor Ideation Gate — Issue #80

## Verdict: Approach A (scope reduction from planner's B)

### Scope discriminator
AC says "Claude `workflow-next` releases/discards…" and issue body says "the Claude command path." Scope is `commands/workflow-next.md`. Issue #86 ("GitLab release/status/startup safeguards lag GitHub") is the explicit parity tracker for GitLab gaps.

Adding `plugins/kaola-workflow-gitlab/commands/workflow-next.md` (Approach B's Edit 3) is scope creep into #86's domain.

The GitLab **skill** (`plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md`) was named in Phase 1 deliverable — advisor says "defensible either way." Keep it in scope as Phase 1 already included it.

### Required guards for Phase 3/4

1. **`KAOLA_PROJECT` empty guard** — if startup returns `claim: "none"` or `verdict: no_target`, `selected_project` may be absent. Wrap: `[ -n "$KAOLA_PROJECT" ] && node "$CLAIM_JS" release --project "$KAOLA_PROJECT" --reason git-freshness-block`

2. **`cwdInside` safe** — `cmdRelease` blocks discarding cwd. Freshness check runs in main worktree, not issue worktree, so calling release from main targeting the issue project is safe.

3. **Test framing** — extending `testFinalizeReleaseCleansWorktree` with a `git-freshness-block` reason variant tests the reason-string contract (script), not the doc fix. Frame it correctly in PR: regression guard, not proof of doc change.

4. **CHANGELOG** — CLAUDE.md doc checklist requires `[Unreleased]` entry in Phase 4/6.

5. **Validation** — `node scripts/simulate-workflow-walkthrough.js` must exit 0 with success line.

### Selected scope (Approach A)

Files to edit:
1. `commands/workflow-next.md` — Add `KAOLA_PROJECT` extraction + release call in Git Freshness Block Recovery
2. `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md` — Add `### Git Freshness Block Recovery` subsection

Files NOT touched (deferred):
- `plugins/kaola-workflow-gitlab/commands/workflow-next.md` — belongs to #86
- `scripts/kaola-workflow-claim.js` — already correct
- `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` — already correct
