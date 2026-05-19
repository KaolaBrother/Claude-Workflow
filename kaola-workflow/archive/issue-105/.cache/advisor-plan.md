# Advisor Plan Gate — Issue #105

## Verdict: Blueprint sound. Three issues addressed before Phase 4.

### Issue 1: AC#4 must split into two commits (BLOCKING)

Pre-commit hook (`hooks/kaola-workflow-pre-commit.sh:44`) blocks `PROJECT_COUNT > 1`. Staging
`git rm -r kaola-workflow/issue-100/` AND `git rm -r kaola-workflow/issue-101/` in one commit
= two distinct projects in staged-files set → BLOCKED.

**Resolution**: Split AC#4 into two commits:
- Commit 1: `chore: archive issue-101 workflow folder` (`git rm -r kaola-workflow/issue-101/ && git add kaola-workflow/archive/issue-101/`)
- Commit 2: `chore: archive issue-100 workflow folder` (`git rm -r kaola-workflow/issue-100/ && git add kaola-workflow/archive/issue-100/`)

Verified by reading hook lines 30–48: archive/ excluded, then `awk 'NF >= 3 { print $2 }'` extracts project dirs, blocks on > 1.

### Issue 2: removeWorktree is no-op-tolerant (VERIFIED, no action needed)

`sink-merge.js:234`: `try { removeWorktree(mainRoot, args.project, folder); } catch (_) {}` — fully wrapped in try/catch. Negative test (`testSinkMergeRefusesLiveFolder`) never calls startup, so no worktree exists, but removeWorktree will silently succeed. Test is safe to write without setup worktree.

`--issue` is optional: `parseArgs` only sets it if `--issue N` present; script uses `if (args.issue != null)` guard at lines 203 and 182. Negative test can omit `--issue`.

### Issue 3: Line numbers verified (CONFIRMED)

- `assertCleanWorktree` ends at line 69; helper goes after line 69 (before line 71 `// Steps 3–4:`)
- `git checkout args.branch` is at line 243; guard call site is between lines 243–244 (before line 245 `// Step 2 — Merge-base skip-check`)
- New test functions: after line 1084 (end of `testE2EGitHubMergeFullChain`), before line 1086
- Registration: after line 1291 (`testE2EGitHubMergeFullChain()`), before line 1292 (`testE2EGitHubPrFullChain()`)
