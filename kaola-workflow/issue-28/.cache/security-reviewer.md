# Security Review — issue-28

## Files Reviewed
- scripts/kaola-workflow-roadmap.js (+ plugin mirror)
- scripts/kaola-workflow-claim.js (+ plugin mirror)
- scripts/simulate-workflow-walkthrough.js

## Verified Safe
- cmdProjectName path traversal: Number(n) + isInteger guard blocks non-integer args; path is fixed-prefix concatenation of an integer only. ✓
- buildSinkBranchName git flag injection: execFileSync (no shell) + '--' separator prevents injection. ✓
- field() regex change (\\s* → [ \\t]*): bounded character class, no ReDoS path. ✓
- module.exports = { buildSinkBranchName }: exports only a pure function; no secrets or I/O exposed. ✓

## CRITICAL: 0

## HIGH: 0

## MEDIUM

**M-1: projectNameForIssue lacks internal issueNumber validation**
File: scripts/kaola-workflow-claim.js lines 707-718 (and plugin mirror)
issueNumber is string-concatenated into a file path without internal guard.
All current call sites validate before invoking; function is fragile under future callers.
Suggested fix: add guard at top: if (!Number.isFinite(issueNumber) || issueNumber <= 0) return 'issue-' + issueNumber;
STATUS: logged as follow-up; does not block

## LOW

**L-1: cmdProjectName stdout not sanitized of shell-significant chars**
File: scripts/kaola-workflow-roadmap.js lines 214-237
Strips | but not spaces, $, backticks. Downstream claim.js callers pass through isSafeName().
Risk only in hypothetical shell consumers that capture stdout unquoted.
STATUS: follow-up

**L-2: buildSinkBranchName branch name not validated against git ref rules**
File: scripts/kaola-workflow-claim.js lines 381-390
isSafeName() doesn't block all git-invalid ref characters (.lock suffix, consecutive dots, etc.).
A malformed project slug could cause a runtime git rejection (no security impact).
STATUS: follow-up

## Verdict: APPROVED
No CRITICAL or HIGH security issues. All path traversal and injection vectors are blocked. Safe to merge.
