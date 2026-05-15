# Phase 3 - Plan: issue-24

## Blueprint

Implement the locked startup design from issue #24 as a script-level transaction and update both runtime surfaces to use it.

### Task 1: Startup Transaction

- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/kaola-workflow-claim.js`, root simulation
- Depends On: none
- Parallel Group: serial
- Action: MODIFY
- Implement:
  - add `startup` subcommand
  - fetch issue records online
  - sync open issues to `.roadmap`
  - generate `ROADMAP.md`
  - run sweep/watch-pr
  - detect owned project
  - classify sorted candidates
  - claim first actionable issue
  - write startup receipt
  - emit structured JSON
- Mirror: existing `bootstrap` helpers and claim/lock APIs
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task 2: Packaged Codex Script Parity

- File: `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
- Test File: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- Write Set: packaged claim script, plugin simulation
- Depends On: Task 1
- Parallel Group: serial
- Action: MODIFY
- Implement: copy the shared startup transaction into packaged script.
- Mirror: root claim script exactly.
- Validate: `node scripts/validate-kaola-workflow-contracts.js && node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`

### Task 3: Router And Phase Guard Prompts

- File: `commands/workflow-next.md`, `commands/kaola-workflow-phase*.md`, `plugins/kaola-workflow/skills/*/SKILL.md`
- Test File: contract validators
- Write Set: command and skill prompt files
- Depends On: Task 1
- Parallel Group: serial
- Action: MODIFY
- Implement:
  - `/workflow-next` and `kaola-workflow-next` call `startup`
  - add startup receipt guard language to phase commands and phase skills
  - keep legacy `bootstrap` references only where compatibility language is needed
- Validate: `node scripts/validate-workflow-contracts.js && node scripts/validate-kaola-workflow-contracts.js`

### Task 4: Validation And Release Artifacts

- File: workflow artifacts, changelog/readme if needed
- Test File: full suite
- Write Set: docs/workflow artifacts
- Depends On: Tasks 1-3
- Parallel Group: serial
- Action: MODIFY
- Implement:
  - finish phase progress/review/summary
  - refresh roadmap and archive issue folder
  - close GitHub issue after validation
- Validate: `npm test && git diff --check`

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| blueprint revisions | N/A | .cache/advisor-plan.md | advisor approved plan without revision |
