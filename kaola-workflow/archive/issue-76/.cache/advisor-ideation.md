# Advisor Ideation Gate: issue-76

Option C is the best fit. The hidden risk is file ownership: a vendored agent may later be user-edited in `~/.claude/agents`. The install path must avoid marker-only overwrites and should record hashes for managed installs. YAML front matter placement is also critical; attribution before the opening `---` could break Claude Code agent parsing.

Additional recommendation: update `package.json.files` because this repo uses an explicit package file allowlist.
