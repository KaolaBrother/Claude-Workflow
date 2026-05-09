---
description: Claude Workflow Phase 2. Ideation and strategy selection grounded in Phase 1 facts.
argument-hint: <project name>
---

# Claude Workflow Phase 2 - Ideation

Phase 2 compares approaches and records the selected strategy. It does not write
implementation code or reopen broad research unless Phase 1 facts are missing.

## Prerequisite

`claude-workflow/{project}/phase1-research.md` must exist. If missing, stop:

```text
Phase 1 is not complete. Run /claude-workflow-phase1 first.
```

Read:

```text
claude-workflow/{project}/workflow-state.md
claude-workflow/{project}/phase1-research.md
claude-workflow/{project}/.cache/code-explorer.md
claude-workflow/{project}/.cache/docs-lookup.md
```

## Resume Detection

If `phase2-ideation.md` exists and all `Required Agent Compliance` rows are
complete, route to:

```text
/claude-workflow-phase3 {project}
```

Otherwise detect the step:

- `.cache/planner.md` missing -> `planner`
- `.cache/advisor-ideation.md` missing -> `advisor-gate`
- selected approach missing -> `user-selection`
- phase file missing -> `write-phase-file`

Update `workflow-state.md` before continuing.

## Hard Gates

- Do not invent facts missing from Phase 1.
- If a required fact is missing, stop and return to Phase 1 with a focused
  `code-explorer` or `docs-lookup` request.
- Use `planner` for deep approach analysis.
- Save advisor output to `.cache/advisor-ideation.md`; do not keep it only in
  conversation memory.
- Wait for user selection before writing the final Phase 2 file.

## Step 1 - Planner

Update state:

```text
phase: 2
phase_name: Ideation
step: planner
next_command: /claude-workflow-phase2 {project}
main_session_role: orchestrator
implementation_owner: N/A
fix_owner: planner for missing strategy analysis
inline_emergency_fallback_authorized: no
```

Invoke ECC `planner` with relevant Phase 1 excerpts only. Ask for:

- 2-3 implementation approaches
- pros, cons, risks, complexity
- architectural fit
- recommended option with rationale
- explicit items not to build
- missing facts if any

Write raw output to:

```text
claude-workflow/{project}/.cache/planner.md
```

## Step 2 - Advisor Gate

Consult the configured Claude Code advisor. If unavailable, stop and tell the
user to enable an Opus advisor before continuing.

Ask the advisor:

- Any missed approaches?
- Are risks accurate?
- Is the recommendation sound?
- Any gotchas that should change the decision?

Write the advisor response to:

```text
claude-workflow/{project}/.cache/advisor-ideation.md
```

## Step 3 - User Selection

Present refined options concisely. Wait for the user to select one. Do not write
`phase2-ideation.md` until the user confirms.

## Step 4 - Write Phase File

Create `claude-workflow/{project}/phase2-ideation.md`:

```markdown
# Phase 2 - Ideation: {project}

## Approaches Evaluated

### Option A: [Name]
- Summary: ...
- Pros: ...
- Cons: ...
- Risk: High/Medium/Low
- Complexity: Small/Medium/Large/XL

### Option B: [Name]
...

## Advisor Findings
[summary of .cache/advisor-ideation.md]

## Selected Approach
[name + reason]

## Out of Scope (explicit)
[what will not be built]

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
```

Update `workflow-state.md`:

```text
phase: 2
step: complete
next_command: /claude-workflow-phase3 {project}
```
