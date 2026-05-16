# Planner Output — issue-30

## Overview

Migrate coordination state (locks, sessions, tickers) from worktree-local `<root>/kaola-workflow/` to repo-shared `<repo>/.git/kaola-workflow/`, then auto-provision per-session git worktrees at `<repo>.kw/<project>/` as part of the claim transaction. Auto-lifecycle worktrees on PR MERGED / sink-merge success, with cwd-protection for self-removal. Ship full Codex parity and a one-minor-version backwards-compat fallback.

---

## Approaches Evaluated

### Approach A — Single PR, monolithic

Ship the entire deliverable in one PR.

**Pros**
- Matches the issue's "in this issue" framing literally.
- One review cycle; no inter-PR sequencing.

**Cons**
- ~600–900 lines of changes across ~14 files.
- Bisect surface is large.
- Migrator bug affects all in-flight sessions if it lands broken.

**Risks**: Migrator bug surfaces only after merge.
**Complexity**: XL
**Architectural fit**: Functional but ignores that coordRoot migration is independently shippable.

---

### Approach B — Two-PR split (RECOMMENDED)

**PR-1**: coordRoot migration only — `getCoordRoot()`, thread `coordRoot` through all path helpers, pre-commit hook, repair-state, migrator + fallback reader, validate-workflow-contracts update, focused Epic Case 15-prep test. No worktree provisioning yet; lock gains `worktree_path: null` placeholder.

**PR-2**: Worktree provisioning + lifecycle + Codex parity + Epic Case 15 ACs 1–13.

**Pros**
- PR-1 lands a low-risk substrate change with isolated blast radius.
- PR-2 is reviewable as "additive worktree feature on top of stable coordRoot".
- Bisect granularity is ~2x better.
- Fixes the latent `cmdWatchPr:1512` branch-delete bug alongside worktree-remove.

**Cons**
- Two PR review cycles.

**Risks**: Migrator idempotency across PR-1→PR-2 boundary (mitigated — idempotent by construction).
**Complexity**: PR-1 = Medium, PR-2 = Large
**Architectural fit**: Best fit.

---

### Approach C — Three-PR split (REJECTED)

Split as: (1) coordRoot, (2) worktree provisioning + lifecycle, (3) Codex parity.

**Rejected because**: violates locked decision "Full Codex parity in this issue" — creates a Codex regression window between PRs.

---

## Recommended: Approach B (Two-PR Split)

**Rationale**: PR-1 derisks the most consequential change (touching every active session's lock-file path) by shipping it alone. PR-2 builds on a known-stable foundation.

---

## Architecture Changes

### New functions in `scripts/kaola-workflow-claim.js`

- `getCoordRoot()` — `git rev-parse --git-common-dir`, resolve to absolute path. Always distinct from `getRoot()`.
- `migrateLegacyCoordState(root, coordRoot)` — idempotent: if new `.locks/` empty AND legacy non-empty, copy files; otherwise no-op. Runs at top of every subcommand.
- `worktreePathFor(root, project)` — deterministic `<dirname(root)>/<basename(root)>.kw/<project>/`.
- `provisionWorktree(root, project, branch)` — `mkdir -p` the `.kw/` parent, `git worktree add` (with or without `-b` per AC12).
- `removeWorktree(coordRoot, project, lock, opts)` — dirtiness check; dirty → rename to `.abandoned-<ISO>`; clean → `git worktree remove --force`; cwd-protection → write `.pending-removal/<project>.json`, return `{deferred: true}`.
- `drainPendingRemovals(coordRoot)` — invoked from sweep; drains `.pending-removal/` entries.

### Path helper signature changes

| Helper | Argument |
|---|---|
| `locksDir`, `sessionsDir`, `tickerPidPath`, `lockPath`, `sessionPath` | `coordRoot` |
| `roadmapDir`, project state file paths | `root` (unchanged) |

### Lock file additions
- `worktree_path`: absolute path or null (null on legacy locks).
- Machine-local: readers ignore if `machine_id !== getMachineId()`.

### Startup receipt additions
- `worktree_path`: absolute path or null.
- `branch`: branch name or null.

### Claim transaction failure boundary

```
1. writeLockFile (O_EXCL atomic)
2. writeSessionFile
3. postGitHubClaim + tiebreaker
4. provisionWorktree  ← failure here: releaseSession + exit 2
5. patch lock with worktree_path + branch
6. updateSinkLease
```

---

## Implementation Steps

### PR-1: coordRoot migration (substrate)

1. Add `getCoordRoot()` and `migrateLegacyCoordState()` near line 80.
2. Repoint path helpers: `locksDir(coordRoot)`, etc. Update all ~30+ call sites.
3. Add backwards-compat fallback reader (new path authoritative; never union).
4. Update pre-commit hook (line 54): resolve via `--git-common-dir` + bash relative-path handling + legacy fallback.
5. Update `kaola-workflow-repair-state.js:80`: add coordRoot param to `projectOwner()`.
6. Replace `.gitignore` assertions in `validate-workflow-contracts.js:211–212` with new invariant assertions.
7. Mirror all PR-1 changes to `plugins/kaola-workflow/scripts/`.
8. Add focused coordRoot test case (coordRoot-visibility, precursor to AC1).

### PR-2: Worktree provisioning + lifecycle + Codex parity

9. Add `worktreePathFor()` and `provisionWorktree()` near line 381.
10. Wire provisioning into `cmdClaim()` after tiebreaker resolves.
11. Resume path: reuse existing worktree (AC4); loud failure if missing (AC11).
12. Add `removeWorktree()` + dirtiness handling + `.abandoned-<ts>` + cwd-protection.
13. Wire removal into `cmdWatchPr` MERGED branch (fix latent branch-delete ordering bug).
14. Wire removal into `cmdWatchPr` CLOSED branch.
15. Wire removal into `kaola-workflow-sink-merge.js` on exit 0.
16. Add `git worktree prune` + `drainPendingRemovals()` to `cmdSweep()`.
17. Mirror all PR-2 script changes to Codex scripts dir.
18. Add `cd "$KAOLA_WORKTREE_PATH" 2>/dev/null || true` shim to 9 SKILL.md files.
19. Add Epic Case 15 (sub-cases 15A–15N covering AC1–AC13).
20. Update contract assertions in `validate-workflow-contracts.js`.

---

## Testing Strategy

### Helper to add (top of walkthrough)
- `createSecondWorktree(tmp, branchName)` — `git worktree add <tmp>-wt-N -b <branch>`
- `installGhShim(tmp, responseMap)` if not already present

### Epic Case 15 sub-cases

| Sub-case | AC | What's tested |
|---|---|---|
| 15A | AC1 | Two worktrees, second claim for same project exits 2 |
| 15B | AC2 | Successful claim: lock + receipt have worktree_path + branch |
| 15C | AC3 | Tiebreaker yield: loser's lock released, no worktree at would-be path |
| 15D | AC4 | Same-session re-claim: verdict `owned`, no new worktree |
| 15E | AC5 | Foreign live owner: new session skips, never touches owner's worktree |
| 15F | AC6 | `--force-live-takeover`: adopts existing worktree, verdict `forced` |
| 15G | AC7 | watch-pr MERGED: lock released, worktree removed, branch deleted |
| 15H | AC7 dirty | watch-pr MERGED + dirty worktree: dir renamed `.abandoned-<ts>` |
| 15I | AC8 | sink-merge exit 0: worktree removed, uncommitted changes → `.abandoned-<ts>` |
| 15J | AC9 | Pre-commit from worktree-B blocks cross-session commit |
| 15K | AC10 | Sweep: `git worktree prune` cleans orphan entries |
| 15L | AC11 | Manual worktree delete + re-claim: loud failure with recovery instruction |
| 15M | AC12 | Branch pre-exists: `git worktree add <path> <branch>` (no `-b`) succeeds |
| 15N | AC13 | watch-pr MERGED while cwd inside worktree: lock released, removal deferred, `.pending-removal` written |

---

## Risks & Mitigations

- `git rev-parse --git-common-dir` returns relative path: always `path.resolve(root, output)`.
- Path-prefix cwd detection fails under symlinks: `fs.realpathSync` both sides.
- Migrator runs twice: idempotent by construction (copy only when new is empty).
- `worktree_path` read by different machine: ignore when `machine_id !== getMachineId()`.
- SKILL.md shim breaks when `KAOLA_WORKTREE_PATH` unset: `cd "..." 2>/dev/null || true`.
- `cmdWatchPr` branch-delete before worktree-remove: fixed in step 13.

---

## Items NOT to Build

- No `git config worktree.guessRemote` or `core.worktree` rewriting.
- No serialization of concurrent `git worktree add` (O_EXCL already serializes per-project).
- No quota/limit on worktree count.
- No GC policy for `.abandoned-<ts>/` dirs.
- No automatic `.gitignore` for `<repo>.kw/`.
- No backporting lifecycle changes to existing non-worktree sessions.
- No deletion of legacy `<root>/kaola-workflow/.locks/` in this issue (deferred to v3.3.x).

---

## Missing Facts (for confirmation)

1. **`--recreate-worktree` scope**: Recommend satisfying AC11 with a clear error message (no new subcommand); defer subcommand to follow-up.
2. **`kaola-workflow-sink-merge.js` current shape**: Must read full script before step 15 to confirm whether a `git checkout main` dance exists that needs removal.
3. **Fake `gh` shim pattern in walkthrough**: Verify Epic Cases 13–14 pattern before writing 15C/15G/15H/15N.
4. **Pre-commit hook legacy fallback**: Hook reads new coordRoot path first, falls back to legacy during fallback window. Confirm and document in hook comments.
5. **`lock.branch` vs `buildSinkBranchName` priority**: `lock.branch` authoritative once provisioned; fall back to `buildSinkBranchName` only when null. Confirm.
