# Docs Lookup Notes: issue-76

External lookup was required for the upstream source and license.

- Upstream repository: `affaan-m/everything-claude-code`
- Default branch: `main`
- License: MIT License
- Pinned source commit selected for vendoring: `922d2d8f8b64f4e50936e24465cb3bcac81ac0e1`
- Upstream `agents/` contains all required `.md` files:
  - `code-explorer.md`
  - `docs-lookup.md`
  - `planner.md`
  - `code-architect.md`
  - `tdd-guide.md`
  - `build-error-resolver.md`
  - `code-reviewer.md`
  - `security-reviewer.md`
  - `doc-updater.md`

Agent files use YAML front matter at the top of each file. Vendored attribution must be inserted after the closing front matter delimiter so Claude Code can still parse the agent metadata.
