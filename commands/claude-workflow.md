---
description: 6-phase Claude-native development workflow with per-phase file artifacts. Fully resumable across sessions and context resets. All files kept in the project directory.
argument-hint: (no argument needed)
---

# Claude Workflow — Native Multi-Model Orchestration

6-phase workflow: Research → Ideation → Plan → Execute → Review → Finalize.

All phase outputs are written to `claude-workflow/{project-name}/` in the **project root**. Every phase begins by reading the previous phase's file. If that file is missing, the previous phase did not complete — stop and finish it first.

The project name is auto-generated from Phase 1 findings and confirmed with the user before any files are written.

**Model strategy:**
- **Main session (Sonnet)** — orchestrator and implementer
- **`planner` (Opus)** — approach analysis in Phase 2
- **`code-architect` (Sonnet)** — blueprint in Phase 3
- **`tdd-guide` (Sonnet)** — test-first enforcement per task in Phase 4
- **`code-reviewer` (Sonnet)** — quality review in Phase 5
- **`security-reviewer` (Sonnet)** — conditional on security-sensitive files in Phase 5
- **Claude Code advisor (Opus)** — Phase 2 gate and Phase 3 gate only; conditional in Phase 5

When invoking ECC agents, use the unqualified name if available (for example, `planner`). If ECC is installed only as a Claude Code plugin and agents are listed with a namespace, use the plugin-qualified form instead (for example, `everything-claude-code:planner`).

---

## Startup — Detect Mode

### Step 1 — Sync Roadmap From GitHub Issues

GitHub issues are the source-of-truth roadmap when a GitHub remote is configured. A separate roadmap/research session may create and refine those issues. This workflow consumes that roadmap and advances one implementation item per cycle.

Before selecting work:

1. Detect whether the current directory is a Git repository.
2. Detect the GitHub remote (`origin` preferred).
3. If `gh` is available and authenticated, fetch open issues:
   ```bash
   gh issue list --limit 100 --json number,title,state,labels,assignees,updatedAt,url
   ```
4. Ensure `claude-workflow/ROADMAP.md` exists. If it does not, create it with active work rows from open GitHub issues or a note that GitHub sync is unavailable.
5. Update `claude-workflow/ROADMAP.md` as a local mirror of active unfinished work:
   - include open GitHub issues relevant to implementation
   - keep only active unfinished work
   - preserve manual local notes under a clearly marked `Local Notes` section
6. If GitHub issues cannot be fetched, continue from the existing local roadmap and tell the user why GitHub sync was skipped.

When starting new work, prefer selecting from open GitHub issues. If the user provides a free-form task, ask whether to create/link a GitHub issue before Phase 1 when a GitHub remote is available.

### Step 2 — Scan for existing workflow projects

Check if `claude-workflow/` exists in the project root. If it does, list all subdirectories that contain at least one phase file (`phase*.md`). Skip subdirectories with no phase files — these are incomplete Phase 1 attempts; treat them as if they don't exist.

```
Existing workflow projects:
  1. user-auth          (phase3-plan.md — last completed: Plan)
  2. payment-flow       (phase6-summary.md — COMPLETE)
  3. notification-system (phase4-progress.md — last completed: Execute, tasks 4/7)

Resume an existing project? Enter number, or press Enter to start a new one.
```

### Step 3a — Resuming an existing project

If user selects an existing project, set `{project-name}` to that directory name. Detect resume point:

```
phase6-summary.md  exists → workflow is COMPLETE. Show summary and stop.
phase5-review.md   exists → resume at Phase 6
phase4-progress.md exists → check for pending tasks:
                             if tasks remain   → resume mid-Phase 4
                             if all complete   → resume at Phase 5
phase3-plan.md     exists → resume at Phase 4
phase2-ideation.md exists → resume at Phase 3
phase1-research.md exists → resume at Phase 2
```

Read all existing phase files as context before proceeding. Tell the user: "Resuming {project-name} at Phase N."

### Step 3b — Starting a new project

Show active roadmap items from `claude-workflow/ROADMAP.md` and fetched GitHub issues, then ask what to implement:

```
What do you want to implement?
Enter a GitHub issue number, choose a roadmap item, or describe a new task.
```

Wait for the user's description. Proceed to Phase 1 with that description as the requirement.

The project name is determined at the END of Phase 1 — not before.

---

## Phase 1 — RESEARCH

**Prerequisite:** none

`[Mode: Research]`

### 1.1 Requirement Parsing

From the user's build description (collected at startup, or `$ARGUMENTS` if provided directly), extract:
- **What** — concrete deliverable
- **Why** — user value
- **Where** — which part of the codebase
- **Success criteria** — how to know it's done

If the description references a GitHub issue (e.g. `#123`, a full GitHub issue URL, or explicit mention), extract the issue number and repository (`owner/repo`). If the repo cannot be inferred from context, ask the user. Record this in phase1-research.md — it will be used in Phase 6 to close the issue.

If any of the above are unclear, stop and ask before continuing.

### 1.2 Codebase Exploration

Using Read, Grep, Glob:
1. Similar existing implementations to mirror
2. Naming and file organization conventions
3. Error handling patterns in the affected area
4. Test file locations, framework, and structure
5. Relevant config, env vars, feature flags

### 1.3 Completeness Gate

Score 0–10:
- Goal clarity (0–3) · Expected outcome (0–3) · Scope boundaries (0–2) · Constraints (0–2)

**≥ 7** → continue. **< 7** → stop, ask clarifying questions, do not proceed.

### 1.4 Name the Project

From the deliverable and affected area discovered in Phase 1, generate a short kebab-case project name:

Rules:
- 2–4 words max (e.g. `user-auth`, `payment-webhook`, `notification-system`)
- Describes what is being built, not the technology
- Lowercase, hyphens only, no numbers unless meaningful

Before proposing: check if `claude-workflow/{generated-name}/` already exists in the project root. If it does, propose `{generated-name}-2` and note that a prior project with that name exists.

Propose the name to the user:

```
Proposed project name: {generated-name}
All workflow files will be saved to: claude-workflow/{generated-name}/

Confirm? (yes / rename to: ...)
```

Wait for confirmation. If user renames, use their name. Once confirmed, create the directory:
```
claude-workflow/{project-name}/
```

### 1.5 Write Phase File

Create `claude-workflow/{project-name}/phase1-research.md`:

```markdown
# Phase 1 — Research: {project-name}

## Deliverable
[what]

## Why
[user value]

## Affected Area
[files/modules]

## Key Patterns Found
1. [pattern + file:line]
2. [pattern + file:line]
3. [pattern + file:line]

## Test Patterns
- Framework: [e.g. Jest, pytest]
- Location: [e.g. src/__tests__/]
- Structure: [e.g. describe/it, AAA]

## Config & Env
[relevant env vars, flags, config files]

## GitHub Issue
[owner/repo#number — or "none"]

## Completeness Score
[X/10]

## Notes / Future Considerations
[deferred questions or observations — empty if none]
```

Confirm with user before Phase 2.

---

## Phase 2 — IDEATION

**Prerequisite:** `phase1-research.md` must exist. If missing → stop: "Phase 1 is not complete. Run Phase 1 first."

Read `phase1-research.md` fully before proceeding.

`[Mode: Ideation]`

### 2.1 Deep Approach Analysis

Invoke the **`planner` (Opus)** ECC subagent:

Provide the full contents of `phase1-research.md` as context.

Task: Produce 2–3 implementation approaches. For each: summary, pros, cons, risks, complexity (Small/Medium/Large/XL), and architectural fit. Recommend one with justification. Flag anything that should explicitly NOT be built.

After planner returns, write its raw output to `claude-workflow/{project-name}/.cache/planner.md` before proceeding. This preserves planner output across context resets.

### 2.2 Advisor Gate

Consult the configured Claude Code advisor — full conversation context includes planner output automatically. If advisor is unavailable, stop and tell the user to enable an Opus advisor before continuing.

Ask:
- Any missed approaches?
- Are risk assessments accurate?
- Is the recommendation sound?
- Any gotchas that should change the decision?

Incorporate feedback into the synthesis.

### 2.3 User Selection

Present refined options. Wait for user to select. Do not proceed without confirmation.

### 2.4 Write Phase File

Create `claude-workflow/{project-name}/phase2-ideation.md`:

```markdown
# Phase 2 — Ideation: {project-name}

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
[key points raised by advisor]

## Selected Approach
[name + reason for selection]

## Out of Scope (explicit)
[what will NOT be built]
```

---

## Phase 3 — PLAN

**Prerequisite:** `phase2-ideation.md` must exist. If missing → stop: "Phase 2 is not complete. Run Phase 2 first."

Read `phase1-research.md` and `phase2-ideation.md` fully before proceeding.

`[Mode: Plan]`

### 3.1 Blueprint Generation

Invoke the **`code-architect` (Sonnet)** ECC subagent:

Provide full contents of both phase files as context.

Task: Produce a complete implementation blueprint:
- Files to create: path, purpose, key interfaces
- Files to modify: path, specific changes, why
- Build sequence ordered by dependency
- Required imports and external dependencies
- Test file locations following Phase 1 patterns
- Explicit out-of-scope items

After code-architect returns, write its raw output to `claude-workflow/{project-name}/.cache/architect.md` before proceeding. This preserves the blueprint across context resets.

### 3.2 Advisor Gate

Consult the configured Claude Code advisor:
- Is the build sequence dependency-safe?
- Missing files or integration points?
- Could a developer implement this from the plan alone without searching the codebase?
- Edge cases or error paths not covered?

If gaps found, revise blueprint before continuing.

### 3.3 Write Phase File

Create `claude-workflow/{project-name}/phase3-plan.md`:

```markdown
# Phase 3 — Plan: {project-name}

## Blueprint

### Files to Create
| File | Purpose | Key Interfaces |
|------|---------|----------------|
| path/to/file | ... | ... |

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| path/to/file | ... | ... |

### Build Sequence
1. [step — dependency reason]
2. ...

### External Dependencies
[packages/imports needed]

## Task List

### Task 1: [Name]
- File: path/to/file
- Test File: path/to/test-file
- Action: CREATE | MODIFY
- Implement: [specific logic]
- Mirror: [pattern from phase1-research.md]
- Validate: [how to verify]

### Task 2: [Name]
...

## Advisor Notes
[key points raised]
```

Confirm with user before Phase 4.

---

## Phase 4 — EXECUTE

**Prerequisite:** `phase3-plan.md` must exist. If missing → stop: "Phase 3 is not complete. Run Phase 3 first."

Read `phase1-research.md` and `phase3-plan.md` fully before proceeding.

`[Mode: Execute]`

### Progress Tracking

At the start of Phase 4, create `claude-workflow/{project-name}/phase4-progress.md`:

```markdown
# Phase 4 — Progress: {project-name}

## Tasks
| # | Name | Status | Files Modified | Notes |
|---|------|--------|----------------|-------|
| 1 | [name] | pending | | |
| 2 | [name] | pending | | |
...

## Build Status
clean

## Last Updated
[ISO-8601 UTC — e.g. 2026-05-09T10:00:00Z]
```

**Update this file after every task completes.** This is the resume checkpoint — if the session resets mid-phase, reading this file shows exactly where to continue.

### Per-Task Loop

For each task in `phase3-plan.md`:

**1 — Write failing tests**

Exemption: for tasks ≤ 10 lines of change or pure config/constant changes, main session may write tests inline without spawning tdd-guide.

Otherwise, invoke the **`tdd-guide` (Sonnet)** ECC subagent:
Provide the task definition from `phase3-plan.md` (including `Test File`) and the test patterns from `phase1-research.md`.
Task: Write failing tests for this task. Tests must fail before implementation begins.

Verify tests fail. If they pass immediately, the test is wrong — fix it before continuing.

**2 — Implement**

Mark the task `in_progress` in `phase4-progress.md` before starting. Main session implements the task to make the failing tests pass. Follow `phase3-plan.md` exactly. Mirror the patterns from `phase1-research.md`. Do not add scope.

**3 — Validate immediately**

```bash
# type check + lint + unit tests for affected files
```

Fix any failure before moving to the next task. Never accumulate broken state. If a fix worsens the state, use `git stash` to restore the pre-task baseline and retry.

**4 — Update progress file**

Mark the task `complete` in `phase4-progress.md`. Record modified files in the `Files Modified` column. Update build status and `Last Updated` timestamp.

### Resuming Mid-Phase

If Phase 4 is resumed, read `phase4-progress.md` to find the first task with status `pending` or `in_progress`. For `in_progress` tasks, re-validate the current file state before continuing — the prior session may have partially written the implementation.

---

## Phase 5 — REVIEW

**Prerequisite:** `phase4-progress.md` must exist with all tasks marked complete. If missing or tasks still pending → stop: "Phase 4 is not complete. Finish all tasks first."

Read `phase3-plan.md` and `phase4-progress.md` before proceeding.

`[Mode: Review]`

### 5.1 Quality Review

Invoke the **`code-reviewer` (Sonnet)** ECC subagent:

Provide the list of modified files from the `Files Modified` column in `phase4-progress.md`.
Task: Review all modified files. Check: naming, error handling, immutability, function size (<50 lines), file size (<800 lines), test coverage, no debug statements.

### 5.2 Security Review (conditional)

Only if Phase 4 modified files touching auth, payments, user data, file system, or external API calls:

Invoke the **`security-reviewer` (Sonnet)** ECC subagent:
Task: Check for hardcoded secrets, injection vulnerabilities, unvalidated input, unsafe operations, OWASP Top 10.

### 5.3 Fix Loop

- **CRITICAL** → fix immediately, re-run the relevant reviewer. After 3 fix-and-re-review iterations without convergence, stop and escalate to the user.
- **HIGH** → fix before Phase 6
- **MEDIUM/LOW** → log as follow-up, do not block

If CRITICAL issues are found, consult the configured Claude Code advisor to confirm severity and check for anything missed.

### 5.4 Write Phase File

Create `claude-workflow/{project-name}/phase5-review.md`:

```markdown
# Phase 5 — Review: {project-name}

## Code Review Findings
### CRITICAL
[list or "none"]
### HIGH
[list or "none"]
### MEDIUM/LOW
[list]

## Security Review
[ran: yes/no (reason if no)]
### Findings
[list or "none"]

## Fixes Applied
[list of fixes made]

## Follow-Up Items
[MEDIUM/LOW issues deferred]

## Review Status
PASSED | PASSED WITH FOLLOW-UPS
```

---

## Phase 6 — FINALIZE

**Prerequisite:** `phase5-review.md` must exist with status PASSED or PASSED WITH FOLLOW-UPS. If missing → stop: "Phase 5 is not complete. Run Phase 5 first."

Read `phase1-research.md`, `phase3-plan.md`, and `phase5-review.md` before proceeding.

`[Mode: Finalize]`

### 6.1 Final Validation

```bash
# full test suite + type check + lint + build
# coverage: run your framework's coverage command and confirm ≥ 80%
```

All must pass before continuing.

### 6.2 Acceptance Criteria

- [ ] Deliverable matches Phase 1 success criteria
- [ ] All Phase 3 tasks completed
- [ ] Tests pass (≥ 80% coverage)
- [ ] No type errors, no lint errors
- [ ] No CRITICAL or HIGH issues remaining
- [ ] No console.log or debug statements

### 6.3 Documentation Update

Read the project root `CLAUDE.md`. Look for a `Documentation Update Checklist` section.

**If found** → invoke the **`doc-updater` (Haiku)** ECC subagent to execute every item.

**If not found** → create project root `CLAUDE.md` if it doesn't exist, then append:

```markdown
## Documentation Update Checklist

- [ ] README.md — update feature list, usage examples, env vars
- [ ] API docs — add/update endpoint descriptions and examples
- [ ] CHANGELOG.md — add entry under [Unreleased]
- [ ] Architecture docs — update if structure changed
- [ ] .env.example — add any new environment variables
- [ ] Inline comments — update where public interfaces changed
```

Then invoke the **`doc-updater` (Haiku)** ECC subagent to execute it. Confirm every item is completed or marked N/A.

### 6.4 Write Phase File

Create `claude-workflow/{project-name}/phase6-summary.md`:

```markdown
# Phase 6 — Summary: {project-name}

## Delivered
[what was built, 2–3 sentences]

## Files Changed
[list]

## Test Coverage
[%]

## Follow-Up Items
[from phase5-review.md MEDIUM/LOW list]

## Commit
[hash and message once committed, or "pending commit"]

## GitHub Issue
[closed: owner/repo#number — or "none" — or "open: reason criteria not met"]

## Roadmap
[updated: yes/no; active follow-ups]

## Archive
[archived to claude-workflow/archive/{project-name} — or "pending archive"]

## Status
COMPLETE
```

### 6.5 Roadmap And Archive Maintenance

Read `claude-workflow/ROADMAP.md` if it exists. If it does not exist, recommend running `/workflow-init` and create a minimal roadmap before continuing.

Refresh from GitHub issues when available:

```bash
gh issue list --limit 100 --json number,title,state,labels,assignees,updatedAt,url
```

Prepare local roadmap state:
- Mirror currently open implementation issues.
- Mark the current linked issue as ready to close only if all acceptance criteria pass.
- Keep only unfinished work in `claude-workflow/ROADMAP.md`.
- Add active rows for follow-up issues that remain open.
- Preserve manual local notes only in a `Local Notes` section.
- If new follow-up work was discovered, create or update GitHub issues for that work before leaving it in the roadmap.

Archive completed workflow records:
- After `phase6-summary.md` is written, move completed project folders from `claude-workflow/{project-name}/` to `claude-workflow/archive/{project-name}/`.
- If the archive destination exists, append a timestamp suffix.
- Do not archive incomplete workflow folders.
- Leave `claude-workflow/ROADMAP.md` and `claude-workflow/archive/` in place.

Update `phase6-summary.md` with the final roadmap and archive paths after these steps.

### 6.6 Commit

If `/prp-commit` is available, invoke it to commit all changes with a structured conventional commit message. Otherwise, inspect `git status` and `git diff`, stage only workflow-related changes, and create a conventional commit with `git commit`.

Record the resulting commit hash.

### 6.7 GitHub Issue Update

Read `phase1-research.md`. If `GitHub Issue` is set (not "none"):

- If all acceptance criteria in 6.2 pass, comment with the commit hash and close the issue:
  ```bash
  gh issue close {number} --repo {owner/repo} \
    --comment "Resolved in {commit-hash}. All acceptance criteria met."
  ```
- If implementation is partial or follow-ups remain, comment with progress and keep the issue open.
- If new follow-up work was discovered, ensure it exists as GitHub issues and is mirrored in `claude-workflow/ROADMAP.md`.

Refresh `claude-workflow/ROADMAP.md` from current open issue state after issue updates.

### 6.8 Final Metadata

Update `phase6-summary.md` with:
- final commit hash
- final GitHub issue state
- final roadmap state
- final archive path

If this changes tracked files after the commit, amend the commit or create a small follow-up docs/workflow commit according to project convention.

---

## Advisor Gate Summary

| Phase | Trigger | Opus reviews |
|-------|---------|--------------|
| 2 — Ideation | Always | Approach options, risks |
| 3 — Plan | Always | Blueprint completeness, dependency order |
| 5 — Review | Only if CRITICAL found | Severity, missed issues |

---

## Phase File Reference

```
{project-root}/
└── claude-workflow/
    └── {project-name}/               ← named + confirmed at end of Phase 1
        ├── .cache/
        │   ├── planner.md            raw planner output (Phase 2, before advisor)
        │   └── architect.md          raw architect output (Phase 3, before advisor)
        ├── phase1-research.md        written end of Phase 1
        ├── phase2-ideation.md        written end of Phase 2
        ├── phase3-plan.md            written end of Phase 3
        ├── phase4-progress.md        updated after each task (tracks Files Modified)
        ├── phase5-review.md          written end of Phase 5
        └── phase6-summary.md         written end of Phase 6
    ├── ROADMAP.md                    active unfinished work only
    └── archive/                      completed workflow project folders
```

Any phase that finds its prerequisite file missing will stop and report which phase needs to be completed first.

To see all active projects: check `claude-workflow/` in the project root.
To resume: run `/claude-workflow` with no argument — the startup scan will list them.

---

## Key Rules

1. **Every phase writes a file** — no phase completes without its artifact on disk
2. **Every phase reads its prerequisites** — context comes from files, not conversation history
3. **Phase 4 updates progress after each task** — mid-phase resumption is always possible
4. **Main session owns Phase 4 implementation** — `tdd-guide` may write tests; extra helper agents require explicit justification
5. **Two advisor gates** — Phase 2 and Phase 3 only; conditional at Phase 5
6. **Security reviewer is conditional** — only when security-sensitive files are touched
7. **GitHub issues drive roadmap** — fetch issues at startup and update them at finalization
8. **Local roadmap mirrors active work** — keep only active unfinished work in `claude-workflow/ROADMAP.md`
9. **Completed work is archived** — move complete workflow folders under `claude-workflow/archive/`
10. **Never accumulate broken state** — fix validation failures immediately before next task
11. **Scope discipline** — surface plan deviations to user; never silently expand scope
