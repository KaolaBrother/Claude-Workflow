# Advisor Output — Issue #136 Ideation

## Verdict
Approach A + thin C is the right call. The timing insight (gate on statusValue === 'closed', NOT issueIsClosed()) is the key correctness point and should not be revisited.

## Closed Decisions (commit now, don't revisit in Phase 3)

1. **Shell-out vs require**: Use require() + add module.exports to kaola-workflow-roadmap.js.
   Reasons: testable in-process, no subprocess overhead, no PATH/cwd ambiguity.
   Add `module.exports = { cmdGenerate, ... }` at bottom, guarded by require.main check.

2. **One PR, not two phases**: Ship A + validate-remote together. Issue has 4 ACs; AC #2 explicitly requires the validation. Splitting is not warranted.

3. **Include live data fix in the same commit**: delete `kaola-workflow/.roadmap/issue-133.md` and regenerate ROADMAP.md. It's the concrete bug instance cited in Evidence.

## Required Constraints for Phase 3/4

- **Cross-worktree fidelity**: regression test MUST exercise keep-worktree (linked worktree) finalize path, not just a flat temp repo. Deletion must land on feature branch tree.
- **statusValue gate**: re-state explicitly in phase2 so Phase 4 doesn't drift back to remote-state gating.
- **validate-remote OFFLINE**: must short-circuit and report "skipped: offline" — NOT silently pass.
- **cmdRelease exclusion is intentional**: document rationale (abandoned ≠ closed; issue stays open) so future reviewer doesn't "fix" it.

## Non-blocking
roadmap.js has no module.exports — add at bottom guarded by require.main check. Standard Node pattern.
