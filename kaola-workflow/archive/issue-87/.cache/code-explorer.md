Issue #87 local research.

Relevant source behavior:
- scripts/kaola-workflow-roadmap.js has guardAgainstMissingRoadmapSource(), isGeneratedRoadmap(), parseRoadmapTable(), writeFileAtomicReplace(), and createFileExclusive().
- scripts/simulate-workflow-walkthrough.js covers missing-source guard, atomic generate temp cleanup, and concurrent init-issue exclusivity.

GitLab gaps:
- plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-roadmap.js writes ROADMAP.md via writeIfDiff(), which is direct fs.writeFileSync().
- GitLab writeIssueRecord() also uses writeIfDiff() for per-issue source files.
- cmdInitIssue() always prints created even when an existing issue source was rewritten or unchanged.
- Existing GitLab tests only cover refreshFromGitLab happy path and do not assert missing-source guard, atomic write helper usage, or concurrent init-issue behavior.

Recommended patch:
- Port GitHub roadmap guard and atomic helper names to the GitLab roadmap script.
- Keep refreshFromGitLab update semantics for remote refresh, but make explicit init-issue exclusive by default.
- Add GitLab tests that mirror the GitHub coverage in test-gitlab-workflow-scripts.js.
