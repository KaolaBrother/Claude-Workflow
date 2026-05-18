# Phase 5 - Review: issue-32

## Code Review Findings

### CRITICAL
none

### HIGH
none

### MEDIUM/LOW

**[MEDIUM] Artifact mirror loop unsafe for renamed/space paths** (`commands/kaola-workflow-phase6.md` ~L544, `SKILL.md` ~L160)
`git status --porcelain` without `-z` + `${line:3}` extraction breaks on rename entries (`R  old -> new`) and on filenames with spaces (git C-quotes them). Fix: use `--porcelain -z` with null-delimited read, or `git diff --name-only --diff-filter=d -z`.

**[MEDIUM] Stray-dir cleanup regex too broad, runs against live repo** (`scripts/simulate-workflow-walkthrough.js` L4390-4399)
`process.cwd()` points to the live repository root (not `tmp`). The regex `/^proj-ac/` could delete real project dirs like `proj-accounts`. Note: the Gap 3-A fix (`cwd: tmp` on three `spawnSync` calls) should have eliminated the need for this block entirely. Recommended fix: remove the block, or tighten to `/^proj-ac\d+$/` and use a known temp path instead of `process.cwd()`.

**[MEDIUM] Artifact mirror loop may include unrelated modified files from main worktree** (`phase6.md` ~L546, `SKILL.md` ~L162)
The mirror block first does an explicit `cp -R "kaola-workflow/{project}/."` (direct copy), then runs a `git status --porcelain` loop that correctly skips `kaola-workflow/*` (already handled) and copies ALL other modified files. Unrelated local edits or any non-kaola-workflow file touched in the main worktree will be silently included in the linked worktree commit. May be intentional (capturing Phase 6 doc changes) but could include stray edits. Consider gating non-`kaola-workflow/` copies on an explicit allowlist.

**[LOW] `isSyntheticTestSession` predicate naming misleads** (`scripts/kaola-workflow-claim.js` L583)
Returns `true` for corrupt locks (missing `session_id`) as well as synthetic test sessions. Rename to `isSyntheticOrCorruptLock` or extract the corrupt-lock guard separately.

**[LOW] Gap 1+2 structural tests check substring presence only** (`scripts/simulate-workflow-walkthrough.js` L4375-4385)
Assertions verify that required strings exist somewhere in each file but do not verify ordering (mirror before commit gate) or that strings appear inside bash fences vs prose. Acceptable smoke test; noted for future improvement.

**[LOW] `synthetic-` prefix invariant unenforced at arg boundary** (`scripts/kaola-workflow-claim.js`)
`validateClaimArgs` does not reject `--session synthetic-foo`. A real session with that prefix gets swept unconditionally. Fix: add assert in `validateClaimArgs`.

## Security Review

ran: yes — modified files involve filesystem access, lock file operations, and shell commands in markdown.

### Findings
All security findings are at MEDIUM or LOW severity (see above and `.cache/security-reviewer.md`). No CRITICAL or HIGH security issues found. Lock file creation uses `wx` exclusive flag at `0o600`. Shell variables double-quoted throughout. No hardcoded secrets. `isSafeName` blocks path traversal at CLI boundary. `spawnSync` calls use array-form arguments.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-reviewer | invoked | .cache/code-reviewer.md | |
| security-reviewer | invoked | .cache/security-reviewer.md | filesystem access in all 4 files |
| review-fix executors | N/A | no CRITICAL or HIGH findings | |
| advisor critical gate | N/A | no CRITICAL findings | |

## Fixes Applied
none — no CRITICAL or HIGH findings requiring pre-Phase-6 fixes

## Validation Evidence
Phase 4 validation evidence cited (de-duplication): `node scripts/simulate-workflow-walkthrough.js` → exit 0, "Workflow walkthrough simulation passed". No relevant files changed since Phase 4 validation passed.

## Follow-Up Items
1. **[MEDIUM]** Fix artifact mirror loop to use `--porcelain -z` with null-delimited read to handle renames and filenames with spaces/special chars.
2. **[MEDIUM]** Remove or restrict stray-dir cleanup block (L4390-4399 in walkthrough) — the `cwd: tmp` fix makes it redundant; if kept, tighten regex to `/^proj-ac\d+$/` and use temp path not `process.cwd()`.
3. **[MEDIUM]** Gate non-`kaola-workflow/` mirror copies on an explicit allowlist to avoid including stray edits from main worktree.
4. **[LOW]** Rename `isSyntheticTestSession` → `isSyntheticOrCorruptLock`.
5. **[LOW]** Add `synthetic-` prefix rejection to `validateClaimArgs`.
6. **[LOW]** Add ordering assertion to Gap 1+2 structural tests (mirror before commit gate).

## Review Status
PASSED WITH FOLLOW-UPS
