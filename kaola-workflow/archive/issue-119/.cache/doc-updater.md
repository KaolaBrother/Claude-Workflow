# Doc-Updater Output — issue-119

## Changes Made

### CHANGELOG.md
Added entry under `### Fixed` in `[Unreleased]`:
- Gitea and GitLab PR/MR sink offline parity: both sinks now honor KAOLA_WORKFLOW_OFFLINE=1, writes OFFLINE_PLACEHOLDER values, creates local metadata commit, skips push and forge calls; --merge flag is a no-op when offline. References issue #119.

### docs/api.md (3 targeted updates)
1. PR Sink script list: added `kaola-gitea-workflow-sink-pr.js` (Gitea) alongside GitHub and GitLab entries
2. PR Sink offline support note: updated to mention GitHub, GitLab, and Gitea editions
3. KAOLA_WORKFLOW_OFFLINE env var: changed "both editions" to "all three editions (GitHub, GitLab, Gitea)"

## Files Not Changed (no impact)
- README.md
- .env.example
- docs/architecture.md
- docs/conventions.md
