# Code Explorer — Issue #86: GitLab Safeguards Parity

## Gap 1 — cmdRelease() CWD Guard

**GitLab `cmdRelease()` — lines 434-443 of `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js`:**
- Finds folder by project/issue arg; if not found returns error
- Immediately calls `archiveProjectDir()` with no CWD check
- Missing: `cwdInside()` helper and guard before archive

**GitHub reference — `scripts/kaola-workflow-claim.js`:**
- `cwdInside(target)` helper at lines 454-458: uses `fs.realpathSync(process.cwd())` + `fs.realpathSync(target)`, checks startsWith
- Guard at line 465: `if (cwdInside(folder.project_dir)) { output({ released: false, reason: 'refusing to discard current working directory' }, 1); return; }`

**Key fact**: `folder.project_dir` is already populated by GitLab `readActiveFolders` (line 99 of `kaola-gitlab-workflow-active-folders.js`). Only the helper + guard line are missing.

## Gap 2 — cmdStatus() drift field

**GitLab `cmdStatus()` — lines 445-449:**
```js
function cmdStatus() {
  const root = getRoot();
  const folders = readActiveFolders(root);  // excludeClosedIssues: true (default)
  output({ active: folders, count: folders.length });
}
```
Returns `{ active, count }` — closed-issue folders silently excluded.

**GitHub reference — lines 472-485:**
```js
const all = readActiveFolders(root, { excludeClosedIssues: false });
const active = [], drift = [];
for (const folder of all) {
  if (folder.issue_number != null && issueIsClosed(folder.issue_number)) drift.push(folder);
  else active.push(folder);
}
output({ active, drift, count: active.length });
```

**Key fact**: GitLab's `readActiveFolders` already supports `{ excludeClosedIssues: false }` (line 77 of active-folders.js). `issueIsClosed` exists in active-folders.js at line 40. Only the split pattern in `cmdStatus` is missing.

## Gap 3 — workflow-next command file

**Files:**
- GitLab command: `plugins/kaola-workflow-gitlab/commands/workflow-next.md`
- GitLab skill: `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md`
- GitHub reference: `commands/workflow-next.md` lines 145-159 (freshness block recovery), lines 207-211 (co-active advisory)

**Missing from GitLab command file:**
1. "Git Freshness Block Recovery" subsection under Startup Step 1 (lines 145-159 in GitHub): includes `git pull --ff-only` retry + `node "$CLAIM_JS" release --project "$KAOLA_PROJECT" --reason git-freshness-block` cleanup when block persists
2. "Co-active Folders Advisory" subsection under Startup Step 3 (lines 207-211 in GitHub): "Do NOT merge, interleave, or batch commits from different active folders" + conflict resolution guidance

**GitLab SKILL.md**: has freshness block recovery (lines 152-168) with release command using `PICK_NEXT_PROJECT`. Missing co-active advisory.

## Test File Structure

File: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`
- Pattern: Node.js `assert` + `withForge({stubs}, () => {...})` for forge-dependent tests
- Existing release test (lines 367-373): creates worktree, calls release, asserts worktree gone. Does NOT test CWD guard.
- No `cmdStatus` test exists anywhere — `drift` field completely untested in GitLab.
- Runner: `node test-gitlab-workflow-scripts.js` (no framework)

## Acceptance Criteria Mapping

1. GitLab `release` refuses to discard CWD → add `cwdInside` helper + guard to GitLab claim script
2. GitLab `status` returns `{ active, drift, count }` → add split pattern to `cmdStatus`
3. GitLab command file includes freshness-block cleanup and co-active advisory → add two subsections
4. Regression tests prove release-CWD refusal, status-drift reporting → new tests in test-gitlab-workflow-scripts.js
5. Existing GitLab worktree cleanup tests remain green → must not regress
