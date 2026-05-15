---
name: kaola-workflow-next
description: Use when resuming, routing, or starting a Kaola-Workflow for Codex project, also called kaola-workflow, from kaola-workflow state and phase artifacts.
---

# Kaola-Workflow Next

This is the thin router. It owns startup checks, roadmap freshness, active project selection, state repair, and phase routing. It does not perform phase work directly unless it routes into the next skill.

## Goal Contract

Continue until the selected workflow phase objective is satisfied, evidence is
recorded, and `workflow-state.md` points to the correct `next_skill`. Do not
stop after routine substeps. Stop only for true external authorization,
destructive or risky Git operations, materially user-owned choices, or ambiguity
that blocks correctness.

## Autonomy Policy

Treat nonessential workflow bookkeeping as autonomous: generated project names,
collision suffixes such as `-2`, cache/artifact paths, and harmless ordering
choices are selected automatically and recorded. For essential technical
decisions, consult the strongest available expert model/profile for the session,
apply the chosen answer directly, and record it under `.cache/` or the phase
artifact.

## Startup

Bootstrap the claim lease for this session:

```bash
claim_script="plugins/kaola-workflow/scripts/kaola-workflow-claim.js"
if [ ! -f "$claim_script" ]; then
  claim_script="$(find "$HOME/.codex/plugins/cache" -path '*/kaola-workflow/*/scripts/kaola-workflow-claim.js' -print -quit 2>/dev/null)"
fi

if [ -f "$claim_script" ] && [ -n "${KAOLA_SESSION_ID:-}" ]; then
  KAOLA_SINK_FLAG=""
  [ -n "${KAOLA_SINK:-}" ] && KAOLA_SINK_FLAG="--sink $KAOLA_SINK"
  node "$claim_script" bootstrap \
    --session "$KAOLA_SESSION_ID" \
    --runtime codex \
    $KAOLA_SINK_FLAG 2>/dev/null || true
fi
```

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

Keep `kaola-workflow/ROADMAP.md` as a compact mirror of active unfinished work.

## Routing

Read `kaola-workflow/{project}/workflow-state.md` first. If missing or stale, run:

```bash
repair_script="plugins/kaola-workflow/scripts/kaola-workflow-repair-state.js"
if [ ! -f "$repair_script" ]; then
  repair_script="$(find "$HOME/.codex/plugins/cache" -path '*/kaola-workflow/*/scripts/kaola-workflow-repair-state.js' -print -quit 2>/dev/null)"
fi
test -f "$repair_script"
node "$repair_script" {project-or-empty}
```

Use the repaired state only when it identifies exactly one safe `next_skill`.
If there is one unambiguous open GitHub issue and no active project, select it
without asking the user to confirm the generated workflow folder name.

Manual reconstruction order:

```text
phase6-summary.md exists -> workflow complete
phase5-review.md exists -> kaola-workflow-finalize
phase4-progress.md exists:
  open tasks -> kaola-workflow-execute
  all complete -> kaola-workflow-review
phase3-plan.md exists -> kaola-workflow-execute
phase2-ideation.md exists -> kaola-workflow-plan
phase1-research.md exists -> kaola-workflow-ideation
no phase file -> kaola-workflow-research
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
