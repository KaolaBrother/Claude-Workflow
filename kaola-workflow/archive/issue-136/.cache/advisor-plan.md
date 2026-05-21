# Advisor Plan Gate Output — Issue #136

## Verdict
Blueprint is sound. The stdout-pollution discovery and regenerateRoadmap(root) as silent helper is the right fix. Approved. No architect revision needed.

## Required Additions (incorporate into phase3-plan.md)

1. **testValidateRemoteOffline is REQUIRED, not optional.** It's the only test directly exercising the "do not silently pass under OFFLINE" constraint. Cost is small — no git, no shim, just spawnSync with KAOLA_WORKFLOW_OFFLINE=1 and assert stdout/exit.

2. **Phase 4 pre-implementation verifications (first 5 minutes):**
   - Confirm `const path = require('path')` exists in claim.js top. If absent, add it — otherwise the path.join() throws and the catch silently swallows (looks working, does nothing).
   - Verify `field()` helper actually parses `issue_number`. Grep before relying — some field() helpers filter by allowlist. If not, fall back to inline regex on state-file content.
   - Confirm `git add -A kaola-workflow/` + commit exists in cmdFinalize's --keep-worktree branch. Cross-worktree test's commit assertion depends on it.

3. **Test isolation**: Set `KAOLA_WORKFLOW_OFFLINE=1` in spawned env for BOTH new finalize tests. `clearAdvisoryClaim` calls `gh issue edit` + `gh issue comment` — will error or noop non-deterministically in a flat temp repo without a shim. OFFLINE mode skips it.

4. **Edge case to verify during implementation**: when regenerateRoadmap runs on a .roadmap/ dir with zero entries (last entry just deleted), confirm buildRoadmapContent([]) produces valid empty-table ROADMAP.md and does NOT trigger guardAgainstMissingRoadmapSource (guard fires only when dir is MISSING, not when dir has zero entries).

5. **CHANGELOG**: include one-line mention of validate-remote subcommand specifically under [Unreleased] — it's user-facing; cleanup-on-archive is internal plumbing.

## No Architect Revision Needed
Proceed to phase3-plan.md then Phase 4.
