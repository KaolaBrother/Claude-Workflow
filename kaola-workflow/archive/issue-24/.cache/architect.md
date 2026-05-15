# Architect Blueprint - issue-24

## Architecture

Add `startup` to the existing claim script instead of introducing a new package entrypoint. The claim script already owns locks, sessions, sweep, watch-pr, classifier, GitHub claim comments, and bootstrap, so adding startup there avoids duplicate orchestration.

## Interfaces

- `kaola-workflow-claim.js startup --session <id> --runtime claude|codex [--sink merge|pr]`
- Writes `kaola-workflow/.sessions/{session}.startup.json`
- Emits JSON with `project`, `issue`, `verdict`, `session`, `startup_completed`, `issue_sync`, `roadmap_sync`, `claim`, `skipped`, and `blocked`.

## Data Flow

1. Resolve session id.
2. Fetch online open issues as records.
3. Sync records into `.roadmap`.
4. Regenerate `ROADMAP.md`.
5. Run sweep and watch-pr.
6. Detect owned active project.
7. Sort candidates by `workflow:queued`, then issue number.
8. Classify and claim candidates until one succeeds.
9. Write startup receipt.
10. Return structured JSON.

## Files

- `scripts/kaola-workflow-claim.js`
- `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
- `commands/workflow-next.md`
- `commands/kaola-workflow-phase*.md`
- `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md`
- `plugins/kaola-workflow/skills/kaola-workflow-{research,ideation,plan,execute,review,finalize}/SKILL.md`
- `scripts/simulate-workflow-walkthrough.js`
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- `scripts/validate-workflow-contracts.js`
- `scripts/validate-kaola-workflow-contracts.js`

## Test Strategy

- Add focused startup receipt/sync tests to root walkthrough.
- Mirror the startup tests in packaged Codex walkthrough.
- Contract validators require `cmdStartup`, receipt markers, `startup` prompt usage, and phase receipt guard text.
- Run `npm test` and `git diff --check`.
