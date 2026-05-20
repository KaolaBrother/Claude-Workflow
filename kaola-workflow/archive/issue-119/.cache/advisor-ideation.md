# Advisor Output — Phase 2 Ideation Gate — Issue #119

## Overall Verdict
Option A is the right call. Endorsed without modification.

## Confirmation of Recommendation
- Mirroring the GitHub sink keeps three precedents aligned (sink-pr.js, kaola-gitea-forge.js, kaola-gitlab-forge.js all evaluate OFFLINE at module load).
- Asserts stay live for the online path.
- Library callers get parity, not just CLI.
- Options B and C have the failure modes the planner flagged.

## The `--merge` Gating Is Necessary
Without it, offline runs would invoke `forge.mergePullRequest`/`forge.mergeMergeRequest` on `pr_number: 0` / `mr_iid: 0`. Even though `teaExec`/`glabExec` return `''` and won't crash, the result is a silent meaningless no-op that violates "deterministic placeholder, returns without error." Gate it with `if (!OFFLINE && args.merge)`.

## Three Verifications Required in Phase 3 (Pre-Edit Checks, Not Assumptions)

1. **Gitea `updateStateSinkBlock` arity.** The plan calls it with 5 args `(stateFile, prUrl, prNumber, fullName, projectHtmlUrl)`. GitHub's is 3-arg. Confirm the Gitea sink's `updateStateSinkBlock` signature. If it's 3-arg, placeholder for `full_name`/`project_html_url` either needs a separate writer call or a signature change (scope expander).

2. **`appendSummary` creates-if-missing.** The offline path may be the first thing to touch `phase6-summary.md`. Confirm both plugins' `appendSummary` creates the file if missing (GitHub's does). If append-only, offline branch needs a touch/init step.

3. **GitLab `mr` return shape.** Plan returns `{ mr_url, mr_iid }` (2 fields). Online path likely returns more (`web_url`, `state`, etc.). Grep for callers of `ensureMergeRequest` — if any read a field beyond those two, placeholder must include it (or be `null`-safe).

## Phase 4 Placement Warning
Code edits to `plugins/kaola-workflow-gitea/...` and `plugins/kaola-workflow-gitlab/...` must happen in the WORKTREE at `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-119/`, not the main checkout. Branch `workflow/issue-119` is checked out there. Editing the main path puts changes on `main`.

## No Missed Approaches
Option D (offline guard in both `main()` and `ensure*`) adds duplication for no gain — skip it.

## Greenlight
Write `phase2-ideation.md` and route to Phase 3. Carry the three verifications as first tasks in Phase 3 before any file edit.
