# Advisor Ideation Gate Output — issue-28

## Decision: Approach 2 confirmed with corrections

### Blocker: Acceptance criterion #3 missed in planner draft

Issue AC #3: "`projectNameForIssue` no longer swallows the error silently — surface a single-line warning to stderr when the lookup fails for a reason other than 'entry not found'"

The planner's `projectNameForIssue` body kept `catch (_) {}` (silent for all errors). That fails the AC.

Corrected body:
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
- ENOENT (file not found) → silent fallback to `issue-N` (normal case: no slug set yet)
- Any other error (permissions, EISDIR, etc.) → stderr warning then fallback

### Test coverage gap: two buildSinkBranchName cases unreachable via cmdClaim

Issue spec lists four unit cases:
1. `buildSinkBranchName(38, 'issue-38')` → `workflow/issue-38` (dedup: project equals fallback)
2. `buildSinkBranchName(38, 'guard-handoff')` → `workflow/issue-38-guard-handoff` (clean slug)
3. `buildSinkBranchName(38, 'issue-38-guard')` → `workflow/issue-38-guard` (defensive dedup: partial prefix)
4. `buildSinkBranchName(null, 'epic7a', 'workflow/issue-42-epic7a')` → `workflow/issue-42-epic7a` (null issue path)

Cases 3 and 4 cannot be reached via `cmdClaim` end-to-end:
- Case 3: requires a roadmap file with `workflow_project: issue-38-guard` (would need explicit seeding)
- Case 4: `cmdClaim` always has an issue number; null-issue path is unreachable

**Decision**: Use `require.main !== module` export guard in claim.js to expose `buildSinkBranchName` for direct unit testing:
```js
if (require.main !== module) module.exports = { buildSinkBranchName };
```
Rationale: This is not a public API growth — the guard only activates when require'd (not executed as CLI). The planner's concern about "growing the public surface" was overstated; the existing test pattern in simulate-workflow-walkthrough.js already uses similar approaches. The four spec cases need direct verification.

### Non-blockers
- Legacy `workflow/issue-N-issue-N` branches stay as-is (issue says no migration needed).
- This session's own branch (`workflow/issue-28-issue-28`) is the bugged name — this is expected and the fix applies to future claims.

## Action Items Applied
1. Corrected `projectNameForIssue` stderr warning for non-ENOENT errors
2. Added `require.main !== module` export guard for `buildSinkBranchName` unit tests
3. Epic Case 5H covers all four spec cases directly
