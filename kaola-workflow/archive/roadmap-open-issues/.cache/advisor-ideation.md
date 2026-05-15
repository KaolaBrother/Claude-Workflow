Advisor gate performed locally because no explicit subagent delegation was requested in this session.

Recommendation:
- Use the umbrella project approach.
- Prioritize runtime correctness first: claim state durability, heartbeat sentinel preservation, tiebreaker cleanup, remote-claim classification, sink branch checkout.
- Add regression coverage in existing simulation and contract scripts so acceptance is checked by the normal validation commands.
- Package plugin-local copies of shared scripts after root script edits to avoid installed Codex plugin drift.

Hidden risks:
- Duplicate root and plugin scripts can drift; final validation must assert plugin-local script presence and make the Codex simulation use plugin-local paths.
- Dirty worktree guards in sink-merge must not break OFFLINE tests that intentionally start on main.
- Phase 6 commit-before-sink requirements must be order-checked, not just mentioned.
