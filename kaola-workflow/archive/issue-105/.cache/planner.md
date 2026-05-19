# Planner Output — Issue #105

## Approach A — Loud guard inside `sink-merge.js` (RECOMMENDED)

**What**: After `git checkout` (post-checkout, pre-rebase, around line 243 of sink-merge.js), add `assertNoLiveWorkflowFolder(mainRoot, args.project)`. Helper checks `fs.existsSync(path.join(mainRoot, 'kaola-workflow', args.project, 'workflow-state.md'))`; on hit throws with remediation: `node scripts/kaola-workflow-claim.js finalize --project {project} --keep-worktree`. Existing catch at line 272 converts throw to exit 1 + stderr.

- **Pros**: Single chokepoint for every merge-path commit. Cannot be bypassed by ordering mistakes. No PR-path interaction. Fails before anything mutates main. Easy to test.
- **Cons**: Only catches at sink time (not at commit time). Adds tree-content check to a formerly pure git-plumbing script.
- **Risk**: Low
- **Complexity**: Low (~15 lines, one test, one cleanup commit for #100/#101)
- **Architectural fit**: Very high. Same shape as existing `assertCleanWorktree` — validate-before-mutate, fail loudly, point to remediation.

---

## Approach B — Intent-signal hardening in pre-commit hook

**What**: Orchestrator exports `KAOLA_SINK_KIND=merge` before Step 8 `git commit`. Hook adds branch: when var is set AND staged path matches `^kaola-workflow/{not-archive}/`, block with exit 2.

- **Pros**: Catches bug one step earlier (at commit time).
- **Cons**: Couples hook to env-var contract in prose. If orchestrator forgets the var, guard does nothing — same prose-only problem, moved one layer down. Hook is shell; orchestrator state is markdown — fragile.
- **Risk**: Medium (future Phase 6 edits may silently drop the export)
- **Complexity**: Medium (two files + hook test + Phase 6 prose)
- **Architectural fit**: Low. Leaks workflow semantics into git plumbing layer.

---

## Approach C — Move archive into `sink-merge.js` directly

**What**: `sink-merge.js` detects live folder and calls `archiveProjectDir` itself, amends the commit, then proceeds.

- **Pros**: "Just works" — agent cannot break the contract.
- **Cons**: **Hides the bug**. Amending already-pushed commits unsafe. Conflates roles of sink-merge (git plumbing) and cmdFinalize (workflow state transition).
- **Risk**: High. Violates "fail loudly" principle.
- **Complexity**: Medium-high.
- **Architectural fit**: Low. Violates "scripts own atomicity, not policy."

---

## Recommendation: Approach A

**Concrete implementation plan:**

1. **`scripts/kaola-workflow-sink-merge.js`** (primary) — after post-checkout/pre-rebase (line 243 area): add `assertNoLiveWorkflowFolder(mainRoot, args.project)`. Note: cwd at that point is tmpdir; guard must use `path.join(mainRoot, ...)`.

2. **`scripts/simulate-workflow-walkthrough.js`** — add `testSinkMergeRefusesLiveFolder`. Must omit the `finalize` call, create a commit with live `kaola-workflow/issue-NNN/` on the workflow branch, run `sink-merge`, assert non-zero exit + stderr substring + `main` SHA unchanged. NOT a clone of `testE2EGitHubMergeFullChain` (which runs finalize first and cannot reproduce the bug).

3. **`commands/kaola-workflow-phase6.md`** lines 489–523 — append one sentence: "`sink-merge` will refuse to merge if the branch tree still contains `kaola-workflow/{project}/`. Running `cmdFinalize` per Step 8b is the only safe way past that guard."

4. **AC#4 cleanup (separate commit)** — `git mv kaola-workflow/issue-100 kaola-workflow/archive/issue-100` for any path still present on main (issue-100 still has live files on disk; issue-101 was deleted locally but live commit still on main). Keep out of the guard PR.

---

## Explicit Items NOT to Build

- Pre-commit hook intent-signal (Approach B)
- Silent auto-archive in `sink-merge.js` (Approach C)
- Refactoring `archiveProjectDir` / `cmdFinalize` — they are correct
- Generalizing guard to detect "any orphan live folder" — scope creep
- Block on `status: active` in staged state files in the hook — breaks PR path
- A `--force` escape hatch on the guard — no legitimate use case

---

## No Missing Facts

All resolved during research:
- cwd at line 243 is tmpdir; guard must use `path.join(mainRoot, ...)`
- AC#4 scope: `kaola-workflow/issue-100/` still on disk; cleanup is one `git mv` commit
- `testE2EGitHubMergeFullChain` does NOT exercise the bug path (runs finalize first); new test required
