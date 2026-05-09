---
description: Claude Workflow Phase 6. Final validation, documentation, roadmap/archive, commit, and issue update.
argument-hint: <project name>
---

# Claude Workflow Phase 6 - Finalize

Phase 6 proves the workflow is complete and records final metadata. Do not
repair inline when final validation fails.

## Prerequisite

`phase5-review.md` must exist with status `PASSED` or `PASSED WITH FOLLOW-UPS`.
If missing, stop:

```text
Phase 5 is not complete. Run /claude-workflow-phase5 first.
```

Read:

```text
claude-workflow/{project}/workflow-state.md
claude-workflow/{project}/phase1-research.md
claude-workflow/{project}/phase3-plan.md
claude-workflow/{project}/phase4-progress.md
claude-workflow/{project}/phase5-review.md
```

## Resume Detection

- final validation not run -> `final-validation`
- final validation failed and no ledger row -> `route-final-fix`
- final validation fixed but not re-run -> `final-validation`
- acceptance checklist incomplete -> `acceptance-check`
- documentation gate incomplete -> `doc-update`
- phase summary missing -> `write-summary`
- roadmap/archive incomplete -> `roadmap-archive`
- commit missing -> `commit`
- linked issue not updated -> `issue-update`
- final metadata pending -> `final-metadata`

If ambiguous, stop and ask.

## Operational Guardrails

- Run fresh full validation before claiming completion.
- Do not repair inline. Final validation failures are routed.
- Do not close a GitHub issue until acceptance criteria pass.
- Do not archive incomplete workflow folders.
- Do not stage unrelated user changes.
- If `/prp-commit` is unavailable, stage the approved implementation, docs, and
  workflow artifacts for this project only.

## Step 1 - Final Validation

Update `workflow-state.md`:

```text
phase: 6
phase_name: Finalize
step: final-validation
next_command: /claude-workflow-phase6 {project}
main_session_role: orchestrator
implementation_owner: N/A
fix_owner: tdd-guide or build-error-resolver
inline_emergency_fallback_authorized: no
```

Run the full relevant project commands:

```bash
# full test suite + type check + lint + build
# coverage command when available; target >= 80%
```

All must pass before continuing.

If validation fails, update a Final Validation Failure Ledger and route:

- build/type/lint/dependency/tooling -> `build-error-resolver`
- behavior/regression/coverage -> `tdd-guide`
- review/security regression -> return to Phase 5 and re-run reviewer after fix

Write fix output to:

```text
claude-workflow/{project}/.cache/final-validation-fix-{n}.md
```

Re-run the failed command after each routed fix.

## Step 2 - Acceptance Check

Verify:

- deliverable matches Phase 1 success criteria
- all Phase 3 tasks complete
- tests pass and coverage target is met or justified
- no type errors or lint errors
- no CRITICAL or HIGH review findings remain
- no debug statements remain

## Step 3 - Documentation Update

Read project root `CLAUDE.md`. Look for `Documentation Update Checklist`.

This is a required documentation gate.

If checklist exists, invoke ECC `doc-updater` with changed files and checklist.

If missing, create or append the checklist, then invoke `doc-updater`:

```markdown
## Documentation Update Checklist

- [ ] README.md - update feature list, usage examples, env vars
- [ ] API docs - add/update endpoint descriptions and examples
- [ ] CHANGELOG.md - add entry under [Unreleased]
- [ ] Architecture docs - update if structure changed
- [ ] .env.example - add any new environment variables
- [ ] Inline comments - update where public interfaces changed
```

If no documentation update is needed, skip only with explicit reason and
evidence such as:

```text
no public behavior, API, setup, architecture, roadmap, or docs impact
```

Write agent output to:

```text
claude-workflow/{project}/.cache/doc-updater.md
```

## Step 4 - Write Summary

Create `claude-workflow/{project}/phase6-summary.md`:

```markdown
# Phase 6 - Summary: {project}

## Delivered
[what was built]

## Files Changed
[list]

## Test Coverage
[% or reason unavailable]

## Final Validation Failure Ledger
| Failing Command | Classification | Routed To | Evidence | Status |
|-----------------|----------------|-----------|----------|--------|

## Follow-Up Items
[from Phase 5]

## Commit
[hash/message or pending]

## GitHub Issue
[closed/open/none]

## Roadmap
[updated yes/no]

## Archive
[archive path or pending]

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| doc-updater | invoked/skipped | .cache/doc-updater.md or docs-impact check | [reason if skipped] |
| final-validation fix executors | invoked/N/A | .cache/final-validation-fix-*.md | [reason if N/A] |
| roadmap refresh | invoked | claude-workflow/ROADMAP.md | |
| archive completed folder | pending | | |

## Status
COMPLETE
```

## Step 5 - Roadmap And Archive

Refresh `claude-workflow/ROADMAP.md` from open GitHub issues when available.
Keep only unfinished work.

Archive only after summary exists:

```text
claude-workflow/{project}/ -> claude-workflow/archive/{project}/
```

If destination exists, append a timestamp suffix. Update `phase6-summary.md`
with the final archive path before final metadata.

## Step 6 - Commit

If `/prp-commit` is available, use it.

Otherwise:

- inspect `git status` and `git diff`
- stage only approved implementation, docs, and workflow artifacts for this
  project
- do not stage unrelated user changes
- create a conventional commit
- record the commit hash

## Step 7 - GitHub Issue Update

If `phase1-research.md` links a GitHub issue:

- close it only after acceptance criteria pass
- comment with commit hash
- keep it open if follow-ups or partial implementation remain
- create/update follow-up issues when needed

Refresh the roadmap after issue updates.

## Step 8 - Final Metadata

Update `phase6-summary.md` with:

- final commit hash
- final GitHub issue state
- final roadmap state
- final archive path
- compliance table with no pending rows

Before declaring complete, verify every `Required Agent Compliance` row across
phase files is `invoked`, `skipped`, or `N/A` with evidence or skip reason.
