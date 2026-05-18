# Advisor Ideation Cache — issue-32

## Verdict
Plan adopted with one essential addition for Gap 1 and three smaller corrections.

## What's Sound
- Three-gap structure mirrors the issue; "don't touch `cmdClaim` / don't change `shouldSweep`" constraints preserved
- TDD-first ordering (failing synthetic-sweep test before predicate) is correct
- UUID4 regex is the right discriminator because `crypto.randomUUID()` produces v4 only
- Mirror-after-lease-guard ordering is correct

## Critical Addition — Gap 1's Safety Net Is Illusory Without Broader Mirror

The plan claims Gap 2's mirror covers Gap 1 as a fallback, then admits in the same paragraph that the mirror only handles `kaola-workflow/{project}/` and **not** the actual doc files doc-updater edits (README.md, CHANGELOG.md, .env.example). If doc-updater ignores the injected `worktree_path` directive, Gap 1 silently isn't fixed and no automated check catches it.

**Do not defer this to follow-up.** In Step 8 (artifact mirror), also relocate any other tracked-file modifications from the main worktree:

```bash
MAIN_ROOT="$(git rev-parse --show-toplevel)"
git -C "$MAIN_ROOT" diff --name-only HEAD | while read -r f; do
  case "$f" in
    kaola-workflow/*) continue ;;  # handled by artifact mirror
  esac
  mkdir -p "$ACTIVE_WORKTREE_PATH/$(dirname "$f")"
  cp "$MAIN_ROOT/$f" "$ACTIVE_WORKTREE_PATH/$f"
done
# Verify
if [ -z "$(git -C "$ACTIVE_WORKTREE_PATH" diff --name-only HEAD)" ] && [ -n "$(git -C "$MAIN_ROOT" diff --name-only HEAD)" ]; then
  echo "BLOCKED: main worktree has tracked changes but linked worktree does not"
  exit 1
fi
```

This makes Gap 1 robust to doc-updater's actual behavior. Prompt injection (Step 5) becomes a best-effort hint; the broader mirror is the guarantee.

## Three Smaller Corrections

1. **`--print-coord-root` is a planner assumption.** Confirmed absent via grep. Use `git rev-parse --git-common-dir` (pattern from walkthrough.js ~line 3900). Step 5's bash must use this.

2. **Add pre-mirror overwrite check.** Before `cp -R`, run `git -C "$ACTIVE_WORKTREE_PATH" status --porcelain "kaola-workflow/$KAOLA_PROJECT/"` and abort if non-empty. The "Phase 6 only writes to `.cache/*` after the mirror" guarantee breaks if a prior run was interrupted — would silently clobber legitimate data.

3. **Tighten synthetic-predicate scope.** Confirmed: session_id is always UUID4 in production (`crypto.randomUUID()`, `currentSessionId()` fallback). Non-UUID4 SIDs only occur from explicit test `--session sess-*` args. UUID4 predicate is safe.

## Net
Plan is adopted. Add doc-file mirror extension to Step 6/Step 8 (this is the actual fix for Gap 1, not a follow-up). Use `git rev-parse --git-common-dir` instead of `--print-coord-root`. Add pre-mirror overwrite check. Proceed with implementation.
