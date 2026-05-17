# Phase 5 - Review: issue-37

## Code Review Findings

### CRITICAL
none

### HIGH

**[HIGH-1] Test 17B dedup logic not actually exercised; root cause was `+` prefix bug in `cmdPickNext`**
Git shows branches checked out in linked worktrees with a `+` prefix (not `*`). `cmdPickNext`'s claimed-branch set builder used `replace(/^\*\s*/, '')` which doesn't strip `+`, so branches held by active worktrees were not recognized as claimed. 17B used `KAOLA_WORKFLOW_OFFLINE=1` with no ROADMAP.md, getting `verdict:none` from empty candidate list rather than from dedup. Both the dedup bug and the test were fixed.

**[HIGH-2] Missing `isSafeName` guard on `--project` in `cmdResume` and `cmdWorktreeFinalize`**
Both commands accepted `--project` with no path-safety check and fed it into `path.join`, `worktreePathFor`, `fs.cpSync`, and `git -C` arguments. Every other command accepting `--project` calls `assert(isSafeName(...))` immediately. Identified independently by both code-reviewer and security-reviewer.

### MEDIUM/LOW
See `.cache/code-reviewer.md` for MEDIUM-1 through MEDIUM-6 and LOW-1 through LOW-4. None block Phase 6.

Notable MEDIUM items for follow-up issues:
- MEDIUM-1: Three functions exceed 50-line cap (cmdPickNext ~88L, cmdResume ~76L, cmdWorktreeFinalize ~62L)
- MEDIUM-3: `issue` field type inconsistent: number in cmdPickNext/cmdWorktreeStatus, string in cmdResume
- MEDIUM-4: Phase-4 Worktree Discovery block's `git rev-parse --show-toplevel` is wrong if invoked from inside the issue worktree — follow-up in Phase 2 of native feature rollout

## Security Review

Ran: yes — `cmdPickNext`, `cmdResume`, `cmdWorktreeStatus`, `cmdWorktreeFinalize` all invoke `execFileSync` with paths derived from external data (git output, user args, gh API), plus `cmdWorktreeFinalize` performs cross-directory file writes.

### Findings
- H1/H2 (same as code review): missing `isSafeName` on `--project` — path traversal + stray write risk. Fixed.
- No command injection: all `execFileSync` calls use argument arrays, not shell strings.
- No hardcoded secrets.
- No TOCTOU exploitable risk.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-reviewer | invoked | .cache/code-reviewer.md | |
| security-reviewer | invoked | .cache/security-reviewer.md | filesystem writes + external args |
| review-fix executors | N/A | Trivial Inline Edits x3 | One-char regex + one-line isSafeName x2, all in write set |
| advisor critical gate | N/A | No CRITICAL findings | |

## Fixes Applied

1. **`cmdPickNext` branch dedup regex** (`scripts/kaola-workflow-claim.js` line 2142): changed `replace(/^\*\s*/, '')` → `replace(/^[*+]\s*/, '')`. Git marks linked-worktree branches with `+` not `*`; old regex silently excluded them from the claimed set.

2. **`isSafeName` in `cmdResume`** (`scripts/kaola-workflow-claim.js`): added `assert(isSafeName(project), '--project must be a simple folder name with no path separators')` before `projectDir` construction. Identical to established pattern at line 342.

3. **`isSafeName` in `cmdWorktreeFinalize`** (`scripts/kaola-workflow-claim.js`): added same assert after `assert(args.project, 'worktree-finalize requires --project')`.

4. **Test 17B** (`scripts/simulate-workflow-walkthrough.js`): wrote `ROADMAP.md` with `#701` into `epic17Tmp/kaola-workflow/` before the second `pick-next` call so the offline ROADMAP fallback surfaces issue 701 as a candidate and the branch dedup filter is the actual mechanism rejecting it.

5. **Drift mirror sync**: `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` re-synced after all three `scripts/kaola-workflow-claim.js` fixes.

## Validation Evidence

| Command | Result | Notes |
|---------|--------|-------|
| `npm test` (post-fixes) | PASS | All 5 checks green |

Cited Phase 4 evidence for unchanged test scope. Full-suite re-run done post-fixes confirms no regression.

## Follow-Up Items (MEDIUM/LOW — do not block Phase 6)

- MEDIUM-1: Refactor cmdPickNext/cmdResume/cmdWorktreeFinalize to extract helpers and stay under 50-line cap
- MEDIUM-2: Log provisioning errors to stderr in cmdPickNext (matching cmdClaim at line 1364)
- MEDIUM-3: Normalize `issue` field to integer in `cmdResume` output
- MEDIUM-4: Fix Phase-4 Worktree Discovery block to derive COORD_ROOT from main worktree via `git worktree list --porcelain` (not `--show-toplevel` from current dir)
- MEDIUM-5: Add failure-path test coverage to Epic Case 17 (no-project resume, missing worktree finalize, dirty-check abort, commit-created assertion)
- MEDIUM-6: Strengthen contract validator assertions to include dispatcher string checks
- LOW-1: Anchor `refs/heads/` replacement regex in `cmdWorktreeStatus`
- LOW-2: Extract phase-routing table from `cmdResume` if/else chain
- LOW-3: Derive `.kw` cleanup path from `pick17a.worktree_path` in 17F rather than string concatenation
- LOW-4: Minor `module.exports` formatting consistency

## Review Status
PASSED WITH FOLLOW-UPS
