# Phase 6 - Summary: issue-28

## Delivered

Fixed branch name duplication bug where `projectNameForIssue` silently swallowed
all errors and fell back to `'issue-' + N`, causing `workflow/issue-N-issue-N`
branch names when concatenated with the issue prefix.

Two-layer fix:
- Layer A: Added `cmdProjectName` subcommand to `kaola-workflow-roadmap.js` so
  subprocess callers can reliably retrieve the project name for an issue.
- Layer B: Rewrote `projectNameForIssue` to read the per-issue roadmap file
  directly (no subprocess), with ENOENT-aware error handling. Added
  `buildSinkBranchName` defensive helper that deduplicates the `issue-N` prefix.
  Collapsed `pickFirstActionableIssue` DRY via the new helper. Applied
  advisor-corrected `cmdWatchPr` backward-compat pattern. Added export guard
  enabling unit tests of pure helpers.
- Fixed `field()` regex cross-line bleed (all 4 script copies): `':\\s*(.+)`
  → `':[ \\t]*(.+)` so blank values don't match the next field's content.

## Files Changed

- `scripts/kaola-workflow-roadmap.js` — cmdProjectName, field() fix
- `plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js` — mirror
- `scripts/kaola-workflow-claim.js` — buildSinkBranchName, projectNameForIssue
  rewrite, pickFirstActionableIssue DRY, cmdWatchPr backward-compat, export guard,
  field() fix
- `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` — mirror
- `scripts/simulate-workflow-walkthrough.js` — Epic 5G, 5H, 7G/7A regressions
- `README.md` — added `project-name` to roadmap.js subcommand list (line 291)
- `CHANGELOG.md` — added v3.1.10 entry
- `kaola-workflow/.roadmap/issue-28.md` — per-issue roadmap file (staged)

## Test Coverage

Hand-rolled assert suite (`simulate-workflow-walkthrough.js`). No framework
with coverage instrumentation. New assertions:
- Epic 5G (4 cases): cmdProjectName found/missing/blank/fallback
- Epic 5H (4 cases): buildSinkBranchName unit via export guard
- Epic 7G: regression — `workflow/issue-45` not `workflow/issue-45-issue-45`
- Epic 7A: regression — existing correct branch name unchanged

Suite: exit 0, "Workflow walkthrough simulation passed".

## Final Validation Evidence

| Command | Result | Evidence |
|---------|--------|----------|
| `node scripts/simulate-workflow-walkthrough.js` | PASS | Phase 4 Task 3, Phase 6 re-verification |
| `diff -u scripts/kaola-workflow-roadmap.js plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js` | PASS (no output) | Phase 4 Task 1A |
| `diff -u scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js` | PASS (no output) | Phase 4 Task 2A |
| `node -e "require('./scripts/kaola-workflow-claim.js')"` syntax check | PASS | Phase 4 Task 2A |
| `node -e "require('./scripts/kaola-workflow-roadmap.js')"` syntax check | PASS | Phase 4 Task 1A |

All cited — no new runs per Validation De-Duplication; no relevant files changed
since Phase 4 final pass.

## Documentation Docking

DOCKED — `.cache/doc-docking.md`

| Document | Status |
|----------|--------|
| README.md | Updated — `project-name` added to subcommand list |
| CHANGELOG.md | Updated — v3.1.10 entry added |
| .env.example | No change needed — no new env vars |
| Architecture docs | No change needed — same 6-phase structure |
| API docs | No change needed — no HTTP endpoints changed |
| Inline comments | No change needed — new functions self-documenting |

## Final Validation Failure Ledger

| Failing Command | Classification | Routed To | Evidence | Status |
|-----------------|----------------|-----------|----------|--------|
| simulate-workflow-walkthrough.js (Epic 5G-d) | behavior — field() regex cross-line bleed | tdd-guide | .cache/tdd-task-3-fix-1.md | resolved |

## Follow-Up Items

From Phase 5 review:

1. [HIGH candidate] Fix `buildSinkBlock` to use `lockData.branch || buildSinkBranchName(...)` for consistency with `cmdWatchPr` (code M-1) — deferred per issue spec carveout (no migration for legacy `workflow/issue-N-issue-N` branches)
2. [MEDIUM] Add direct unit test for `field()` cross-line bleed fix (code M-2)
3. [LOW] Add internal `issueNumber` guard to `projectNameForIssue` (security M-1)
4. [LOW] Remove dead `_classifierScript` parameter from `projectNameForIssue` (code L-1)
5. [LOW] Sanitize `cmdProjectName` stdout against shell-significant chars (security L-1)

## Closure Decision

Advisor consulted — `.cache/advisor-closure.md`. Recommendation: CLOSE #28.
All four acceptance criteria met. Five follow-up items are non-blocking.
`buildSinkBlock` M-1 deferred per issue spec legacy-branch carveout.
No user decision required; advisor approval applied per Phase 6 guardrails.

## Commit And Push

Pending — final Git gate runs after this file is committed.

## GitHub Issue

Closing after sink succeeds.

## Roadmap

Pending — per-issue file deletion and ROADMAP.md regeneration staged in final commit.

## Archive

Pending — `kaola-workflow/issue-28/` → `kaola-workflow/archive/issue-28/` after commit.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| doc-updater | invoked | .cache/doc-updater.md | |
| documentation docking | invoked | .cache/doc-docking.md | |
| closure advisor gate | invoked | .cache/advisor-closure.md | |
| final-validation fix executors | invoked | .cache/tdd-task-3-fix-1.md | field() regex fix |
| roadmap refresh | ready | kaola-workflow/ROADMAP.md | staged in final commit |
| archive completed folder | pending | | runs after final commit |
| final commit and push | ready | git status / git diff / upstream check | final gate runs after this file is committed |

## Status

READY FOR FINAL GIT GATE
