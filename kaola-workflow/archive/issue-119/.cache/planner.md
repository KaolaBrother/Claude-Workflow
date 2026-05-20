# Planner Output — Issue #119

## Overview
The GitHub PR sink honors `KAOLA_WORKFLOW_OFFLINE=1` via a module-load constant and an early-return that skips push and forge API calls, records `OFFLINE_PLACEHOLDER`/`0`, and commits metadata locally. The Gitea PR sink and GitLab MR sink ignore the env var entirely, breaking forge parity. This change adds the same offline behavior to both plugin sinks plus subprocess tests covering the offline path.

## Files In Scope
- `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-pr.js`
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js`
- `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js`
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

Reference (read-only): `scripts/kaola-workflow-sink-pr.js` (lines 7, 115-134).

---

## Option A — Mirror GitHub: module constant + early-return inside `ensure*` + gate `--merge` (RECOMMENDED)
- `OFFLINE` constant at module top of each sink (matches `sink-pr.js:7` and sibling forge modules).
- Early-return block inside `ensurePullRequest`/`ensureMergeRequest`, after asserts, before push and before `forge.discoverProject()`.
- Returns the function's normal shape with placeholder values.
- Gate the `--merge` call in `main()` so offline runs never call `forge.merge*` on a placeholder project/IID.
- **Architectural fit:** Exact parity with GitHub reference. Library callers also get offline behavior.
- **Pros:** Consistent with 3 existing precedents; security asserts still fire; minimal surface.
- **Cons:** `OFFLINE` not toggleable in-process (but subprocess pattern is already established).
- **Risk:** Low. **Complexity:** Small.

## Option B — Early-return in `main()` only (CLI-level)
- Guard in each `main()` before calling `ensure*`.
- **Architectural fit:** Poor. Library callers bypass the guard; diverges from GitHub.
- **Risk:** Medium (silent online behavior when `ensure*` called directly). **Complexity:** Small.

## Option C — Push guard into forge layer
- Make `forge.discoverProject`/`createPullRequest`/`createMergeRequest` return placeholders offline.
- **Architectural fit:** Wrong layer. Forge has no knowledge of `workflow-state.md`; largest blast radius.
- **Risk:** High. **Complexity:** Large.

**Recommendation: Option A.**

---

## Implementation Steps

### 1. Gitea sink offline branch
File: `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-pr.js`
- Add `const OFFLINE = process.env.KAOLA_WORKFLOW_OFFLINE === '1';` after requires (~line 9).
- Inside `ensurePullRequest`, after asserts, after `const root = options.root || getRoot();` (line ~108), but BEFORE push (line ~110) and BEFORE `forge.discoverProject()` (line ~112):
  - Set `prUrl = 'OFFLINE_PLACEHOLDER'`, `prNumber = 0`, `fullName = 'OFFLINE_PLACEHOLDER'`, `projectHtmlUrl = 'OFFLINE_PLACEHOLDER'`.
  - Call `updateStateSinkBlock(stateFile, prUrl, prNumber, fullName, projectHtmlUrl)` and `appendSummary(summaryFile, prUrl, prNumber)`.
  - Metadata commit: `git -C root add` two relative paths, `git diff --cached --quiet`, if dirty → `git commit -m 'chore: record PR metadata for ' + args.project`. Soft-fail on error (stderr warning, no throw).
  - `return { pr: { pr_url: prUrl, pr_number: prNumber }, project: { full_name: fullName, html_url: projectHtmlUrl, owner: 'OFFLINE_PLACEHOLDER', name: 'OFFLINE_PLACEHOLDER' } };`
- In `main()`: change `if (args.merge)` to `if (!OFFLINE && args.merge)`.

### 2. GitLab sink offline branch
File: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js`
- Add `const OFFLINE = process.env.KAOLA_WORKFLOW_OFFLINE === '1';` after requires (~line 8).
- Inside `ensureMergeRequest`, after asserts, after `const root = options.root || getRoot();` (~line 105), before push (~line 107):
  - Set `mrUrl = 'OFFLINE_PLACEHOLDER'`, `mrIid = 0`.
  - Call `updateStateSinkBlock(stateFile, mrUrl, mrIid)` and `appendSummary(summaryFile, mrUrl, mrIid)`.
  - Metadata commit mirroring GitHub, message `'chore: record MR metadata for ' + args.project`; soft-fail.
  - `return { mr_url: mrUrl, mr_iid: mrIid };`
- In `main()`: change `if (args.merge)` to `if (!OFFLINE && args.merge)`.

### 3. Gitea offline subprocess test
File: `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js` (append after line 444)
- `setupRealRepo('offline-pr-gt-test', 'test-gt-offline-pr')`
- `spawnSync(process.execPath, [sinkPrScript, '--branch', branch, '--project', 'test-gt-offline-pr', '--issue', '119'], { cwd: root, env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' }, encoding: 'utf8' })`
- Assert: status 0; `workflow-state.md` has `pr_url: OFFLINE_PLACEHOLDER`, `pr_number: 0`, `full_name: OFFLINE_PLACEHOLDER`; `phase6-summary.md` has `PR URL: OFFLINE_PLACEHOLDER` and `PR Number: 0`; git log shows metadata commit.
- Implicit push guard: repo has no remote → leaked push → non-zero exit.

### 4. GitLab offline subprocess test
File: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js` (append after line 479)
- Mirror step 3 with `kaola-gitlab-workflow-sink-mr.js`, project `test-gl-offline-mr`, pass `--root root`.
- Assert: exit 0; `mr_url: OFFLINE_PLACEHOLDER`, `mr_iid: 0` in state; `MR URL: OFFLINE_PLACEHOLDER` / `MR IID: 0` in summary; metadata commit present.

---

## Risks & Mitigations
- **Gitea `discoverProject` fallback**: early-return must precede line ~112. Test's no-remote repo surfaces regression as non-zero exit.
- **`--merge` with placeholders**: gate with `!OFFLINE` in both `main()`.
- **Metadata commit in test repo**: `setupRealRepo()` sets user.email/name; soft-fail keeps exit 0 regardless.
- **Return shape**: Gitea returns `{ pr, project }`, GitLab returns bare `mr` — both match online shapes.

## Explicitly NOT in Scope
- No change to `kaola-gitea-forge.js` `discoverProject`
- No change to `kaola-gitlab-forge.js`
- No new env vars
- No in-process OFFLINE-toggle tests
- No refactor of `skipPush` / `skipMetadataCommit`
- No changes to `mergePullRequest`/`mergeMergeRequest` signatures
- No changes to sink-merge scripts
- No doc edits (CHANGELOG entry handled by Phase 6)

## Missing Facts from Phase 1
1. **`--merge` gating** — Both `main()` functions call `merge*` unconditionally after `ensure*`. With placeholders this would invoke `forge.merge*` on fake data. Plan adds `if (!OFFLINE && args.merge)`.
2. **GitLab `--root` flag in tests** — Existing GitLab sink-merge subprocess tests pass `--root root`; new offline test should do the same.
