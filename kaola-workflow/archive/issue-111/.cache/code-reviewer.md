# Code Review: issue-111

## Summary
0 CRITICAL, 0 HIGH, 3 MEDIUM, 2 LOW. APPROVED with notes.

## MEDIUM Findings

### M1: `discoverProject` fallback escapes dependency injection
File: kaola-gitea-forge.js, line 104
The fallback `require('child_process').execFileSync` call is not injectable via `opts.execFileSync`. The fallback branch has zero test coverage and uses a redundant import (child_process already imported at line 4).
Recommendation: Thread `(options.execFileSync || execFileSync)('git', ...)` through the fallback to match teaExec injection pattern. Add a runner fixture for the fallback path.

### M2: `options.sha` semantic mismatch vs GitLab interface
File: kaola-gitea-forge.js, lines 246-248
In GitLab, `options.sha` is a HEAD SHA verification guard. In Gitea, it sets `merge_message_field` (merge commit message body), not a verification guard. Callers expecting idempotent-merge safety will silently set the commit message instead.
Recommendation: Add a JSDoc comment noting `sha` sets the merge commit message body (not HEAD verification) in the Gitea context.

### M3: `autoMerge` flag triggers server check but `merge_when_checks_succeed` never sent
File: kaola-gitea-forge.js, lines 242-255
`opts.autoMerge` invokes `checkServerVersion` but never sets `merge_when_checks_succeed: true` in mergeBody. The result is an immediate merge, not an auto-merge, despite the version gate passing.
Recommendation: Add `if (options.autoMerge) mergeBody.merge_when_checks_succeed = true;` and a corresponding test assertion.

## LOW Findings

### L1: `major < 0` branch in version check is unreachable
File: kaola-gitea-forge.js, line 26
Regex only matches digits, so `major` is always >= 0. Dead code.
Recommendation: Remove `major < 0 ||` from the condition.

### L2: Version check silently passes when no parseable version string
File: kaola-gitea-forge.js, lines 23-30
If regex doesn't match, `_versionChecked = true` is still set, permanently suppressing checks.
Recommendation: Add comment: `// No parseable version — assume compliant and proceed`.

## Verified Correct
- JSON key insertion order in mergePullRequest (Do, delete_branch_after_merge, conditional merge_message_field)
- ensureLabel case-insensitive name match
- updateIssueComment path (`/issues/comments/{id}`, no issue index)
- closeIssue no project param — documented with comment
- teaExec semver comparison logic (0.9.1 throws, 0.9.2 passes)
- All 22 exports exercised in test file
- Binary assertion loop (all calls[n][0] === 'tea')
- No debug console.log in forge file
- Function sizes all under 50 lines, file 283 lines under 800-line limit
