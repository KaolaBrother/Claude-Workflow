# Planner Output — Issue #80

## Scope Clarification Found

A third affected file was identified beyond Phase 1 scope:
- `plugins/kaola-workflow-gitlab/commands/workflow-next.md` — has Git Freshness section but no `Git Freshness Block Recovery` subsection

## Approaches Evaluated

### Option A: Minimal mirror (Phase 1 scope as written)
Fix only the two files Phase 1 named:
1. `commands/workflow-next.md` lines 136-146
2. `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md`
- Risk: Low | Complexity: Small | Fit: High
- Con: leaves GitLab command file with same orphan bug

### Option B: Symmetric fix (recommended)
Same as A, plus `plugins/kaola-workflow-gitlab/commands/workflow-next.md`.
All four docs in the family handle freshness-block recovery identically.
- Risk: Low | Complexity: Small | Fit: High
- Con: slightly wider than Phase 1 scope; need parent confirmation

### Option C: Shared shell helper (rejected)
Factor release into a shared helper or new claim-script subcommand.
- Risk: Medium | Complexity: Medium | Fit: Low
- Fights per-plugin isolation pattern; contradicts Phase 1 "no script changes" constraint

## Recommended: Approach B

Rationale: bug occurs in any startup-then-classify flow; all four docs share the same pattern; fixing two leaves a live orphan path on the GitLab command edition; three instead of two is strictly less than a follow-up issue.

## Confirmed Facts

- JSON key for project: `selected_project` (confirmed `kaola-workflow-claim.js:383`)
- GitLab command uses same var names: `CLAIM_JS`, `STARTUP_OUT`, `KAOLA_WORKTREE_PATH`
- `KAOLA_PROJECT` extraction: `node -e "try{process.stdout.write(JSON.parse(process.argv[1]).selected_project||'')}catch(e){}" "$STARTUP_OUT"`

## Concrete Edits

**Edit 1 — `commands/workflow-next.md`**
- After line 92 (KAOLA_WORKTREE_PATH extraction), add KAOLA_PROJECT extraction
- Replace lines 136-146 (Git Freshness Block Recovery) to add: `node "$CLAIM_JS" release --project "$KAOLA_PROJECT" --reason git-freshness-block`

**Edit 2 — `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md`**
- Insert `### Git Freshness Block Recovery` subsection after "Stop before merge, rebase" line (~144)
- Use `$claim_script` and existing project variable

**Edit 3 — `plugins/kaola-workflow-gitlab/commands/workflow-next.md`**
- Same subsection insertion after Git Freshness section (~line 157)
- Uses `$CLAIM_JS` (already set to `kaola-gitlab-workflow-claim.js`)

## Test Strategy

- Extend `testFinalizeReleaseCleansWorktree` (lines 572-602) to also exercise `release --reason git-freshness-block`
- ~12 lines, documents freshness-block scenario as regression guard
- Do NOT add a full parallel test (would duplicate existing coverage)

## Explicit NOT to Build
- No script changes to `kaola-workflow-claim.js`
- No new claim-script subcommand
- No shared shell helper
- No auto-merge/rebase/stash logic
- No retry-loop; user re-runs after fixing Git state
- No edits to `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` (already correct)
