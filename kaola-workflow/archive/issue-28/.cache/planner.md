# Planner Output — issue-28

## Recommended Approach: Approach 2 — Both Layers + DRY

### Approach 1 (Strawman): Layer A only
- Add `cmdProjectName` so the subprocess call succeeds. Leave everything else.
- Pros: Smallest diff (~10 lines). Minimal risk.
- Cons: Keeps silent `catch (_) {}` antipattern, duplicate inline subprocess in `pickFirstActionableIssue`, two un-defended branch construction sites. Future regression reintroduces bug.
- Risk: Low immediate; medium architectural.
- **Rejected.**

### Approach 2 (RECOMMENDED): Both layers + DRY
- Add `cmdProjectName` to roadmap.js
- Switch `projectNameForIssue` to direct file read (using existing `field()`, `roadmapIssuePath()`, `getRoot()`)
- Add `buildSinkBranchName(issueNumber, project, fallbackBranch)` defensive helper
- Route `buildSinkBlock` (line 383) and `cmdWatchPr` (line 1503) through the helper
- Collapse `pickFirstActionableIssue` inline duplicate → call `projectNameForIssue` directly
- Mirror all to plugin copies
- Pros: Matches issue spec. Eliminates subprocess failure source. Centralizes branch construction. DRY.
- Cons: Larger diff (~60 net LOC across 4 files). Needs careful mirror.
- Risk: Low.
- **Selected.**

### Approach 3 (YAGNI): Direct read only, skip cmdProjectName
- Skip adding `cmdProjectName`. Fix `projectNameForIssue` + `buildSinkBranchName` + DRY.
- Pros: ~20 fewer LOC. No new public CLI.
- Cons: Deviates from issue spec. Future automation has no stable CLI to query project name.
- Risk: Low technically; medium process.
- **Rejected** (diverges from approved spec).

---

## Implementation Steps (Approach 2)

### Phase 1: Layer A — roadmap.js subcommand (2 files)
1. Add `cmdProjectName(argv)` to `scripts/kaola-workflow-roadmap.js`:
   - Validate `--issue` is positive integer
   - Read `.roadmap/issue-{N}.md` via `roadmapDir(getRoot())`
   - Use `field(content, 'workflow_project')`, strip pipes, trim
   - Exit 0 + stdout if valid; exit 1 + no stdout otherwise
   - Add dispatch in `main()`: `if (sub === 'project-name') { cmdProjectName(process.argv.slice(3)); return; }`
   - Update Unknown subcommand error message to include `project-name`
2. Mirror to `plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js`

### Phase 2: Layer B + DRY — claim.js (2 files)
3. Replace `projectNameForIssue` body (lines 698–707) with direct file read:
   ```js
   function projectNameForIssue(_classifierScript, issueNumber) {
     try {
       const content = fs.readFileSync(roadmapIssuePath(getRoot(), issueNumber), 'utf8');
       const name = field(content, 'workflow_project').replace(/\|/g, '').trim();
       if (name && name !== '—') return name;
     } catch (_) {}
     return 'issue-' + issueNumber;
   }
   ```
   Keep `classifierScript` param in signature (callers pass it).
4. Add `buildSinkBranchName` helper above `buildSinkBlock` (line 381):
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
5. Route `buildSinkBlock` line 383 through helper:
   `const branchName = buildSinkBranchName(lockData.issue_number, lockData.project, lockData.branch);`
6. Route `cmdWatchPr` lines 1503–1506 through helper:
   `const branchName = buildSinkBranchName(lock.issue_number, lock.project, lock.branch);`
7. Collapse `pickFirstActionableIssue` lines 734–741 to:
   `const proj = projectNameForIssue(classifierScript, N);`
8. Mirror Steps 3–7 to `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`

### Phase 3: Tests (simulate-workflow-walkthrough.js)
9. Epic Case 5G (after line ~786):
   - 5G-a: init-issue with workflow_project + project-name → stdout `<name>`, exit 0
   - 5G-b: init-issue with `—` workflow_project + project-name → exit 1, no stdout
   - 5G-c: project-name for missing file → exit 1
   - 5G-d: blank workflow_project field → exit 1
10. Epic Case 5H (end-to-end via cmdClaim):
    - project=`my-slug`, issue=38 → `branch: workflow/issue-38-my-slug`
    - project=`issue-38`, issue=38 → `branch: workflow/issue-38` (regression case)
    - no issue → `branch: workflow/<project>`
11. Regression assertion in existing claim test: `## Sink` contains `branch: workflow/issue-N` with exactly one occurrence of `issue-N`

### Phase 4: Verification
12. `node scripts/simulate-workflow-walkthrough.js` → exit 0
13. `diff -u scripts/kaola-workflow-roadmap.js plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js` → no output
14. `diff -u scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js` → no output

---

## Items NOT to Build
- Do NOT make `projectNameForIssue` throw on failure (callers expect string)
- Do NOT remove `classifierScript` parameter from `projectNameForIssue`
- Do NOT add `module.exports` guard to claim.js (prefer end-to-end cmdClaim tests)
- Do NOT touch `buildClaimCommentBody`, `buildRoadmapIssueContent`, or `cleanRoadmapValue`
- Do NOT add CHANGELOG/README changes (those are pre-commit checklist items)

---

## Missing Facts / Open Questions
None blocking. One implementer decision: end-to-end cmdClaim (preferred) vs module.exports guard for direct unit test. Recommend end-to-end.
