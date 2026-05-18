# Phase 2 - Ideation: issue-83

## Approaches Evaluated

### Option A: Composite surgical fix (1A + 2A + 3A) — SELECTED

**Bug 1 — `resolveProjectFile` helper in `sink-merge.js`**
- Add a small private helper that checks the active path first, falls back to archive, then returns live path for caller's try/catch:
  ```js
  function resolveProjectFile(root, project, basename) {
    const live = path.join(root, 'kaola-workflow', project, basename);
    if (fs.existsSync(live)) return live;
    const archived = path.join(root, 'kaola-workflow', 'archive', project, basename);
    if (fs.existsSync(archived)) return archived;
    return live;
  }
  ```
  Use in `finalValidationPassed` (phase6-summary.md) and `readProjectInfo` (workflow-state.md).
- Pros: ~10 LOC, no signature change, no command-file change, tolerates both call orderings
- Risk: Low | Complexity: Small

**Bug 2 — Port GitHub disk-check guard verbatim into `cmdSinkFallback` in `claim.js`**
- Add `isSafeName` assert + `fs.existsSync(projectDir(root, args.project))` early-return:
  ```js
  assert(isSafeName(args.project), 'unsafe project name');
  if (!fs.existsSync(projectDir(root, args.project))) {
    output({ updated: false, project: args.project, reason: 'project archived' });
    return;
  }
  ```
- Exact port from `scripts/kaola-workflow-claim.js` — no divergence from GitHub pattern.
- Note: `isSafeName` is new behavior for GitLab (GitHub already has it); harmless side-effect.
- Risk: Low | Complexity: Small (3 added lines)

**Bug 3 — Existence guard in `appendSummary` in `sink-mr.js`**
- Replace `fs.mkdirSync` with an existence check on the parent directory:
  ```js
  function appendSummary(summaryFile, mrUrl, mrIid) {
    if (!fs.existsSync(path.dirname(summaryFile))) return false;
    fs.appendFileSync(summaryFile, '\nMR URL: ' + mrUrl + '\nMR IID: ' + mrIid + '\n');
    return true;
  }
  ```
- Mirrors sibling `updateStateSinkBlock` pattern (line 58: `if (!fs.existsSync(stateFile)) return false`).
- Risk: Low | Complexity: Small (2 LOC change)

### Option B: CLI flag `--archived` from phase6.md
- Requires editing the command file — violates no-command-file-change constraint.
- Not recommended.

### Option C: Defer archive step until after sink dispatch
- Requires reordering `runDirectMerge` and changing `cmdFinalize` behaviour.
- Larger scope, breaks existing contract, not recommended.

---

## Advisor Findings

Advisor confirmed 1A + 2A + 3A as correct, surgical, and compatible with the no-command-file constraint. Key corrections and notes:

1. **Phase 1 factual error corrected**: Phase 1 Key Pattern #2 incorrectly described the GitHub guard as `activeByProject`. The actual GitHub code is `fs.existsSync(projectDir(root, args.project))` at `scripts/kaola-workflow-claim.js`. Bug 2 fix must mirror the disk-check, not `activeByProject`.

2. **AC #4 accepted end-state (explicit)**: After archive, if sink-merge exits 3 and triggers fallback to sink-mr:
   - `cmdSinkFallback` returns `{updated: false, reason: 'project archived'}` (dir gone)
   - `updateStateSinkBlock` returns false (state file gone)
   - `appendSummary` returns false (dir gone)
   - MR is created on GitLab but no metadata persists anywhere; `watch-pr` cannot auto-close.
   - This is the accepted end-state for the exit-3 fallback-after-archive scenario.

3. **`resolveProjectFile` is private to `sink-merge.js`** — resolves only `phase6-summary.md` and `workflow-state.md`. Do not generalize into a shared module.

4. **`isSafeName` addition in Bug 2 is a hardening side-effect** — call it out explicitly in the plan to prevent reviewer confusion.

5. **Integration test required**: The test plan needs at least one end-to-end scenario in `simulate-gitlab-workflow-walkthrough.js`:
   - Archive the active folder
   - Run the sink dispatch chain
   - Assert no throws and archive directory is byte-unchanged after the run

---

## Selected Approach

**Composite 1A + 2A + 3A** — three independent surgical fixes, each private to its own file.

Rationale:
- No command-file changes
- No new CLI flags
- No architectural changes
- Each fix is independently testable
- Exact port from GitHub patterns minimizes divergence risk
- Advisor confirmed all three are correct and sufficient

---

## Out of Scope (explicit)

- No phase6.md command-file edits
- No new CLI flags (`--archived`, `--project-dir`, `--fallback`)
- No refactor of `archiveProjectDir` to defer archiving
- No reorder of `runDirectMerge`
- No change to normal `sink: mr` path (safe by design; no archive on MR path)
- No emergency rollback / "un-archive" logic
- No shared `resolveProjectFile` module (two call sites don't justify abstraction)

---

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
