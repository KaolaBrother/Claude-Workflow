# Doc-Updater — issue-35

## Note
doc-updater agent ran against the linked worktree (workflow/issue-35 branch) which predates
implementation changes that live in the main worktree (uncommitted). Implementation was confirmed
present in the main worktree via grep before docking. See Trivial Inline Edit Exception below.

## Checklist Results

- [x] README.md — `### Startup Issue Priority Ranking` subsection added under `### Classifier Configuration` (lines 345-367). Describes three-key sort order, ranking receipt shape, top-tier override, and JSON config example.
- [x] CHANGELOG.md — `### Added — Startup Priority Label Ranking (issue #35)` entry present under `[Unreleased]`.
- N/A API docs — No REST API. Startup receipt is internal JSON (operator-private, 0o600). No API doc file maintained.
- N/A Architecture docs — No structural change. New helpers added within one existing file (claim.js).
- N/A .env.example — No new environment variables introduced.
- [x] Inline comments — Trivial Inline Edit Exception applied: added one-line comment on `sortIssueRecords(issues, opts)` explaining `opts.topTierLabels` default (backward-compat when omitted). Walkthrough still passes.

## Trivial Inline Edit Exception
File: scripts/kaola-workflow-claim.js
Change: added `// opts.topTierLabels: labels forced to tier 0; omit opts for backward-compat (all tier 4)` before the topTierLabels destructure in sortIssueRecords.
Validation: node scripts/simulate-workflow-walkthrough.js → exit 0

## Status: COMPLETE
