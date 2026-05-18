# Phase 1 - Research / Discovery: issue-80

## Deliverable
Add a `release` call to `commands/workflow-next.md` and `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md` so that a startup-acquired folder is discarded when the subsequent Git freshness check blocks. Add a regression test to `simulate-workflow-walkthrough.js` covering the orphan scenario.

## Why
An acquired folder left behind when Git freshness blocks can block parallel workers, be auto-routed into a future session, and violate the clean-closure guarantee. The Codex skill already handles this correctly; the Claude command and GitLab skill are missing the compensating `release` call.

## Affected Area
- `commands/workflow-next.md` — lines 136-146 (`### Git Freshness Block Recovery` section): missing `release` call
- `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` — lines 129-137: correct reference implementation
- `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md` — missing `Git Freshness Block Recovery` subsection entirely
- `scripts/simulate-workflow-walkthrough.js` — no test for orphan-on-freshness-block scenario
- `scripts/kaola-workflow-claim.js` — `cmdRelease` at lines 464-474: already correct, no changes needed

## Key Patterns Found
1. `cmdRelease` alias for `release`/`discard` in `scripts/kaola-workflow-claim.js:598` — archives folder, removes worktree, clears GitHub label
2. Correct cleanup in `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md:129-137` — `node "$claim_script" release --project "$KAOLA_PROJECT" --reason git-freshness-block`
3. JSON parse pattern for extracting project from startup output (`commands/workflow-next.md:92`) — `node -e "try{process.stdout.write(JSON.parse(process.argv[1]).selected_project||'')}catch(e){}" "$STARTUP_OUT"`

## Test Patterns
- Framework: hand-rolled assert (no external framework)
- Location: `scripts/simulate-workflow-walkthrough.js`
- Structure: named `testXxx` functions, each called in sequence; `testFinalizeReleaseCleansWorktree` (lines 572-602) is the closest pattern to mirror for a new `testStartupOrphanOnFreshnessBlock` test

## Config & Env
- `KAOLA_PROJECT` — must be extracted from `$STARTUP_OUT.selected_project` in the Claude command context
- `CLAIM_JS` — already available in `commands/workflow-next.md` context
- No new env vars or feature flags needed

## External Docs
N/A — all changes are internal

## GitHub Issue
KaolaBrother/Kaola-Workflow#80

## Completeness Score
10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | internal patterns sufficient; no external library in scope |

## Notes / Future Considerations
- `cmdRelease` swallows worktree-removal errors silently (bare `catch (_) {}`). This is consistent with existing patterns and out of scope for this fix.
- The GitLab Codex skill gap (missing freshness-block cleanup) is addressed here alongside the Claude command gap.
