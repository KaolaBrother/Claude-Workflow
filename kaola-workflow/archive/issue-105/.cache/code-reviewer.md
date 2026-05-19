# Code Review — Issue #105 (fast-path merge closure live-folder guard)

Reviewed files in linked worktree `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-105/`.

---

## CRITICAL Findings

None.

---

## HIGH Findings

None.

---

## MEDIUM Findings

### [MEDIUM] phase6.md: existing description contradicts new commit behavior

**File:** `commands/kaola-workflow-phase6.md`, line 521

**Context:** The pre-existing sentence says:

> "The rename is included in the Step 8 commit via git rename detection."

The new `--keep-worktree` path in `cmdFinalize` (claim.js lines 458–461) creates its own `git commit -m "chore: archive {project}"` inside the linked worktree **before** Step 8 runs. The archive is therefore committed by `cmdFinalize`, not by Step 8's `git add / git commit`. The appended sentence about the `sink-merge` safety guard is accurate, but it does not correct the now-false claim that Step 8 captures the rename.

A reader following the phase6.md document to debug a commit-history issue will be misled. The existing sentence should be updated to reflect the new two-commit pattern: `cmdFinalize` commits the archive on the feature branch, then Step 8 commits the implementation artifacts.

**Concrete failure mode:** Documentation drift — no runtime failure, but operator confusion when inspecting branch history.

---

## LOW Findings

### [LOW] cmdFinalize: unguarded git operations when `--keep-worktree` from linked worktree

**File:** `scripts/kaola-workflow-claim.js`, lines 458–461

```javascript
execFileSync('git', ['-C', root, 'add', '-A', 'kaola-workflow/'],
  { encoding: 'utf8', stdio: 'inherit' });
execFileSync('git', ['-C', root, 'commit', '-m', 'chore: archive ' + args.project],
  { encoding: 'utf8', stdio: 'inherit' });
```

If `git commit` throws (e.g., pre-commit hook rejection, or `user.email` not configured in the worktree), `cmdFinalize` propagates the exception. The filesystem archive rename at line 446 has already succeeded at this point, so `sink-merge`'s guard will correctly refuse the subsequent invocation and force a manual remediation. The system self-corrects: the guard exists precisely for this case.

However, `output({ status: 'closed' }, ...)` at line 465 is never reached, so the caller receives no JSON and cannot distinguish "finalize failed on commit" from "finalize failed on archive". The caller in phase6.md runs `cmdFinalize` with a bare shell invocation and does not inspect its JSON output, so the practical impact is low. A comment explaining the deliberate propagation and the self-correcting property of the guard would prevent future maintainers from wrapping this in a swallowing catch.

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0     | pass   |
| HIGH     | 0     | pass   |
| MEDIUM   | 1     | info   |
| LOW      | 1     | note   |

**Verdict: APPROVE** — The core guard logic in `assertNoLiveWorkflowFolder` is correct and well-placed (after `git checkout args.branch`, before the merge-base skip-check). The `cmdFinalize` `--keep-worktree` expansion is correct and minimal. Both new tests (`testSinkMergeRefusesLiveFolder` and `testFastE2EMergeFullChain`) provide meaningful coverage: the negative case verifies the guard fires and main SHA is unchanged; the positive E2E case verifies the full `worktree-finalize → finalize --keep-worktree → sink-merge` chain including `fast-summary.md` preservation. The one MEDIUM finding (docs drift in phase6.md) does not affect runtime behavior and can be resolved in a follow-up edit to that file.
