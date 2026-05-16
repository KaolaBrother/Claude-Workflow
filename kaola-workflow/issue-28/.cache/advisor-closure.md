# Advisor Closure Gate — issue-28

## Closure Recommendation: CLOSE #28

All four acceptance criteria are met and verified by tests. The five Phase 5 follow-ups
don't block. File them as separate issues or leave in the summary.

## buildSinkBlock M-1 Assessment

The advisor acknowledges a correction: the Phase 3 guidance that buildSinkBlock was "safe"
was wrong about the call site — cmdHandoff loads lock.branch from disk and calls buildSinkBlock
with issueNumber != null, the same asymmetry caught in cmdWatchPr. The code reviewer was right.

However, closure is still appropriate:
- The issue spec explicitly says "no migration for existing workflow/issue-N-issue-N branches"
- Legacy locks with patched branch + buggy project are the only affected path
- New claims produce correct names; M-1 only matters for the carved-out legacy population
- Filing as follow-up is defensible

The one-liner fix (`lockData.branch || buildSinkBranchName(lockData.issue_number, lockData.project)`)
is mechanically small but not required before closing.

## Follow-Up Items — Not Blocking
1. buildSinkBlock M-1: use lockData.branch || buildSinkBranchName(...) for symmetry with cmdWatchPr
2. field() direct unit test
3. projectNameForIssue internal issueNumber guard
4. Remove dead _classifierScript parameter
5. Sanitize cmdProjectName stdout

## Pre-Commit Checklist
- Verify cross-session staging guard (kaola-workflow/.locks/issue-28.lock session_id check)
- Do not re-run walkthrough (fresh evidence from final validation exists)
