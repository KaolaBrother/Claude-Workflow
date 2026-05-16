# Phase 2 - Ideation: issue-28

## Approaches Evaluated

### Option A: Layer A only (strawman)
- Summary: Add `cmdProjectName` to roadmap.js so the existing subprocess call succeeds. Leave everything else.
- Pros: Smallest diff (~10 lines); minimal risk surface.
- Cons: Keeps silent `catch (_) {}` antipattern; duplicate inline subprocess in `pickFirstActionableIssue` remains; two un-defended branch construction sites persist. Future regression of any layer reintroduces the bug.
- Risk: Low immediate; Medium architectural
- Complexity: Small
- **Rejected** — doesn't satisfy issue acceptance criteria.

### Option B: Both layers + DRY (RECOMMENDED)
- Summary: Add `cmdProjectName` to roadmap.js (Layer A); switch `projectNameForIssue` to direct file read with ENOENT-aware catch (Layer B upstream); add `buildSinkBranchName` defensive helper (Layer B downstream); route both branch-construction sites through it; collapse `pickFirstActionableIssue` inline duplicate to call `projectNameForIssue` directly.
- Pros: Matches issue specification. Eliminates subprocess failure source. Centralizes branch construction. DRY. Satisfies all acceptance criteria.
- Cons: Larger diff (~60 net LOC across 4 files + tests). Requires careful plugin mirror.
- Risk: Low
- Complexity: Medium
- **Selected.**

### Option C: Direct read only, skip cmdProjectName (YAGNI)
- Summary: Skip `cmdProjectName`. Fix `projectNameForIssue` + `buildSinkBranchName` + DRY.
- Pros: ~20 fewer LOC. No new public CLI.
- Cons: Deviates from issue spec. Future automation has no stable CLI for project name lookup.
- Risk: Low technical; Medium process
- Complexity: Small/Medium
- **Rejected** — diverges from approved spec.

---

## Advisor Findings

Advisor flagged two corrections to the planner draft:

**Blocker — Acceptance criterion #3 missed:**
The planner's `projectNameForIssue` kept a blanket `catch (_) {}` which fails AC #3 ("surface a single-line warning to stderr when the lookup fails for a reason other than 'entry not found'"). Corrected to distinguish ENOENT (silent fallback) from other errors (stderr warning then fallback).

**Test coverage gap — two buildSinkBranchName cases unreachable via cmdClaim:**
The `buildSinkBranchName(38, 'issue-38-guard')` partial-prefix dedup case and the `buildSinkBranchName(null, ...)` null-issue path cannot be exercised through `cmdClaim` end-to-end. Decision: add a `require.main !== module` export guard to expose `buildSinkBranchName` for direct unit testing in the walkthrough — the guard only activates when require'd (not as CLI), so it doesn't grow the public surface.

---

## Selected Approach

**Option B — Both layers + DRY**, with advisor corrections:

### Layer A: `cmdProjectName` in roadmap.js
Add `cmdProjectName(argv)` subcommand:
- Validate `--issue` is a positive integer
- Read `.roadmap/issue-{N}.md` via `roadmapDir(getRoot())`
- Use `field(content, 'workflow_project')`, strip pipes, trim
- Exit 0 + stdout when field is valid; exit 1 + no stdout when missing, `—`, or blank
- Dispatch: `if (sub === 'project-name') { cmdProjectName(process.argv.slice(3)); return; }`
- Update Unknown subcommand error message to include `project-name`
- Mirror identically to `plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js`

### Layer B: claim.js changes
1. **`projectNameForIssue`** (lines 698–707) — direct file read:
   ```js
   function projectNameForIssue(_classifierScript, issueNumber) {
     try {
       const content = fs.readFileSync(roadmapIssuePath(getRoot(), issueNumber), 'utf8');
       const name = field(content, 'workflow_project').replace(/\|/g, '').trim();
       if (name && name !== '—') return name;
     } catch (err) {
       if (err && err.code !== 'ENOENT') {
         process.stderr.write('warn: projectNameForIssue(' + issueNumber + ') failed: ' + err.message + '\n');
       }
     }
     return 'issue-' + issueNumber;
   }
   ```

2. **`buildSinkBranchName`** helper (new, above `buildSinkBlock`):
   ```js
   function buildSinkBranchName(issueNumber, project, fallbackBranch) {
     if (issueNumber == null) {
       return fallbackBranch || ('workflow/' + (project || 'unknown'));
     }
     const base = 'workflow/issue-' + issueNumber;
     if (!project || project === 'issue-' + issueNumber) return base;
     const prefix = 'issue-' + issueNumber + '-';
     const suffix = project.startsWith(prefix) ? project.slice(prefix.length) : project;
     return suffix ? base + '-' + suffix : base;
   }
   ```

3. **`buildSinkBlock`** (line 383): replace inline ternary → `buildSinkBranchName(lockData.issue_number, lockData.project, lockData.branch)`

4. **`cmdWatchPr`** (lines 1503–1506): replace inline ternary → `buildSinkBranchName(lock.issue_number, lock.project, lock.branch)`

5. **`pickFirstActionableIssue`** (lines 734–741): collapse inline subprocess → `const proj = projectNameForIssue(classifierScript, N);`

6. **Export guard** at bottom:
   ```js
   if (require.main !== module) module.exports = { buildSinkBranchName };
   ```

7. Mirror Steps 1–6 to `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`

### Tests: simulate-workflow-walkthrough.js
- **Epic Case 5G** (4 assertions): `project-name` subcommand — valid, `—` placeholder, missing file, blank field
- **Epic Case 5H** (4 assertions): direct unit test of `buildSinkBranchName` via export guard — all four spec cases
- **Regression assertion**: in existing claim test, verify `## Sink` `branch:` never has `issue-N` twice

---

## Out of Scope (explicit)
- No migration for existing `workflow/issue-N-issue-N` branches (backward compatible per issue spec)
- No changes to `buildClaimCommentBody`, `buildRoadmapIssueContent`, or `cleanRoadmapValue`
- No removal of `classifierScript` parameter from `projectNameForIssue`
- No CHANGELOG/README changes in this phase (pre-commit checklist items)
- This session's own branch (`workflow/issue-28-issue-28`) is the bugged name; it stays as-is

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
