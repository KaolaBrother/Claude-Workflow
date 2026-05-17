docs-lookup: N/A - internal patterns sufficient

This is a pure internal refactor of `scripts/kaola-workflow-claim.js`. All patterns are
Node.js built-ins (`node:fs`, `node:path`, `node:child_process`, `node:crypto`, `node:os`)
with no external library dependencies. The git worktree operations (`git worktree add`,
`git worktree list --porcelain`, `git worktree remove`) use standard CLI and their behavior
is already implemented and tested in the codebase (`provisionWorktree()`, `removeWorktree()`).
No external docs required.
