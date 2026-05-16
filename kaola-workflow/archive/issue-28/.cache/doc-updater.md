# Doc-Updater Output — issue-28

## Files Modified
- README.md line 291: added `project-name` to roadmap.js subcommand list
- CHANGELOG.md: added v3.1.10 entry (Fixed, Added, Tests sections)

## Items Requiring No Update
- .env.example: no new env vars
- Architecture docs: no structural change
- Inline comments: functions well-named, no new public interface comment gaps

## CHANGELOG Entry Summary
v3.1.10 - 2026-05-16:
- Fixed: branch name duplication (workflow/issue-N-issue-N → workflow/issue-N or workflow/issue-N-<slug>)
- Fixed: field() regex cross-line bleed on blank values
- Fixed: projectNameForIssue ENOENT-aware error handling
- Added: project-name subcommand to kaola-workflow-roadmap.js
- Added: buildSinkBranchName defensive helper
- Refactor: pickFirstActionableIssue DRY collapse
- Tests: Epic 5G, 5H, 7G/7A regressions
