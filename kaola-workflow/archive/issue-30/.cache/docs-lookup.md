docs-lookup: N/A - internal patterns sufficient

Rationale: Issue #30 uses only built-in git plumbing commands (`git worktree add/remove/prune`,
`git rev-parse --git-common-dir`) and Node.js fs APIs. All behavior is well-specified in the
issue itself (decisions locked, §3–§6) and confirmed by the code-explorer findings.
No external library, framework, or third-party API behavior is ambiguous here.
