# Phase 2 - Ideation: issue-30

## Approaches Evaluated

### Option A: Single PR, Monolithic
- Summary: Ship coordRoot migration + worktree provisioning + lifecycle + Codex parity in one PR
- Pros: One review cycle, no inter-PR sequencing
- Cons: ~600–900 lines across ~14 files, large bisect surface, migrator bug affects all in-flight sessions
- Risk: High
- Complexity: XL
- Architectural fit: Functional but ignores that coordRoot migration is independently shippable

### Option B: Two-PR Split (SELECTED)
- Summary: PR-1 ships coordRoot substrate; PR-2 ships worktree provisioning + lifecycle + Codex parity
- Pros: PR-1 lands low-risk substrate change in isolation; PR-2 is reviewable as additive worktree feature; ~2x bisect granularity; fixes latent `cmdWatchPr:1512` branch-delete ordering bug
- Cons: Two PR review cycles
- Risk: Low (migrator idempotent by construction)
- Complexity: PR-1 = Medium, PR-2 = Large
- Architectural fit: Best fit

### Option C: Three-PR Split (REJECTED)
- Summary: Split as (1) coordRoot, (2) worktree provisioning + lifecycle, (3) Codex parity
- Rejected: Violates locked decision "Full Codex parity in this issue" — creates a Codex regression window between PRs

---

## Advisor Findings

Advisor confirmed Approach B is sound with 5 mandatory detail corrections:

1. **Migrator atomicity**: Per-project migration required (not directory-level). For each `<legacy>/.locks/*.lock`, copy if `<new>/.locks/*.lock` doesn't exist. File-level idempotency.

2. **AC11 error message**: Must be actionable with recovery instruction:
   ```
   worktree missing at <path> for project <n>
   recover with:
     git worktree add <path> <branch>
     node scripts/kaola-workflow-claim.js patch-branch --project <n> --session <session_id> --branch <branch>
   ```

3. **Cwd-protection (AC13)**: `fs.realpathSync` throws on missing path — wrap in try/catch. Use `cwdReal === wtReal || cwdReal.startsWith(wtReal + path.sep)` (NOT `startsWith(wtReal)` — path prefix trap).

4. **Shell pwd grace** (issue §6 rule 4): When removing a worktree, next `/workflow-next` detects pwd-doesn't-exist and emits one line directing user back to main repo. 5-line router addition — must add or create explicit follow-up issue.

5. **Test isolation**: Split Epic Case 15 (14 sub-cases) into two independent cases:
   - Epic Case 15: AC1–AC6 (claim / resume / takeover)
   - Epic Case 16: AC7–AC13 (lifecycle / sweep / cwd-protection)

Advisor also resolved all 5 missing facts:
1. `--recreate-worktree` scope: Defer; satisfy AC11 with actionable error message only
2. `kaola-workflow-sink-merge.js` shape: Read in Phase 3 before committing step 15 scope
3. `gh` shim pattern: Check Epic Cases 13–14 first; add `installGhShim(tmp, responseMap)` if absent
4. Pre-commit hook legacy fallback: Confirmed; comment explicitly: `# Legacy fallback (dropped in v3.3.x)`
5. `lock.branch` priority: Confirmed; `lock.branch` authoritative once provisioned; fall back to `buildSinkBranchName(...)` only when null

---

## Selected Approach

**Approach B — Two-PR Split**

Rationale: The coordRoot migration touches every active session's lock-file path and deserves an isolated blast radius. PR-1 ships that substrate cleanly, giving PR-2 a known-stable foundation for additive worktree provisioning + lifecycle. Approach A is viable but ships a riskier combined diff. Approach C creates a Codex parity gap that violates the issue's locked scope.

**PR-1 scope**: `getCoordRoot()`, per-project `migrateLegacyCoordState()`, path helper threading (locksDir/sessionsDir/tickerPidPath gain `coordRoot` param), pre-commit hook update, repair-state update, validate-workflow-contracts update, Codex mirror, focused coordRoot test case.

**PR-2 scope**: `worktreePathFor()`, `provisionWorktree()`, `removeWorktree()`, `drainPendingRemovals()`, claim wiring, resume path, watchPr MERGED/CLOSED lifecycle, sink-merge lifecycle, sweep additions, Codex parity + 9 SKILL.md shims, Epic Cases 15 (AC1–AC6) + 16 (AC7–AC13).

---

## Out of Scope (explicit)

- No `git config worktree.guessRemote` or `core.worktree` rewriting
- No serialization of concurrent `git worktree add` (O_EXCL already serializes per-project)
- No quota/limit on worktree count
- No GC policy for `.abandoned-<ts>/` dirs
- No automatic `.gitignore` for `<repo>.kw/`
- No backporting lifecycle changes to existing non-worktree sessions
- No deletion of legacy `<root>/kaola-workflow/.locks/` in this issue (deferred to v3.3.x)
- No `--recreate-worktree` subcommand (deferred to follow-up)

---

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
