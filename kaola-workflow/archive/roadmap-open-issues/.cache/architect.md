Local code-architect fallback.

Blueprint:
1. Runtime fixes:
   - scripts/kaola-workflow-claim.js: create durable state when missing; preserve claim marker during heartbeat PATCH; avoid remote cleanup on tiebreaker yield; expose remote claim checks during classification/bootstrap.
   - scripts/kaola-workflow-classifier.js: classify online issues with active workflow claim markers or workflow:in-progress label as blocked.
   - scripts/kaola-workflow-sink-merge.js: assert clean worktree and checkout requested branch before merge-base/rebase.
2. Packaging:
   - Copy shared parallel scripts into plugins/kaola-workflow/scripts/.
   - Update Codex validation and simulation to require and use plugin-local scripts.
3. Docs/contracts:
   - commands/kaola-workflow-phase6.md and Codex finalize skill: add explicit commit gate before sink dispatch.
   - Contract tests assert commit gate appears before sink dispatch.
4. Regression tests:
   - Extend scripts/simulate-workflow-walkthrough.js for issues #14, #15, #17, #18, #19, #20, #21.
   - Keep existing tests passing.
