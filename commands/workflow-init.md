---
description: Initialize a project for Claude Workflow with CLAUDE.md guidance, roadmap tracking, docs structure, and Git/GitHub issue conventions.
argument-hint: (optional project context)
---

# Workflow Init

Prepare the current project for repeated `/claude-workflow` implementation cycles.

This command is a bootstrapper. It should preserve existing project instructions and docs, add only missing workflow guidance, and avoid replacing user-authored content.

## Inputs

Use `$ARGUMENTS` as optional project context.

Prefer the local Karpathy skills source when available:

1. `/Volumes/WorkspaceA/ylminiserver/workspace/andrej-karpathy-skills/skills/karpathy-guidelines/SKILL.md`
2. `../andrej-karpathy-skills/skills/karpathy-guidelines/SKILL.md`

If neither exists, use the concise fallback in this command.

---

## Step 1 — Scan Project State

Inspect the project root:

```bash
pwd
test -f CLAUDE.md && echo "CLAUDE.md exists" || echo "CLAUDE.md missing"
git rev-parse --is-inside-work-tree
git status --short --branch
git remote -v
test -d claude-workflow && find claude-workflow -maxdepth 3 -type f | sort
find docs -maxdepth 3 -type f 2>/dev/null | sort
```

If this is not a Git repository, ask before running `git init`. If it is a Git repository without a remote, record that GitHub issue sync is pending until a GitHub remote exists.

If `gh` is available and a GitHub repo can be inferred from `origin`, inspect open issues:

```bash
gh issue list --limit 100
```

If `gh` is unavailable or unauthenticated, continue and note that GitHub roadmap sync is pending.

---

## Step 2 — Create Missing Workflow Structure

Create only missing directories/files. Do not overwrite existing content.

Required structure:

```text
claude-workflow/
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

Use these initial file bodies when a file is missing.

### `claude-workflow/ROADMAP.md`

```markdown
# Claude Workflow Roadmap

This file mirrors active unfinished work. GitHub issues are the source of truth when available.

## Active Work

| Issue | Title | Status | Workflow Project | Next Step |
|-------|-------|--------|------------------|-----------|
| none | Initialize roadmap | open | none | Link GitHub issues or add active work |

## Rules

- A separate roadmap/research session owns discovering and adding future work to GitHub issues.
- `/claude-workflow` fetches GitHub issues, mirrors active implementation work here, and advances one item per cycle.
- After each `/claude-workflow` cycle, refresh this file from issue state.
- Move completed workflow project folders to `claude-workflow/archive/`.
- Close linked GitHub issues only after acceptance criteria pass.
```

### `docs/README.md`

```markdown
# Documentation Index

- [Architecture](architecture.md)
- [API](api.md)
- [Conventions](conventions.md)
- [Decisions](decisions/)
- [Changelog](../CHANGELOG.md)
```

### `docs/architecture.md`

```markdown
# Architecture

Document system boundaries, major components, data flow, and deployment shape.
```

### `docs/api.md`

```markdown
# API

Document public APIs, endpoints, schemas, events, and integration contracts.
```

### `docs/conventions.md`

```markdown
# Conventions

Document coding style, testing rules, Git practices, naming, and review expectations.
```

### `CHANGELOG.md`

```markdown
# Changelog

## Unreleased

- Initialized Claude Workflow documentation structure.
```

---

## Step 3 — Update `CLAUDE.md`

Create `CLAUDE.md` if missing. If it exists, preserve all existing content.

Append the following sections only when equivalent related content is missing. Treat headings with the same meaning as equivalent; do not duplicate.

```markdown
## Karpathy-Style Working Principles

- Think before coding: state assumptions, surface ambiguity, and ask when unclear.
- Keep it simple: solve the requested problem without speculative abstractions.
- Make surgical changes: touch only what the task requires.
- Work toward verifiable goals: define success criteria and verify before claiming done.

## Claude Workflow Orchestration

- The main session is the orchestrator for `/claude-workflow`.
- Keep phase work scoped, resumable, and recorded under `claude-workflow/`.
- Delegate phase-specific work to ECC agents when useful, while the main session owns integration and final decisions.
- Use the unqualified ECC agent name when available; otherwise use the `everything-claude-code:` prefix.

## Roadmap And Issues

- Use GitHub issues as the roadmap source of truth when a GitHub remote is configured.
- A separate roadmap/research session may discover future work and create or refine GitHub issues.
- `/claude-workflow` fetches issues, selects implementation work, mirrors active state in `claude-workflow/ROADMAP.md`, and advances the project one cycle at a time.
- After each `/claude-workflow` cycle, refresh the roadmap, archive completed workflow folders, and close or comment on linked issues according to acceptance status.
- Leave only active unfinished work in `claude-workflow/ROADMAP.md`.

## Documentation Map

- `README.md` — project overview and usage.
- `CHANGELOG.md` — user-visible changes.
- `docs/README.md` — documentation index.
- `docs/architecture.md` — system structure and data flow.
- `docs/api.md` — APIs, schemas, events, and external contracts.
- `docs/conventions.md` — coding, testing, Git, and review rules.
- `docs/decisions/` — architecture decision records.
```

Keep the Karpathy section concise. If the local Karpathy skill file is available, use it only to confirm these four principles; do not paste the long source into `CLAUDE.md`.

---

## Step 4 — Git And Roadmap Summary

After edits:

1. Run `git status --short --branch`.
2. Summarize:
   - whether Git is initialized
   - whether a GitHub remote exists
   - whether `CLAUDE.md` was created or updated
   - which docs/roadmap files were created
   - whether GitHub issues were available for sync
3. Do not commit unless the user explicitly asks.

End with the next useful command:

```text
/claude-workflow
```
