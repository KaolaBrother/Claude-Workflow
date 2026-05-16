# Code Review — issue-28

## Files Reviewed
- scripts/kaola-workflow-roadmap.js
- plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js
- scripts/kaola-workflow-claim.js
- plugins/kaola-workflow/scripts/kaola-workflow-claim.js
- scripts/simulate-workflow-walkthrough.js

## buildSinkBranchName Spec Cases — All Correct
1. buildSinkBranchName(38, 'issue-38') → 'workflow/issue-38' ✓
2. buildSinkBranchName(38, 'guard-handoff') → 'workflow/issue-38-guard-handoff' ✓
3. buildSinkBranchName(38, 'issue-38-guard') → 'workflow/issue-38-guard' (no double prefix) ✓
4. buildSinkBranchName(null, 'epic7a', 'workflow/issue-42-epic7a') → 'workflow/issue-42-epic7a' ✓

## Findings

### CRITICAL: 0

### HIGH: 0

### MEDIUM

**M-1: buildSinkBlock silently ignores lock.branch for issue-backed locks**
File: scripts/kaola-workflow-claim.js line 393 (and plugin mirror)
buildSinkBranchName(lockData.issue_number, lockData.project, lockData.branch) ignores
lockData.branch when issueNumber != null. buildSinkBlock is called from cmdHandoff
(line 1166), where lock.branch may be set via patch-branch. If lock.branch differs
from the computed name, the state file is silently overwritten with the computed value.
Suggested fix (Option B): use `lockData.branch || buildSinkBranchName(lockData.issue_number, lockData.project)`.
STATUS: logged as follow-up; does not block

**M-2: field() fix bundled without a direct unit test for cross-line bleed case**
File: scripts/kaola-workflow-claim.js line 23, scripts/kaola-workflow-roadmap.js line 11
Epic Case 5G-d tests cmdProjectName indirectly. No direct unit test of field() itself.
STATUS: logged as follow-up; does not block

### LOW

**L-1: Dead _classifierScript parameter in projectNameForIssue**
File: scripts/kaola-workflow-claim.js line 707 (and plugin mirror)
Parameter renamed to _classifierScript but never used; call sites still pass it.
STATUS: follow-up

**L-2: File sizes exceed 800-line ceiling**
Files: scripts/kaola-workflow-claim.js (1555 lines), scripts/simulate-workflow-walkthrough.js (3252 lines)
Pre-existing issue, not introduced by this PR.
STATUS: follow-up (pre-existing)

**L-3: Legacy orphan branches not cleaned up on merged PR events**
File: scripts/kaola-workflow-claim.js line 1512
Lock files created under old buggy regime had branch=workflow/issue-N-issue-N; after
merge, git branch -D runs on the computed new name, leaving the old branch orphaned.
STATUS: follow-up (edge case, silent git failure already wrapped in catch)

## Verdict: APPROVE with notes
No CRITICAL or HIGH findings. Two MEDIUM findings (non-blocking). Safe to merge.
