# Advisor Gate — Phase 2 Ideation, issue-30

## Verdict: Approach B (two-PR split) is sound. Proceed.

The planner's recommendation is correct. Approach C is correctly rejected (Codex-parity gap). Approach A (monolithic) is viable but the planner is right that the coordRoot migration deserves to land alone — it's the change that touches every active session's lock-file path, and shipping it independently means a clean rollback story if the migrator misbehaves.

One framing note: the two-PR split is a **delivery** strategy, not an **implementation** strategy. The agent can implement everything in one Phase 4 pass and split the commits/PRs at submission. Don't let "two PRs" force two implementation passes.

---

## Concerns that should change details (not the approach)

### 1. Migrator atomicity — per-project granularity required

"Copy when new directory is empty" is wrong. Scenario: user has legacy locks for A, B; upgrades; starts fresh claim for C → writes to new path → new is no longer empty; A and B's locks stranded in legacy forever.

**Fix**: per-project migration. For each `<legacy>/.locks/*.lock`, if the corresponding `<new>/.locks/*.lock` doesn't exist, copy it. Same for sessions, tickers, startup receipts. Idempotent at the file level.

### 2. AC11 error message must be actionable

Satisfy AC11 with a specific recoverable error message:
```
worktree missing at <path> for project <n>
recover with:
  git worktree add <path> <branch>
  node scripts/kaola-workflow-claim.js patch-branch --project <n> --session <session_id> --branch <branch>
```

### 3. Cwd-protection (AC13) — `fs.realpathSync` throws on missing path

```js
let wtReal;
try { wtReal = fs.realpathSync(worktreePath); } catch (_) { return {deferred: false, removed: false}; }
const cwdReal = fs.realpathSync(process.cwd());
// Use: cwdReal === wtReal || cwdReal.startsWith(wtReal + path.sep)
// NOT: cwdReal.startsWith(wtReal)  ← path prefix trap (/a/b vs /a/bcd)
```

### 4. Shell pwd grace (issue §6 rule 4) — missing from plan

Issue specifies: when removing a worktree, the next `/workflow-next` detects pwd-doesn't-exist and emits one line directing user back to main repo. This is a 5-line router addition — add it or create a follow-up issue explicitly.

### 5. Test isolation — split Epic Case 15 into two

14 sub-cases in one Epic Case means a failure in 15A halts all remaining. Split:
- **Epic Case 15** = AC1–AC6 (claim / resume / takeover)
- **Epic Case 16** = AC7–AC13 (lifecycle / sweep / cwd-protection)

---

## Resolution of "Missing Facts"

1. **`--recreate-worktree` scope**: Defer (option b). In-scope: actionable error message (concern #2).
2. **`kaola-workflow-sink-merge.js` shape**: Read in Phase 3 before committing step 15 scope. Locked decision #2 ("no checkout dance") makes its removal in-scope if present.
3. **gh shim pattern**: Check Epic Cases 13–14 first; add `installGhShim(tmp, responseMap)` if not present.
4. **Pre-commit hook legacy fallback**: Confirmed. Comment explicitly: `# Legacy fallback (dropped in v3.3.x)`.
5. **`lock.branch` priority**: Confirmed. `lock.branch` authoritative once provisioned; fall back to `buildSinkBranchName(...)` only when null.

---

## Scope Realism Note

PR-2 is realistically a multi-session Phase 4. Recommend explicit task splitting in Phase 3 with natural checkpoints (e.g., run walkthrough after step 10 before continuing to lifecycle).

---

## Summary

- Proceed with Approach B. No need to reopen the approach decision.
- Apply 5 detail fixes above.
- Resolve missing facts as above — none block Phase 3.
