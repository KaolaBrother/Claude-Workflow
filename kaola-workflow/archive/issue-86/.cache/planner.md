# Planner Output — Issue #86

## Recommendation: Option A — Single PR, three surgical edits

All three gaps in one PR: same plugin, same test runner, all mechanical ports of proven GitHub code.

## Implementation Steps

1. **cwdInside helper + CWD guard in cmdRelease()** — GitLab claim script lines 434-443
   - Add `cwdInside(target)` helper (mirror GitHub lines 454-458)
   - Insert guard after not-found check: `if (cwdInside(folder.project_dir)) { output({released:false, reason:'refusing to discard current working directory'}, 1); return; }`
   - `folder.project_dir` already populated; `path` already required

2. **Drift-aware cmdStatus()** — GitLab claim script lines 445-449
   - Replace body: `readActiveFolders(root, { excludeClosedIssues: false })` + partition via `issueIsClosed(folder.issue_iid)` → `{ active, drift, count: active.length }`
   - Use `folder.issue_iid` (GitLab field), not `issue_number`
   - `issueIsClosed` and `excludeClosedIssues: false` already available

3. **Two subsections in workflow-next.md command file**
   - After Startup Step 1: `### Git Freshness Block Recovery` (mirror GitHub); may need `KAOLA_PROJECT`/`KAOLA_CLAIM` extraction added to Step 0b
   - After Startup Step 3: `### Co-active Folders Advisory` (verbatim from GitHub)

4. **One subsection in SKILL.md**
   - Add `### Co-active Folders Advisory` only — freshness block recovery already present at lines 152-168

5. **Two new tests in test-gitlab-workflow-scripts.js**
   - CWD-guard refusal test: call release from inside project_dir CWD; assert `released: false`
   - Drift detection test: `withForge({viewIssue stub})` returning closed for one issue; assert `drift.length === 1`, `count === 1`

## Not-Build List

- Do NOT modify GitHub scripts/kaola-workflow-claim.js (already correct)
- Do NOT extract cwdInside into shared module
- Do NOT add freshness block recovery to SKILL.md (already present)
- Do NOT modify kaola-gitlab-workflow-active-folders.js
- Do NOT add CWD guard to cmdFinalize
- Do NOT auto-archive drift folders in cmdStatus

## Validation Commands

- `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js` — primary
- `node scripts/simulate-workflow-walkthrough.js` — confirm no cross-impact

## Key Risk

Step 0b in workflow-next.md may need `KAOLA_PROJECT`/`KAOLA_CLAIM` extraction for freshness-block release command. Mirror GitHub Step 0b exactly.
