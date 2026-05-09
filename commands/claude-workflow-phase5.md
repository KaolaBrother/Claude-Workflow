---
description: Claude Workflow Phase 5. Review, security review, and delegated review-fix loop.
argument-hint: <project name>
---

# Claude Workflow Phase 5 - Review

Phase 5 reviews completed Phase 4 work. Review agents review only; do not edit
files. Fixes are routed to implementation/fix agents and then re-reviewed.

## Prerequisite

`phase4-progress.md` must exist with all tasks complete. If missing or tasks are
pending, stop:

```text
Phase 4 is not complete. Run /claude-workflow-phase4 first.
```

Read:

```text
claude-workflow/{project}/workflow-state.md
claude-workflow/{project}/phase3-plan.md
claude-workflow/{project}/phase4-progress.md
```

## Resume Detection

- `.cache/code-reviewer.md` missing -> `code-review`
- security-sensitive files touched and `.cache/security-reviewer.md` missing ->
  `security-review`
- CRITICAL/HIGH review findings unresolved -> `route-review-fixes`
- fix cache exists but reviewer not re-run -> `re-review`
- `phase5-review.md` missing -> `write-phase-file`
- `phase5-review.md` complete -> route to `/claude-workflow-phase6 {project}`

If ambiguous, stop and ask.

## Hard Gates

- `code-reviewer` is always required.
- `security-reviewer` is required when touched files involve auth, payments,
  user data, filesystem access, external API calls, or secrets.
- `security-reviewer` must be instructed: review only; do not edit files.
- `code-reviewer` must be instructed: review only; do not edit files.
- Review fixes are subagent-executed. Do not apply review fixes inline unless
  explicit emergency fallback authorization is recorded.
- CRITICAL and HIGH findings block Phase 6.

## Step 1 - Quality Review

Update `workflow-state.md`:

```text
phase: 5
phase_name: Review
step: code-review
next_command: /claude-workflow-phase5 {project}
main_session_role: orchestrator
implementation_owner: tdd-guide for behavior fixes
fix_owner: tdd-guide or build-error-resolver
inline_emergency_fallback_authorized: no
```

Invoke ECC `code-reviewer`.

Provide modified files from `phase4-progress.md` and instruct:

```text
Review only; do not edit files.
Check naming, error handling, immutability, function size under 50 lines, file
size under 800 lines, test coverage, no debug statements, and scope compliance.
```

Write raw output to:

```text
claude-workflow/{project}/.cache/code-reviewer.md
```

## Step 2 - Security Review

Perform a file-risk scan from Phase 4 modified files.

If security-sensitive files were touched, invoke ECC `security-reviewer` with:

```text
Review only; do not edit files.
Check hardcoded secrets, injection, unvalidated input, unsafe operations, OWASP
Top 10, auth, payments, user data, filesystem access, and external API calls.
```

Write raw output to:

```text
claude-workflow/{project}/.cache/security-reviewer.md
```

If security review is not needed, record `N/A` with the file-risk scan evidence.

## Step 3 - Review Fix Loop

Route findings:

- CRITICAL -> delegate fix immediately, re-run relevant reviewer
- HIGH -> delegate fix before Phase 6
- MEDIUM/LOW -> log as follow-up; does not block

If CRITICAL findings exist, consult the configured Claude Code advisor and save:

```text
claude-workflow/{project}/.cache/advisor-critical-review.md
```

Fix routing:

- behavior, test coverage, implementation correction -> `tdd-guide`
- build/type/lint/dependency/tooling correction -> `build-error-resolver`
- security-sensitive correction -> route fix to the appropriate fix agent, then
  re-run `security-reviewer`

Write each fix-agent output to:

```text
claude-workflow/{project}/.cache/review-fix-{n}.md
```

After three fix-and-re-review iterations without convergence, stop and ask.

## Step 4 - Write Phase File

Create `claude-workflow/{project}/phase5-review.md`:

```markdown
# Phase 5 - Review: {project}

## Code Review Findings
### CRITICAL
[list or none]
### HIGH
[list or none]
### MEDIUM/LOW
[list]

## Security Review
[ran: yes/no and reason]
### Findings
[list or none]

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-reviewer | invoked | .cache/code-reviewer.md | |
| security-reviewer | invoked/N/A | .cache/security-reviewer.md or file-risk scan | [reason if N/A] |
| review-fix executors | invoked/N/A | .cache/review-fix-*.md | [reason if N/A] |
| advisor critical gate | invoked/N/A | .cache/advisor-critical-review.md or findings | [reason if N/A] |

## Fixes Applied
[list]

## Follow-Up Items
[MEDIUM/LOW deferred]

## Review Status
PASSED | PASSED WITH FOLLOW-UPS
```

Update `workflow-state.md`:

```text
phase: 5
step: complete
next_command: /claude-workflow-phase6 {project}
```
