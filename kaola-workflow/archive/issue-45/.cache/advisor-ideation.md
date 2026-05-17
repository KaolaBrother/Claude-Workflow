# Advisor Ideation Gate: issue-45

## Question Asked

Given Phase 1 research findings for issue-45 (4 stale-state flaws + 3 lifecycle gaps in
kaola-workflow-claim.js and finalize/next SKILL.md), is the planner's Option B (risk-stratified
3-phase commits) the right approach? Are there missed risks, missed approaches, or gotchas?

## Advisor Response

**Recommendation: Option B is correct.** The risk stratification maps cleanly to blast radius and
test coverage needs. No major missed approaches.

### Refinements to Planner Output

**Refinement 1 — KAOLA_WORKTREE_PATH scope (blocking verification):**
The planner states the fix is in `kaola-workflow-next/SKILL.md`. Before writing the phase file,
verify whether Claude commands in `commands/workflow-next.md` also reference `KAOLA_WORKTREE_PATH`.
If commands/ references it, the fix scope may extend beyond Codex SKILL.md.

*Resolution:* Grep of `commands/` returned no matches. Scope confirmed as Codex SKILL.md only.
Claude commands do not reference `KAOLA_WORKTREE_PATH`. No change to the planner's Phase 3 scope.

**Refinement 2 — Gap B abandoned GC: prefer suffix timestamp over mtime:**
The planner proposes `fs.statSync(abandonedPath).mtimeMs` for age check. This is fragile — mtime
can drift on copy/restore operations. The `.abandoned-` suffix already encodes the ISO timestamp
(e.g. `.abandoned-2026-05-17T12-30-00-000Z`). Parse that suffix directly:
```js
const m = dir.match(/\.abandoned-(\d{4}-\d{2}-\d{2}T[\d-]+Z)$/);
const abandonedAt = m ? new Date(m[1].replace(/-(\d{2})-(\d{2})-(\d{3})Z$/, ':$1:$2.$3Z')).getTime() : null;
```
Fall back to mtime only if the suffix parse fails. Test 17U must use this parse path — use a
directory name with an old timestamp rather than relying on real elapsed time.

**Refinement 3 — Gap C unregistered dir detection: use realpathSync for dedup:**
The planner proposes comparing `worktree_path` strings. Git worktree paths may be symlinks. Use
`fs.realpathSync(p)` on both the registered entries and the scanned dirs before comparing, to
avoid false "unregistered" reports when symlinks and canonical paths diverge.

**Refinement 4 — Flaw 2 row format: match both `in_progress` and `in-progress`:**
Archived phase4-progress.md files confirm `in_progress` (underscore) is the canonical format.
However, earlier versions used `in-progress` (hyphen). The fix must match both variants to handle
legacy files. Use regex: `/\|\s*(pending|in[_-]progress)\s*\|/i`.

**Refinement 5 — Test 17U: use named directory timestamp, not real elapsed time:**
Constructing `.abandoned-<old-ISO>` directory names with a timestamp >30min in the past is more
reliable than sleeping 30 minutes. Create two dirs: one with an old-ISO suffix (should be GC'd)
and one with a recent-ISO suffix (should be retained). Assert cmdSweep removes only the old one.

### Risks Not Captured by Planner

- **`rmdirSync` on Windows**: `ENOTEMPTY` behavior is consistent across Node platforms. No
  additional guard needed; the existing catch block suffices.
- **Phase 3 `worktree_path` read**: must source from the lock file, not `workflow-state.md`
  (lock file is the authoritative location). The planner's Step 10/11 should read from
  `coordRoot/locks/{project}.lock.json`. Verify the lock file field name is `worktree_path`.
- **`target_mismatch` NO-WRITE invariant**: The `writeStartupReceipt` refactor must remain a
  no-op for that branch. A comment in the code is sufficient to preserve the invariant; no
  structural change needed.

### No Missed Approaches

Option A (one-shot) is correctly rejected. Option C (TDD per fix) is correctly rejected.
No fourth approach is warranted.

## Final Verdict

**Proceed with Option B.** Apply all 5 refinements above. Refinements 2/4/5 affect the test
cases. Refinements 1/3 are in the implementation steps. Refinement 5 affects the test 17U
strategy (suffix-based timing, not real elapsed time).
