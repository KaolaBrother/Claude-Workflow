---
name: codex-workflow-init
description: Use when setting up a project for the private Codex workflow or refreshing its Codex-specific guidance, roadmap, and documentation scaffold.
---

# Codex Workflow Init

Bootstrap the current repo for repeated private Codex workflow cycles. Preserve existing project guidance and add only missing Codex-specific structure.

## Required Behavior

1. Read applicable `AGENTS.md` files first.
2. Inspect project state:

```bash
pwd
git rev-parse --is-inside-work-tree
git status --short --branch
git remote -v
test -d codex-workflow && find codex-workflow -maxdepth 3 -type f | sort
find docs -maxdepth 3 -type f 2>/dev/null | sort
```

3. Create or update `AGENTS.md` only when needed. Preserve user-authored content.
4. Do not create or edit CLAUDE.md.
5. Create only missing scaffold files:

```text
codex-workflow/
  ROADMAP.md
  archive/
docs/
  README.md
  architecture.md
  api.md
  conventions.md
  decisions/
CHANGELOG.md
```

6. Do not create `codex-workflow/{project}/workflow-state.md` during init. State belongs to an active workflow project.

## `AGENTS.md` Addendum

Add a concise `## Codex Workflow` section if none exists:

- Use `codex-workflow-next` as the router for active workflow projects.
- Store active workflow artifacts under `codex-workflow/{project}/`.
- Keep `workflow-state.md` current during active work.
- Use GitHub issues as source of truth when available; keep `codex-workflow/ROADMAP.md` as the local active-work mirror.
- Preserve user changes and avoid destructive Git operations without explicit approval.
- Verify relevant tests before claiming completion.

## Initial Roadmap Body

```markdown
# Codex Workflow Roadmap

This file mirrors active unfinished work. GitHub issues are the source of truth when available.

## Active Work

| Issue | Title | Status | Workflow Project | Next Step |
|-------|-------|--------|------------------|-----------|
| none | Initialize roadmap | open | none | Link GitHub issues or add active work |
```
