---
name: codex-workflow-review
description: Use when Phase 4 tasks are complete and Claude-Workflow for Codex, also called claude-workflow, needs quality review, optional security review, and review-fix routing.
---

# Codex Workflow Review

Phase 5 reviews completed work. Review findings come first; fixes are implemented only after classification.

## Inputs

Read:

```text
codex-workflow/{project}/workflow-state.md
codex-workflow/{project}/phase3-plan.md
codex-workflow/{project}/phase4-progress.md
```

## Review Steps

1. Inspect changed files and task evidence.
2. Use `codex review` when useful for a detached review pass; otherwise perform a review stance locally.
3. Check correctness, scope, naming, error handling, test coverage, debug statements, and validation evidence.
4. Run a security-sensitive file scan. If auth, payments, user data, filesystem access, external APIs, or secrets changed, perform a security review.
5. Route CRITICAL/HIGH findings back to implementation before Phase 6. MEDIUM/LOW findings may become follow-ups.
6. Save raw review output to `.cache/code-reviewer.md` and `.cache/security-reviewer.md` when used.

## Phase File

```markdown
# Phase 5 - Review: {project}

## Code Review Findings
### CRITICAL
none
### HIGH
none
### MEDIUM/LOW
...

## Security Review
ran yes/no and reason

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| quality review | invoked | .cache/code-reviewer.md | |
| security review | invoked/N/A | .cache/security-reviewer.md or file-risk scan | reason if N/A |
| review-fix executors | invoked/N/A | .cache/review-fix-*.md | reason if N/A |

## Review Status
PASSED | PASSED WITH FOLLOW-UPS
```

Set `next_skill: codex-workflow-finalize {project}`.
