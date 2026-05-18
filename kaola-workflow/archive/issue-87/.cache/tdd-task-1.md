Task 1: GitLab roadmap regression tests.

RED:
- Command: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`
- Result: failed as expected.
- Failure: `GitLab generate should refuse to erase active generated roadmap when .roadmap is missing`, actual status 0 instead of 1.

GREEN:
- Command: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`
- Result: passed after implementation.
- Output: `GitLab workflow script tests passed`

Coverage added:
- Missing `.roadmap` guard preserves non-empty GitLab-generated ROADMAP.md.
- Atomic generate leaves no `.ROADMAP.md.*.tmp` files.
- Concurrent default `init-issue` creates one file and skips the race loser.
- Duplicate default `init-issue` skips without rewriting.
- Explicit `init-issue --update` reports updated and rewrites the source.
