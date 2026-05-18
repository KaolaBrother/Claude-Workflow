# Security Review: issue-83 — GitLab merge path archives before sink scripts finish

## Overall Verdict: No CRITICAL or HIGH issues. Safe to merge.

0 CRITICAL, 0 HIGH, 3 LOW (defense-in-depth gaps), 1 INFORMATIONAL (pre-existing, out of scope)

## Findings

### [LOW-1] `resolveProjectFile` does not self-validate `project`

**File:** `kaola-gitlab-workflow-sink-merge.js`, lines 44-50

`resolveProjectFile` constructs paths from `project` without asserting `isSafeName(project)` internally. Relies entirely on callers to validate first.

Current reachability: `runDirectMerge` (line 102) asserts `isSafeName(args.project)` before any path construction — all CLI paths are safe. Latent risk: exported functions `finalValidationPassed` and `closeLinkedIssue` (via `readProjectInfo`) have no internal `project` validation. A future direct caller could read outside the workflow tree.

Recommendation: assert `isSafeName(project)` in `resolveProjectFile`, or in both `finalValidationPassed` and `readProjectInfo`. Deferred as follow-up.

### [LOW-2] `appendSummary` does not validate its path

**File:** `kaola-gitlab-workflow-sink-mr.js`, lines 70-74

`appendSummary` accepts arbitrary `summaryFile` path. CLI call site validates `args.project` before forming path, so CLI surface is safe. Exported function offers no protection if called with attacker-influenced path whose parent exists.

Recommendation: remove from `module.exports` if no external consumer needed, or rewrite signature as `(root, project, basename)` with `isSafeName` guard. Deferred as follow-up.

### [LOW-3] `fs.existsSync` → filesystem operation TOCTOU via symlinks

**Files:** All three production files

All new `fs.existsSync` guards follow symlinks. An attacker with write access to the workflow tree could plant a symlink. Exploitation requires pre-existing write access — largely theoretical.

Recommendation (non-blocking): `fs.lstatSync` + symlink rejection, or `fs.realpathSync` + prefix check. Deferred.

### [INFORMATIONAL — pre-existing, not introduced by issue-83] Branch name not fully sanitized in `runDirectMerge`

`runDirectMerge` checks `args.branch && args.branch !== 'TBD'` but does not reject leading `-`, `.`/`..`. A branch named `-x...` could be interpreted as a git option (though `git merge -- args.branch` uses `--` separator). Unchanged by issue-83. Worth a follow-up issue.

## Positive Findings (issue-83 specific)

1. `cmdSinkFallback`: `isSafeName(args.project)` asserted BEFORE `projectDir(...)` and any filesystem access — ordering is correct
2. `resolveProjectFile`: uses `path.join` (no string concatenation); `basename` is always a hardcoded literal, never user-controlled
3. All `spawnSync`/`execFileSync` calls in tests use explicit argv arrays — no shell interpolation, no command injection
4. `KAOLA_WORKFLOW_OFFLINE=1` consistently set in all subprocess tests — no live GitLab API calls
5. No hardcoded secrets, credentials, tokens, or PII found
6. `appendSummary` existence guard prevents state resurrection on archived projects — companion test validates the invariant
7. `isSafeName` covers all canonical path traversal vectors: `/`, `\`, `\0`, `.`, `..`; validates `typeof === 'string'` and `length > 0`
