# TDD Task 4 — Tests (CWD guard + drift detection)

## Modified Files
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`

## Tests Added (lines 417-449)

### Test 1 — CWD Guard Refusal (lines 417-435)
spawnSync release with cwd=projectDir; asserts exit 1, released:false, correct reason.
Note: `initGitRepo(root)` required so subprocess resolves git root to temp root (not cwd=projectDir). Necessary deviation from spec.

### Test 2 — Drift Detection (lines 437-449)
withForge stub returning state:'closed' for all issues; calls claim.partitionActiveAndDrift(root) in-process; asserts drift.length===1, active.length===0.

## RED Evidence
Pre-addition baseline: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js` → "GitLab workflow script tests passed" (exit 0)

## GREEN Evidence
Post-addition: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js` → "GitLab workflow script tests passed" (exit 0)
Main session orchestrator validation: PASS

## Deviations
- `initGitRepo(root)` added to Test 1 — required correctness fix; without it, subprocess getRoot() falls back to cwd (projectDir), misses the active folder, and the guard never fires. Justified deviation.
- `KAOLA_WORKFLOW_ROOT` env var passed but has no effect (harmless).
