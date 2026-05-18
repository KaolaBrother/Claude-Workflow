# Phase 1 - Research: issue-67

## Deliverable

Port the post-#63 simplified workflow scripts into `plugins/kaola-workflow-gitlab/scripts/` as self-contained GitLab-local scripts.

## Why

The GitLab edition needs the simplified two-source workflow core before MR sinks, commands, skills, hooks, validators, and docs can be completed.

## Affected Area

- `plugins/kaola-workflow-gitlab/scripts/`
- `kaola-workflow/issue-67/`

## Key Patterns Found

1. `plugins/kaola-workflow/scripts/kaola-workflow-active-folders.js` - active folders are local workflow state files, excluding inactive local status and remotely closed issues.
2. `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` - startup, issue selection, resume, finalize, worktree status/finalize, and sink fallback are implemented in one compact script.
3. `plugins/kaola-workflow/scripts/kaola-workflow-classifier.js` - classifier consumes the active-folder reader and issue metadata, then blocks on local claimed overlap.
4. `plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js` - roadmap files are compact `.roadmap/issue-N.md` records rendered into `ROADMAP.md`.
5. `plugins/kaola-workflow/scripts/kaola-workflow-repair-state.js` - repair-state reconstructs routing from phase artifacts and preserves the sink block.
6. `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-forge.js` - #72 provides GitLab-local `glab` helpers and normalizers for project, issue, note, MR, and label data.

## Test Patterns

- Framework: Node scripts with `assert` and child process checks.
- Location: existing tests are executable scripts in `plugins/*/scripts/`, plus package-level validators.
- Structure: focused simulator/test scripts build temporary repos or injected runners, assert command/state behavior, then print a single success line.

## External Docs

N/A. Local issue acceptance and #72 helper contracts are sufficient.

## Completeness Score

9/10

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | `kaola-workflow/issue-67/.cache/code-explorer.md` | Current session performed read-only exploration because the user is coordinating parallel issue ownership. |
| docs-lookup | N/A | `kaola-workflow/issue-67/.cache/docs-lookup.md` | External docs are not needed for a local post-#63 core port. |

