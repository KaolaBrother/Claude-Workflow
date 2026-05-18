# Advisor — Ideation Gate: Issue #85

## Input

Planner recommended Option A (three separate test functions). Advisor review
flagged one blocking ordering issue on the PR path.

## Blocking Issue: PR Test Ordering

**Planner's proposed order (testE2EGitHubPrFullChain):**
```
startup → worktree-finalize → finalize --keep-worktree → sink-pr → assert pr_url
```

**Production order:**
```
startup → worktree-finalize → sink-pr → watch-pr (when PR closes) → folder archived
```

Phase 6 Step 8b (sink: pr) explicitly says: "the active folder must remain open
so sink-pr.js can write pr_url and watch-pr can archive the folder when the PR
merges or closes."

`sink-pr.js` line 112 reads `path.join(root, 'kaola-workflow', args.project,
'workflow-state.md')` from the ACTIVE folder, not an archive path. If
`finalize --keep-worktree` has already archived the main-worktree copy, and
sink-pr is run from the linked worktree (cwd=wtPath), the mirrored copy is
still accessible — so the test would pass mechanically. However, it exercises an
unrealistic path that differs from production ordering, providing weaker
regression value.

## Resolution: Option A — Full watch-pr E2E

Select the production-ordered chain:

```
startup (online, gh shim) →
worktree-finalize (mirrors artifacts to linked worktree) →
sink-pr (cwd=wtPath, OFFLINE, folder still active) →
watch-pr (gh shim reports PR closed) →
assert: active folder archived, pr_url written, no open worktree
```

**Evidence for feasibility:**
- `testWatchPrArchivesClosedIssuePrFolder` (line 487) already shows watch-pr
  with a planted state file and a gh shim returning `"state": "CLOSED"`. This
  pattern is directly reusable.
- `sink-pr.js` OFFLINE path writes `prUrl = 'OFFLINE_PLACEHOLDER'` and commits
  metadata — no live GitHub needed.
- watch-pr gh shim: return `[{"number": N, "state": "CLOSED", "headRefName":
  "workflow/issue-N", "url": "..."}]` for the test issue number; watch-pr will
  archive the folder.

**Scope boundary for PR test:**
The assertion "archive exists + pr_url written + worktree clean" is achieved via
watch-pr. The test does NOT need to assert that sink-pr returned a real PR URL
— OFFLINE mode writes 'OFFLINE_PLACEHOLDER', which is sufficient to prove the
metadata-write path ran.

## Other Findings

- testE2EGitHubMergeFullChain: Planner ordering (startup → worktree-finalize →
  finalize --keep-worktree → sink-merge) is correct. sink-merge handles its own
  removeWorktree internally.
- testParallelIssueIndependence: Planner approach is correct. Two startups → 
  finalize one via sink-merge → assert other's state unchanged.
- GitLab E2E: out of scope confirmed (no OFFLINE guard in GitLab scripts).

## Recommendation

Select Option A with the following corrections:
1. `testE2EGitHubPrFullChain`: use production ordering (sink-pr BEFORE
   finalize/archive; watch-pr at end with closed-PR gh shim).
2. `testE2EGitHubMergeFullChain`: no change needed.
3. `testParallelIssueIndependence`: no change needed.
4. CHANGELOG: document GitLab E2E out of scope with explicit reason.

No missed approaches. The three-function structure is the right call — sharing a
single monolithic E2E would make failure attribution harder.
