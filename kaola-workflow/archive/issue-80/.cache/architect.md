# Architect Blueprint — Issue #80

## Design Decisions

- **GitLab SKILL variable**: Uses `$PICK_NEXT_PROJECT` (already extracted from `project` key at line 115), NOT `$KAOLA_PROJECT` (which is not extracted in that file). Reference SKILL has latent bug using `$KAOLA_PROJECT` without extraction — intentionally diverge.
- **`KAOLA_PROJECT` extraction in command**: Insert after L92 `KAOLA_WORKTREE_PATH` line, using `selected_project` JSON key.
- **Guard**: `[ -n "$KAOLA_PROJECT" ] && ...` so it's a no-op if extraction failed (e.g., claim:none, no_target).
- **Test**: Adds issue-604 startup+release block inside `testFinalizeReleaseCleansWorktree` — regression guard for `--reason git-freshness-block` reason string.

## Files to Modify

| File | Changes | Why |
|------|---------|-----|
| `commands/workflow-next.md` | (A) Add KAOLA_PROJECT extraction after L92; (B) Replace L136-146 recovery block | Bug fix: add release call |
| `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md` | Insert `### Git Freshness Block Recovery` after L144 | Bug fix: missing subsection |
| `scripts/simulate-workflow-walkthrough.js` | Extend `testFinalizeReleaseCleansWorktree` with 604 startup+release block | Regression guard |

## Files to Create: None

## Build Sequence

1. Tasks A, B, C in parallel (disjoint write sets)
2. Validate: `node scripts/simulate-workflow-walkthrough.js`

## Task A — Extend test

**File**: `scripts/simulate-workflow-walkthrough.js`
**Edit**: In `testFinalizeReleaseCleansWorktree`, after the release-602 + worktree-assertion block (after the existing `runClaimOnline(['release', '--project', 'issue-602', '--reason', 'test'], ...)` at ~L589), insert before the 603 startup block:

```js
const s604 = runClaimOnline(['startup', '--target-issue', '604'], tmp, binDir);
assert(s604.claim === 'acquired', 'startup 604 should acquire');
const wt604 = s604.worktree_path;
assert(fs.existsSync(wt604), 'worktree 604 should exist after startup');
runClaimOnline(['release', '--project', 'issue-604', '--reason', 'git-freshness-block'], tmp, binDir);
assert(!fs.existsSync(wt604), 'worktree 604 should be gone after release with git-freshness-block reason');
```

Mirror: L589 `release --reason test` + L590 worktree-gone assertion.

## Task B — Fix `commands/workflow-next.md`

**Change A**: Insert after L92 (`KAOLA_WORKTREE_PATH` extraction line):
```bash
  KAOLA_PROJECT="$(node -e "try{process.stdout.write(JSON.parse(process.argv[1]).selected_project||'')}catch(e){}" "$STARTUP_OUT" 2>/dev/null)" || true
```

**Change B**: Replace the `### Git Freshness Block Recovery` block (L136-146). Current text ends with "resolve manually before retrying `/workflow-next`." Replace final two sentences with:

```
If the block persists (merge/rebase required, dirty worktree), release the just-claimed folder before stopping:

```bash
[ -n "$KAOLA_PROJECT" ] && node "$CLAIM_JS" release --project "$KAOLA_PROJECT" --reason git-freshness-block
```

This removes the claimed folder and worktree atomically. Do not leave a claimed folder orphaned when the startup sequence cannot complete. Resolve the Git state manually, then retry `/workflow-next`.
```

## Task C — Fix GitLab SKILL

**File**: `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md`
**Insert** after line 144 ("Fast-forward only when clean and behind-only. Stop before merge, rebase, stash, reset, conflict resolution, or dirty-worktree sync."):

```
### Git Freshness Block Recovery

If startup succeeds (folder claimed, worktree provisioned) but the subsequent Git freshness check blocks (local is behind remote, dirty worktree, or merge/rebase required), run:

```bash
node "$claim_script" release --project "$PICK_NEXT_PROJECT" --reason git-freshness-block
```

This releases the just-claimed folder and removes the worktree before stopping. Do not leave a claimed folder orphaned when the startup sequence cannot complete.
```

Note: uses `$PICK_NEXT_PROJECT` (already in scope), not `$KAOLA_PROJECT`.

## Parallelization

| Group | Tasks | Safe because |
|-------|-------|--------------|
| Parallel | A, B, C | Disjoint write sets |
| Sequential after | Validate | `node scripts/simulate-workflow-walkthrough.js` |

## Out of Scope
- `plugins/kaola-workflow-gitlab/commands/workflow-next.md` — deferred to #86
- `scripts/kaola-workflow-claim.js` — no changes
- `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` — reference only
