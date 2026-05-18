# Architect Revision 1 — Issue #80

## Changes from Original Blueprint

### Correction 1: Added KAOLA_CLAIM extraction + `acquired` guard

Both `commands/workflow-next.md` and `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md` now:
- Extract `KAOLA_CLAIM` from `$STARTUP_OUT` using the `claim` JSON key
- Guard: `[ "$KAOLA_CLAIM" = "acquired" ]` (not just `[ -n "$KAOLA_PROJECT" ]`)
- Prevents releasing `owned` folders (prior session adoption)

### Correction 2: Issue-604 fixture confirmed clear

`writeGhShimForStartup` uses generic `*"issue view"*` match — any issue number works. No fixture change needed.

### Key note on variable name: `project` vs `selected_project`

Both `project` and `selected_project` are present in startup JSON output. Using `project` key is correct and consistent with GitLab SKILL pattern.

## Exact Edit Specifications

### Task A — `scripts/simulate-workflow-walkthrough.js`

Insert before `} finally {` in `testFinalizeReleaseCleansWorktree`:

old_string:
```
    assert(fs.existsSync(path.join(tmp, 'kaola-workflow', 'archive', 'issue-603')), 'keep-worktree finalize should still archive active folder');
  } finally {
```

new_string: adds issue-604 startup+release+assert block between

### Task B — `commands/workflow-next.md`

**B1**: Insert KAOLA_PROJECT and KAOLA_CLAIM lines after KAOLA_WORKTREE_PATH extraction  
**B2**: Replace recovery block — adds guarded release: `[ "$KAOLA_CLAIM" = "acquired" ] && [ -n "$KAOLA_PROJECT" ] && node "$CLAIM_JS" release --project "$KAOLA_PROJECT" --reason git-freshness-block`

### Task C — `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md`

**C1**: Insert KAOLA_CLAIM line after PICK_NEXT_PROJECT extraction line  
**C2**: Insert `### Git Freshness Block Recovery` subsection with `[ "$KAOLA_CLAIM" = "acquired" ] && [ -n "$PICK_NEXT_PROJECT" ] && node "$claim_script" release ...`

## Variables per file

| File | Project var | Claim var | Script var |
|------|-------------|-----------|------------|
| commands/workflow-next.md | $KAOLA_PROJECT | $KAOLA_CLAIM | $CLAIM_JS |
| gitlab/skills/SKILL.md | $PICK_NEXT_PROJECT | $KAOLA_CLAIM | $claim_script |
