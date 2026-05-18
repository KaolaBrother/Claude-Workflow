Planner notes for issue #87.

Candidate strategies:
1. Port GitHub roadmap helpers to GitLab with minimal GitLab-specific adjustments.
2. Patch only cmdInitIssue() to use exclusive creation and leave generate/refresh direct writes unchanged.
3. Refactor GitLab roadmap script around a generalized read/write persistence layer.

Recommendation: choose strategy 1. It directly satisfies all acceptance criteria, keeps names aligned with the existing GitHub validator vocabulary, and avoids speculative abstraction.

Implementation outline:
- Add isGeneratedRoadmap(), parseRoadmapTable(), guardAgainstMissingRoadmapSource(), writeFileAtomicReplace(), and createFileExclusive() to the GitLab roadmap script.
- Route cmdGenerate() and refreshFromGitLab() generated ROADMAP writes through writeFileAtomicReplace().
- Keep refreshFromGitLab issue source writes update-capable, because remote refresh should be able to update labels, URLs, and status.
- Change cmdInitIssue() to use createFileExclusive() by default, support explicit --update, and print created, skip, or updated accurately.
- Add GitLab tests mirroring the three GitHub roadmap regressions.
