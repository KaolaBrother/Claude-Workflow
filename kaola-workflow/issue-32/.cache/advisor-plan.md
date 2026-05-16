# Advisor Plan Cache — issue-32

## Verdict
Blueprint adopted with two correctness fixes, one retraction, and two structural notes.

## What's Sound
- Four-task TDD ordering (T1 RED → T2 GREEN → T3/T4 parallel GREEN) is dependency-safe
- `isSyntheticTestSession` additive predicate is correct — `shouldSweep` semantics unchanged
- UUID4 regex is accurate discriminator for `crypto.randomUUID()` production SIDs
- Mirror-after-cross-session-guard ordering is correct
- Gap 1 two-layer approach (prompt hint + Step 8 mirror guarantee) is sound

## Fix 1 — KAOLA_PROJECT Binding Inconsistency

The architect blueprint uses `${KAOLA_PROJECT}` in new bash blocks for `commands/kaola-workflow-phase6.md`. But `phase6.md` uses the `{project}` markdown template (substituted by Claude before execution), NOT a `$KAOLA_PROJECT` shell variable. The existing file at line 470 uses `{project}` directly: `LOCK_FILE="kaola-workflow/.locks/{project}.lock"`.

**Fix:** In `commands/kaola-workflow-phase6.md` bash blocks, use `{project}` as the template literal (e.g., `_LOCK_FILE="${_COORD_ROOT_RAW}/kaola-workflow/.locks/{project}.lock"`). `${KAOLA_PROJECT}` is correct in `SKILL.md` (which already uses it at lines 90, 101, 105, 139).

## Fix 2 — Mirror Loop: git status --porcelain over git diff --name-only

The architect uses `git diff --name-only HEAD` to enumerate files to copy. This misses:
- Untracked new files added in Phase 6
- Deletions (where there's no local file to copy but the linked worktree should not retain it)

**Fix:** Use `git status --porcelain` to enumerate changes, add a `[ -f "$(pwd)/$f" ]` guard before each `cp`, and skip the copy for deletions:

```bash
git status --porcelain | while IFS= read -r line; do
  f="${line:3}"
  case "$f" in kaola-workflow/*) continue;; esac
  if [ -f "$(pwd)/$f" ]; then
    mkdir -p "$ACTIVE_WORKTREE_PATH/$(dirname "$f")"
    cp "$(pwd)/$f" "$ACTIVE_WORKTREE_PATH/$f"
  fi
done
```

## Retraction — Drop Pre-Mirror Linked-Worktree Status Check

The architect blueprint includes a check `if [ -n "$_WT_STATUS" ]; then echo "BLOCKED..."` before the `cp -R`. This should be dropped. The overwrite-always policy (main worktree is authoritative source of truth for Phase 1-5 artifacts) is explicit in the design. Blocking on non-empty linked-worktree status prevents the mirror from ever running on a fresh linked worktree that has its own commits, breaking the normal flow. Trust the overwrite-always policy.

## Structural Note 1 — Shell Isolation Between Fences

In both `commands/kaola-workflow-phase6.md` and `SKILL.md`, the mirror block and the commit gate are **separate bash fences**. Each fence runs in an isolated shell context. `ACTIVE_WORKTREE_PATH` set in the mirror fence is NOT available in the commit gate fence. 

**Fix:** Duplicate the `ACTIVE_WORKTREE_PATH` resolution prelude (the 5-line block) at the top of the commit gate bash fence as well, before the `git -C "$ACTIVE_WORKTREE_PATH" add` and `git -C "$ACTIVE_WORKTREE_PATH" commit` lines.

## Structural Note 2 — T4 Structural Test Anchors

The structural grep assertions in `simulate-workflow-walkthrough.js` must grep for specific strings present in the modified phase files. Use assignment-form anchors that are guaranteed present:
- `ACTIVE_WORKTREE_PATH=` (the assignment line, NOT a comment containing this string)
- `git -C "$ACTIVE_WORKTREE_PATH"` (the actual git command)
- `Mirror MUST run after` (the comment in the mirror block, as specified in architect blueprint)

Do NOT anchor on comment prose that may vary. The assignment line `ACTIVE_WORKTREE_PATH=` is the most stable anchor.

## Net
Blueprint adopted. Apply Fix 1 (template literal), Fix 2 (porcelain loop), retract pre-mirror status check, duplicate resolution prelude in commit-gate fence, use assignment-form structural anchors. Proceed with T1→T2→T3/T4 implementation.
