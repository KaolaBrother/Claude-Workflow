# Advisor Ideation Cache — issue-39

## Verdict: ENDORSE — proceed with Option 1A / 2A / 3A

The plan is sound. All three recommended approaches are correct and the phasing order (Bug 2 → Bug 1 → Bug 3) is right.

## What's Validated

- **Bug 2 (Option 2A)**: Surgical one-liner confirmed correct. 6C5 trace against it shows `mkdirSync` creates the dir, so `existsSync(projectDir)` returns true, falls through to existing logic, conservative-red still fires. PASS.
- **Bug 1 (Option 1A)**: Regex generalization preserves all 6A–6C5 traces. Symmetric extraction (same regex on both candidate and claimed) means host-project overlap detection works without the allow-list.
- **Bug 3 (Option 3A)**: `nohup ... & disown → process.ppid === 1` correctly ruled out. "Exit at startup if no Claude ancestor + auto-respawn from phase wrapper" is self-healing for transient ps failures. Correct.

## Gotchas for Phase 4 (verify, don't change plan)

1. **5-hop ceiling in `walkToClaudePid`**: Verify actual process-tree depth is ≤5 hops ticker→claude in deployment. If wrapper script or systemd adds depth, ticker self-exits even when Claude is alive. Auto-respawn masks this but creates a tight loop. Run `pstree` check during Phase 4 testing.

2. **Case 6J test isolation**: Subprocess spawned from inside Claude session will have Claude as ancestor — orphan-exit path won't fire. Test MUST use `detached: true` + `process.disconnect()` or `setsid` to break the ancestor chain. Otherwise the test exercises nothing meaningful. Confirm this pattern before writing.

3. **Plugin parity**: Assumed byte-identical mirror. Run `diff scripts/kaola-workflow-classifier.js plugins/kaola-workflow/scripts/kaola-workflow-classifier.js` before Phase 4 to confirm current parity (issue-38 commit `2ea8225` mirrored both). Add explicit parity diff to Phase 4 task list.

## Missed Approach (documented, not blocking)

Phase 1 research listed a config-driven `path_roots` hybrid for Bug 1. The planner picked "drop the allow-list entirely" (simpler, fewer lines, host-project-agnostic). The config-driven approach is a smaller behavior change for self-hosting users.

**Rejected because**: more lines, adds a new config key with no current demand, and existing tests already pin self-hosting behavior even without the allow-list (6C5 fires correctly because the candidate body has no paths, not because COARSE_AREAS matched). Document this in phase2-ideation.md.

## Phasing Confirmed

Bug 2 → Bug 1 → Bug 3: smallest risk first, then most regression surface, then new test pattern. Keep it.
