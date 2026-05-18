Advisor ideation gate for issue #87.

Recommendation: select the minimal helper-port approach.

Reasons:
- The GitHub implementation is already accepted as the target contract in the issue body, so matching helper behavior and names reduces review risk.
- A narrow init-only fix misses the missing-source guard and atomic ROADMAP write criteria.
- A broader persistence abstraction adds churn without new behavior and risks crossing plugin boundaries.

Watchpoints:
- Do not make refreshFromGitLab exclusive for per-issue files; refresh must update existing GitLab issue records when labels, URLs, state, or titles change.
- Make generate refuse only when the existing ROADMAP.md is GitLab-generated and contains active issue rows. User-authored roadmaps should not be blocked by this guard.
- Keep cmdInitIssue idempotent and non-fatal on duplicate issue files; output should distinguish the skipped duplicate from a created file.
- Add tests to GitLab test harness rather than relying on the GitHub harness as proxy coverage.
