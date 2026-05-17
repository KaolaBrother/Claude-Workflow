# Code Review: Issue #37 — Worktree-Native Subcommands

## CRITICAL
none

## HIGH

### [HIGH-1] Test 17B asserts the correct verdict for the wrong reason — dedup logic not exercised
File: `scripts/simulate-workflow-walkthrough.js:4743-4748`

17B used `KAOLA_WORKFLOW_OFFLINE=1` with no ROADMAP.md, so `openIssues = []` — verdict:none from empty candidates, not from branch dedup. The claimed-branches filter was never reached. Root cause traced to git showing worktree-checked-out branches with `+` prefix, which `replace(/^\*\s*/, '')` does not strip.

**Fix applied (Trivial Inline Edit):**
1. `cmdPickNext` line 2142: changed `replace(/^\*\s*/, '')` → `replace(/^[*+]\s*/, '')` so branches checked out in a linked worktree are recognized as claimed.
2. Test 17B: wrote `ROADMAP.md` with `#701` before second call so the offline dedup path is actually exercised.

### [HIGH-2] Missing `isSafeName` guard on `--project` in `cmdResume` and `cmdWorktreeFinalize`
File: `scripts/kaola-workflow-claim.js` (lines 2222 and 2341)

Both commands accepted `--project` with no path-safety check and passed raw value directly into `path.join`, `worktreePathFor`, `fs.cpSync`, and `git` arguments. Every other command accepting `--project` calls `assert(isSafeName(args.project), ...)` immediately. Identified independently by both code-reviewer and security-reviewer (see also H1/H2 in security-reviewer.md).

**Fix applied (Trivial Inline Edit):**
Added `assert(isSafeName(args.project), '--project must be a simple folder name with no path separators')` in both `cmdResume` (before `projectDir` construction) and `cmdWorktreeFinalize` (after the existing `assert(args.project, ...)`). Identical to the pattern at line 342.

## MEDIUM

### [MEDIUM-1] Three of the four new functions exceed the 50-line cap
`cmdPickNext` (~88 lines), `cmdResume` (~76 lines), `cmdWorktreeFinalize` (~62 lines). `cmdWorktreeStatus` (~41 lines, passes).
→ Logged as follow-up. No blocking behavior issue.

### [MEDIUM-2] `cmdPickNext` swallows all `provisionWorktree` errors silently
`catch (_) {}` absorbs permission errors and disk-full, not just lost-race. Should `process.stderr.write(...)` matching the pattern in `cmdClaim` at line 1364.
→ Logged as follow-up.

### [MEDIUM-3] `issue` field type inconsistent across new commands
`cmdPickNext` and `cmdWorktreeStatus` emit `issue` as a number; `cmdResume` emits it as a string. Should be `parseInt(project.slice('issue-'.length), 10)` in `cmdResume`.
→ Logged as follow-up.

### [MEDIUM-4] Phase-4 Worktree Discovery block uses `git rev-parse --show-toplevel` incorrectly
If the shell is inside the issue worktree, `COORD_ROOT` resolves to the issue worktree, making `ACTIVE_WORKTREE_PATH` nonsensical. Should use `git worktree list --porcelain` or explicitly document main-worktree-only context.
→ Logged as follow-up for Phase 2 of the worktree-native feature.

### [MEDIUM-5] Epic Case 17 lacks failure-path assertions for error paths
`cmdResume` with no project and no branch, `cmdWorktreeFinalize` with missing worktree, `cmdWorktreeFinalize` with dirty artifacts, 17F doesn't assert commit was actually created.
→ Logged as follow-up.

### [MEDIUM-6] Validator assertions are substring-only
`assertIncludes('scripts/kaola-workflow-claim.js', 'cmdPickNext')` passes even if function body is deleted but name appears in a comment.
→ Logged as follow-up.

## LOW

### [LOW-1] `branchFull.replace('refs/heads/', '')` is unanchored — should be `/^refs\/heads\//`
### [LOW-2] Hard-coded 6-level if/else in `cmdResume` for phase detection — could be a table
### [LOW-3] `epic17Tmp + '.kw'` cleanup couples test to implementation internals
### [LOW-4] `module.exports` two-line format inconsistency

## Overall Verdict
NEEDS WORK (2 HIGH) → after fixes applied: PASS WITH FOLLOW-UPS (MEDIUM/LOW remain as logged)
