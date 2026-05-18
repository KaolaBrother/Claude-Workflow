# Security Review — Issue #86

## Scope
`kaola-gitlab-workflow-claim.js` new functions (`cwdInside`, `partitionActiveAndDrift`, `cmdRelease` guard).
Test file, documentation, CHANGELOG: non-production paths — no findings.

## Findings

### CRITICAL
None.

### HIGH
None.

### MEDIUM
None.

### LOW

1. **cwdInside unhandled ENOENT** — if `folder.project_dir` is deleted between `readActiveFolders` and `cmdRelease` reaching the guard, `fs.realpathSync(target)` throws ENOENT. Exception propagates to outer catch, giving raw stack trace instead of structured JSON. Robustness issue, not a security vulnerability. Fix: `try/catch` in `cwdInside` returning `false` on ENOENT.

2. **partitionActiveAndDrift fail-open on API errors** — `issueIsClosed` returns `false` on any forge exception; closed-issue folders stay in `active` during outages. Cosmetic drift in cmdStatus output, not a security issue. Existing intended behavior (fail-open avoids blocking work when GitLab unreachable).

## Path Traversal Assessment
`cwdInside` uses `real + path.sep` in startsWith — correctly prevents `/proj2` matching a guard on `/proj`. Both operands go through `realpathSync`. No bypass vector found.

## folder.project_dir Provenance
`isSafeName` validation at two independent gates (active-folders.js + archiveProjectDir). Cannot escape `kaola-workflow/` subtree. No injection risk within stated trust model.

## Other Checks
- Shell injection: git commands pass args as arrays with `--` separators. No metacharacter exposure.
- Credentials: no hardcoded tokens. Auth delegated to `glab` CLI.
- OWASP Top 10: not applicable (no SQL/HTML/sessions/deserialization in scope).

## Verdict
No blocking issues. Safe to proceed to Phase 6.
