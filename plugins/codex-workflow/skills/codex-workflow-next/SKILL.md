---
name: codex-workflow-next
description: Use when resuming, routing, or starting a Claude-Workflow for Codex project, also called claude-workflow, from codex-workflow state and phase artifacts.
---

# Codex Workflow Next

This is the thin router. It owns startup checks, roadmap freshness, active project selection, state repair, and phase routing. It does not perform phase work directly unless it routes into the next skill.

## Startup

Classify local and remote Git state:

```bash
git rev-parse --is-inside-work-tree
git status --short --branch
git remote -v
git rev-parse --abbrev-ref --symbolic-full-name @{u}
git fetch --prune
git status --short --branch
git rev-list --left-right --count @{u}...HEAD
```

Fast-forward only when clean and behind-only. Stop before merge, rebase, stash, reset, conflict resolution, or dirty-worktree sync.

If GitHub is available, refresh open issues:

```bash
gh issue list --limit 100 --json number,title,state,labels,assignees,updatedAt,url
```

Keep `codex-workflow/ROADMAP.md` as a compact mirror of active unfinished work.

## Routing

Read `codex-workflow/{project}/workflow-state.md` first. If missing or stale, run:

```bash
repair_script="plugins/codex-workflow/scripts/codex-workflow-repair-state.js"
if [ ! -f "$repair_script" ]; then
  repair_script="$(find "$HOME/.codex/plugins/cache" -path '*/codex-workflow/*/scripts/codex-workflow-repair-state.js' -print -quit 2>/dev/null)"
fi
test -f "$repair_script"
node "$repair_script" {project-or-empty}
```

Use the repaired state only when it identifies exactly one safe `next_skill`.

Manual reconstruction order:

```text
phase6-summary.md exists -> workflow complete
phase5-review.md exists -> codex-workflow-finalize
phase4-progress.md exists:
  open tasks -> codex-workflow-execute
  all complete -> codex-workflow-review
phase3-plan.md exists -> codex-workflow-execute
phase2-ideation.md exists -> codex-workflow-plan
phase1-research.md exists -> codex-workflow-ideation
no phase file -> codex-workflow-research
```

## Required Output

Before continuing or stopping, print:

```text
Workflow project: {project}
Current phase: {phase or unknown}
Current step: {step}
Pending gates: {list or none}
Next skill: {next_skill}
```
