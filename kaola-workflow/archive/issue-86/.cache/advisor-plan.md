# Advisor Plan Gate — Issue #86

## Overall Verdict

Plan is sound. Three corrections to carry into phase3-plan.md; no architect revision needed.

## Verified Facts

### Fact 1 — KAOLA_CLAIM also needs inline extraction (correction to architect spec)

GitHub Step 0b (lines 98-99 of `commands/workflow-next.md`) extracts BOTH `KAOLA_PROJECT`
AND `KAOLA_CLAIM` from `$STARTUP_OUT`. The freshness recovery at line 156 uses:
```bash
[ "$KAOLA_CLAIM" = "acquired" ] && [ -n "$KAOLA_PROJECT" ] && node "$CLAIM_JS" release --project "$KAOLA_PROJECT" --reason git-freshness-block
```

GitLab Step 0b only exports `KAOLA_WORKTREE_PATH`. Therefore the GitLab freshness
recovery subsection must inline-extract BOTH variables from `$STARTUP_OUT`:
```bash
_KAOLA_PROJECT="$(node -e "try{process.stdout.write(JSON.parse(process.argv[1]).project||'')}catch(e){}" "$STARTUP_OUT")"
_KAOLA_CLAIM="$(node -e "try{process.stdout.write(JSON.parse(process.argv[1]).claim||'')}catch(e){}" "$STARTUP_OUT")"
[ "$_KAOLA_CLAIM" = "acquired" ] && [ -n "$_KAOLA_PROJECT" ] && node "$CLAIM_JS" release --project "$_KAOLA_PROJECT" --reason git-freshness-block
```

Architect spec mentioned only project extraction — CLAIM extraction must be added to Task 2.

### Fact 2 — writeState writes issue_iid (confirmed, no correction needed)

`writeState(root, project, issueIid, extra)` at line 37 writes `issue_iid: ` + issueIid
at line 55. So `writeState(root, 'drift-project', 60)` produces a folder with `issue_iid: 60`.
The drift test partition check will work correctly.

### Fact 3 — GitLab Step 3 "Co-active Folders" is a separate ## section (correction to architect spec)

GitLab `commands/workflow-next.md`:
- `## Startup Step 3 - Select Project` at line 172 ends at line 187
- `## Co-active Folders` at line 188 is a SEPARATE top-level `##` section, NOT inside Step 3

Architect said "after the 'Co-active Folders' paragraph already in Step 3" — incorrect.
The `### Co-active Folders Advisory` subsection must go at the END of `## Startup Step 3`
(after line 186, before line 188 `## Co-active Folders`). This creates the subsection
inside Step 3, matching GitHub's structure.

## Justification for partitionActiveAndDrift Export

The `partitionActiveAndDrift` extraction as an exported function is a justified divergence
from GitHub's inline `cmdStatus` pattern. Forge stubs do not cross spawnSync boundaries;
the drift test must call the function in-process via `withForge`. Recording this as
explicit design decision so Phase 5 review does not flag it as scope creep.

## Blockers

None. All gaps are factual corrections, not design reversals.
