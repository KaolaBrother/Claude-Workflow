# Phase 5 - Review: issue-28

## Code Review Findings

### CRITICAL
None.

### HIGH
None.

### MEDIUM / LOW

**M-1 (code): buildSinkBlock ignores lock.branch for issue-backed locks**
`buildSinkBranchName(lockData.issue_number, lockData.project, lockData.branch)` silently
ignores `lockData.branch` when `issueNumber != null`. This matters in `cmdHandoff` (line 1166)
where the lock may have a `branch` set via `patch-branch`. For legacy sessions with a patched
branch, the Sink block would be rewritten with the computed name instead of the stored one.
Fix: use `lockData.branch || buildSinkBranchName(lockData.issue_number, lockData.project)` in
`buildSinkBlock`. Same pattern as `cmdWatchPr`. Deferred to follow-up issue.

**M-2 (code): field() fix has no direct unit test**
Epic Case 5G-d tests the fixed behavior indirectly via cmdProjectName. No direct unit test
of `field()` itself. Deferred to follow-up issue.

**L-1 (code): Dead _classifierScript parameter in projectNameForIssue**
Renamed to `_classifierScript` but call sites still pass it. Minor cleanup; deferred.

**L-2 (code): File sizes exceed 800-line ceiling**
Pre-existing; not introduced by this PR.

**L-3 (code): Legacy orphan branches on merge**
When a PR merges for a legacy session with branch `workflow/issue-N-issue-N`, `git branch -D`
runs on the computed correct name, leaving the old orphan. Silent failure in catch. Deferred.

## Security Review
Ran: Yes — claim.js touches filesystem and external GitHub API (security-sensitive per Phase 5 gates).

### Findings
**M-1 (security): projectNameForIssue lacks internal issueNumber validation**
`issueNumber` passed to `roadmapIssuePath(getRoot(), issueNumber)` without guard inside the
function. All current call sites validate; fragile under future callers. Deferred to follow-up.

**L-1 (security): cmdProjectName stdout not sanitized of shell-significant chars**
Only `|` is stripped. Downstream claim.js callers use `isSafeName()`. Risk only for
shell consumers that capture unquoted. Deferred to follow-up.

**L-2 (security): buildSinkBranchName branch name not validated against all git ref rules**
`isSafeName()` doesn't block every git-invalid ref character. Runtime git rejection possible;
no security impact. Deferred to follow-up.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-reviewer | invoked | .cache/code-reviewer.md | |
| security-reviewer | invoked | .cache/security-reviewer.md | claim.js touches filesystem + GitHub API |
| review-fix executors | N/A | — | No CRITICAL or HIGH findings |
| advisor critical gate | N/A | — | No CRITICAL findings |

## Fixes Applied
None — no CRITICAL or HIGH findings to fix.

## Validation Evidence
- `node scripts/simulate-workflow-walkthrough.js` → exit 0 (Phase 4, cited; no relevant files changed)
- `diff -u scripts/kaola-workflow-roadmap.js plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js` → no output (Phase 4, cited)
- `diff -u scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js` → no output (Phase 4, cited)

## Follow-Up Items
1. [HIGH candidate] Fix `buildSinkBlock` to use `lockData.branch || buildSinkBranchName(...)` for consistent priority with `cmdWatchPr` (code M-1)
2. [MEDIUM] Add direct unit test for `field()` cross-line bleed fix (code M-2)
3. [LOW] Add internal issueNumber guard to `projectNameForIssue` (security M-1)
4. [LOW] Remove dead `_classifierScript` parameter from `projectNameForIssue` (code L-1)
5. [LOW] Consider sanitizing `cmdProjectName` stdout against shell-significant chars (security L-1)

## Review Status
PASSED WITH FOLLOW-UPS
