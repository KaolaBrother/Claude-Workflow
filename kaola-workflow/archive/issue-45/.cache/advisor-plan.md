# Advisor Plan Gate: issue-45

## Blocking — Verify Before Implementation

**1. Lock file field name: VERIFIED**
`lockPath(coordRoot, project)` → `{coordRoot}/kaola-workflow/.locks/{project}.lock`
Lock file written at claim.js:1595: `{ worktree_path: wtPath, branch }` — field is `worktree_path`. ✓
Reading in P3-A: `readJsonFile(lockPath(coordRoot, owned.project))` and `readJsonFile(lockPath(coordRoot, targetResult.project))` will yield the correct value.

**2. `worktreePathFor(root, '')` for parent dir: VERIFIED**
Function at line 588–589: `path.join(path.dirname(root), path.basename(root) + '.kw', project)`.
With `project = ''`: `path.join('/foo/workspace', 'kaola-workflow.kw', '')` = `/foo/workspace/kaola-workflow.kw`. ✓
This returns the parent `.kw/` dir directly. Use this in P2-B and P2-C.

**3. scanPhaseArtifacts test accessibility (17R): VERIFIED**
Use `resume` subcommand (same pattern as 17D/17E at lines 4917–4935).
```js
const resumeOut = execFileSync(process.execPath, [claimJS, 'resume',
  '--project', project17, '--session', sess17]);
const resume17r = JSON.parse(resumeOut.trim());
assert(resume17r.next_command.includes('phase4'), '17R+: ...');
```
No new module.exports needed. ✓

---

## Sharpen in phase3-plan.md

**4. Split 17Q into 17Q1 and 17Q2:**
17Q1 — Flaw 1b: closed annotation (CLOSED issue → `closed: true` in entry)
17Q2 — Gap C: unregistered dir detection (`registered: false` in second-pass entry)
Different fixtures, different failure modes. Splitting prevents a regression in one from masking the other.

**5. 17T must include both polarities:**
17T+ — last sibling removed → parent `*.kw/` removed
17T- — sibling still exists → parent `*.kw/` retained (ENOTEMPTY guard)

**6. Plugin mirror hard rule:**
Every commit touching `scripts/kaola-workflow-claim.js` must update `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` in the same commit. This is a hard rule, not a suggestion. `scripts/validate-script-sync.js` must pass after every commit.

**7. ISO timestamp round-trip assertion in 17U:**
Before running cmdSweep, add an inline assertion that verifies the parse path:
```js
const testIso = '2026-01-01T00-00-00-000Z';
// assert parsedMs > 0 and < Date.now()
```
If the regex in the production code changes, this assertion fails fast with a clear message before sweep even runs.

**8. target_mismatch NO-WRITE comment:**
Add a one-line comment at the target_mismatch branch (lines 1421–1441) citing issue-44:
`// issue-44: target_mismatch branch — NO worktree_path added; receipt claim is 'none'`

**9. CHANGELOG.md:**
Add `[Unreleased]` entry per CLAUDE.md documentation checklist. Include in final Phase 3 commit.

---

## Final Verdict

Blueprint is implementable. Verify items 1–3 are resolved (DONE above). Apply sharpenings 4–9 in phase3-plan.md. Proceed to Phase 4 without looping back to code-architect.
