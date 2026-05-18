# Phase 3 - Plan: issue-80

## Blueprint

### Files to Create
None.

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `commands/workflow-next.md` | (B1) Add KAOLA_PROJECT + KAOLA_CLAIM extraction after KAOLA_WORKTREE_PATH; (B2) Replace `### Git Freshness Block Recovery` block with guarded release call | Bug: missing release when freshness blocks after acquired startup |
| `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md` | (C1) Add KAOLA_CLAIM extraction after PICK_NEXT_PROJECT; (C2) Insert `### Git Freshness Block Recovery` subsection | Bug: missing subsection entirely |
| `scripts/simulate-workflow-walkthrough.js` | (A) Insert issue-604 startup+release block in `testFinalizeReleaseCleansWorktree` | Regression guard for `--reason git-freshness-block` |

### Build Sequence
1. Tasks A, B, C in parallel (disjoint write sets)
2. Validate: `node scripts/simulate-workflow-walkthrough.js`

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | A (walkthrough.js), B (workflow-next.md), C (gitlab SKILL.md) | Disjoint write sets |
| B | Validate | After all writes |

### External Dependencies
None — `release` subcommand and `--reason` flag already supported in `kaola-workflow-claim.js`.

## Task List

### Task A: Extend test regression guard
- File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/simulate-workflow-walkthrough.js`
- Depends On: none
- Parallel Group: A
- Action: MODIFY
- Implement: Inside `testFinalizeReleaseCleansWorktree`, after `assert(fs.existsSync(path.join(tmp, 'kaola-workflow', 'archive', 'issue-603')))` and before `} finally {`, insert:
  ```js
  const s604 = runClaimOnline(['startup', '--target-issue', '604'], tmp, binDir);
  assert(s604.claim === 'acquired', 'startup 604 should acquire');
  const wt604 = s604.worktree_path;
  assert(fs.existsSync(wt604), 'worktree 604 should exist after startup');
  runClaimOnline(['release', '--project', 'issue-604', '--reason', 'git-freshness-block'], tmp, binDir);
  assert(!fs.existsSync(wt604), 'worktree 604 should be gone after git-freshness-block release');
  ```
- Mirror: L589 `release --reason test` + L590 worktree-gone assertion pattern
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task B: Fix commands/workflow-next.md
- File: `commands/workflow-next.md`
- Write Set: `commands/workflow-next.md`
- Depends On: none
- Parallel Group: A
- Action: MODIFY
- Implement B1 (after KAOLA_WORKTREE_PATH line):
  ```bash
  KAOLA_PROJECT="$(node -e "try{process.stdout.write(JSON.parse(process.argv[1]).project||'')}catch(e){}" "$STARTUP_OUT" 2>/dev/null)" || true
  KAOLA_CLAIM="$(node -e "try{process.stdout.write(JSON.parse(process.argv[1]).claim||'')}catch(e){}" "$STARTUP_OUT" 2>/dev/null)" || true
  ```
- Implement B2 (replace recovery block, last line of section): Change "resolve manually before retrying `/workflow-next`." to add guarded release + stop instruction:
  ```bash
  [ "$KAOLA_CLAIM" = "acquired" ] && [ -n "$KAOLA_PROJECT" ] && node "$CLAIM_JS" release --project "$KAOLA_PROJECT" --reason git-freshness-block
  ```
- Mirror: L92 `KAOLA_WORKTREE_PATH` extraction pattern with `project`/`claim` keys; `[ -n "$KAOLA_WORKTREE_PATH" ]` guard style
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task C: Fix GitLab SKILL
- File: `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md`
- Write Set: `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md`
- Depends On: none
- Parallel Group: A
- Action: MODIFY
- Implement C1 (after PICK_NEXT_PROJECT extraction):
  ```bash
  KAOLA_CLAIM="$(node -e "try{process.stdout.write(JSON.parse(process.argv[1]).claim||'')}catch(e){}" "$STARTUP_OUT" 2>/dev/null)" || true
  ```
- Implement C2 (insert `### Git Freshness Block Recovery` subsection after "Stop before merge, rebase..." line, before "If GitLab is available"):
  Includes guarded release: `[ "$KAOLA_CLAIM" = "acquired" ] && [ -n "$PICK_NEXT_PROJECT" ] && node "$claim_script" release --project "$PICK_NEXT_PROJECT" --reason git-freshness-block`
- Mirror: GitHub Codex SKILL pattern adapted for `$claim_script`/`$PICK_NEXT_PROJECT` variables
- Validate: `node scripts/simulate-workflow-walkthrough.js`

## Advisor Notes

- `verdict: owned` guard critical: `claim` field is `"acquired"` only for newly claimed folders; `"owned"` for adopted prior-session folders — never release `owned`
- `cmdRelease` is already correct; reason string is passed through as free-form string
- GH shim in `writeGhShimForStartup` accepts any issue number; no fixture update needed for issue-604
- CHANGELOG entry (`[Unreleased]`) required per CLAUDE.md doc checklist — add in Phase 4/6
- Deferred: `plugins/kaola-workflow-gitlab/commands/workflow-next.md` gap belongs to #86

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | invoked | .cache/architect-revision-1.md | advisor found 2 gaps; 1 revision cycle |
