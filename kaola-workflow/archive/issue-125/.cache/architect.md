# Architect Output — Issue #125

## Design Decisions

- **Approach A (TDD RED-then-GREEN)**: The version assertion is inserted into the validator first, while `plugin.json` still reads `3.8.1`. This makes the failing test run the mandatory RED evidence. Then `plugin.json` is updated to `3.10.0`, producing GREEN. No transient revert step is needed.
- **Verbatim Gitea mirror**: The new assertion copies the Gitea pattern exactly, substituting `'GitLab'` for `'Gitea'` in the message. No shared module, no abstraction.
- **README scope is lines 356-357 only**: Lines 358-360 (Codex edition versions) are out of scope and must not be touched.
- **CHANGELOG appends under the existing `[Unreleased]` section**: No second `[Unreleased]` header is created.

---

## Files to Create

None.

---

## Files to Modify

| File | Changes | Why |
|------|---------|-----|
| `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` | Insert one `assert` line after line 93 | Adds version parity guard matching the Gitea pattern |
| `plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json` | Change `"version"` field from `"3.8.1"` to `"3.10.0"` on line 3 | Aligns plugin manifest version with root `package.json` |
| `README.md` | Update lines 356-357: change `3.8.1` to `3.10.0` for GitHub and GitLab Claude editions | Fixes stale version strings in documentation |
| `CHANGELOG.md` | Append one bullet under `### Added` within the existing `[Unreleased]` block | Documents the contract guard addition per project checklist |

---

## Build Sequence

1. **Task 1** — Insert validator assertion (RED state): `validate-kaola-workflow-gitlab-contracts.js`
2. **Task 2** (depends on Task 1 RED run) — Run validator in RED state: `npm run test:kaola-workflow:gitlab` must fail with `'GitLab Claude plugin version must match package.json'`
3. **Task 3** (depends on Task 2) — Bump `plugin.json` to `3.10.0`: resolves RED, produces GREEN
4. **Task 4** (depends on Task 3) — Run validator to confirm GREEN: `npm run test:kaola-workflow:gitlab` must pass
5. **Task 5** (independent) — Update `README.md` lines 356-357
6. **Task 6** (independent) — Append CHANGELOG entry
7. **Task 7** (final, after all prior tasks) — Full sweep: `npm test` then `node scripts/simulate-workflow-walkthrough.js`

---

## Task List

### Task 1: Insert version assertion into GitLab validator

- Action: MODIFY
- File: `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`
- Test file: same file is the test
- Write set: `validate-kaola-workflow-gitlab-contracts.js` only
- Dependencies: none
- Parallelization group: Group 1 (serial with Task 2-4)
- What to implement: Insert the following line immediately after line 93 (the existing `claudePluginJson.name` assertion):

```js
assert(claudePluginJson.version === require(path.join(root, 'package.json')).version,
  'GitLab Claude plugin version must match package.json');
```

  The word `'GitLab'` in the message is case-sensitive. The `root` variable is already defined at line 7 as `path.resolve(__dirname, '..', '..', '..')`. No new variables or imports are needed.

- Pattern to mirror: Gitea validator lines 93-94 in `plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js`
- Validation command (RED): `npm run test:kaola-workflow:gitlab` — must FAIL with message `'GitLab Claude plugin version must match package.json'` while `plugin.json` still reads `3.8.1`

### Task 2: Capture RED evidence

- Action: RUN (no file changes)
- Write set: none
- Dependencies: Task 1
- Parallelization group: Group 1 (serial)
- Validation command: `npm run test:kaola-workflow:gitlab` — exit code must be non-zero

### Task 3: Bump plugin.json version to 3.10.0

- Action: MODIFY
- File: `plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json`
- Write set: `plugin.json` only
- Dependencies: Task 2 (RED evidence must be captured before this edit)
- Parallelization group: Group 1 (serial)
- What to implement: On line 3, change `"version": "3.8.1"` to `"version": "3.10.0"`. No other fields change.
- Validation command (GREEN): `npm run test:kaola-workflow:gitlab` — must pass

### Task 4: Confirm GREEN

- Action: RUN (no file changes)
- Write set: none
- Dependencies: Task 3
- Parallelization group: Group 1 (serial)
- Validation command: `npm run test:kaola-workflow:gitlab` — exit code must be 0

### Task 5: Fix stale version strings in README.md

- Action: MODIFY
- File: `README.md`
- Write set: `README.md` only
- Dependencies: none (disjoint write set)
- Parallelization group: Group 2 (can run concurrently with Group 1)
- What to implement: In the "Release versioning" block, update exactly two lines:
  - Line 356: change `3.8.1` to `3.10.0` for GitHub Claude edition
  - Line 357: change `3.8.1` to `3.10.0` for GitLab Claude edition
  - Lines 358-360 (Codex edition entries) must NOT be touched
- Pre-edit requirement: read lines 350-370 before editing to confirm line numbers and identify any Codex-edition lines
- Validation: visually confirm the Codex lines below the two changed lines are unchanged

### Task 6: Add CHANGELOG entry

- Action: MODIFY
- File: `CHANGELOG.md`
- Write set: `CHANGELOG.md` only
- Dependencies: none
- Parallelization group: Group 2
- What to implement: Append one bullet under `### Added` within the existing `[Unreleased]` block:

```
- **GitLab Claude plugin version contract** (issue #125): `plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json` version bumped from `3.8.1` to `3.10.0` to match root `package.json`. Added `claudePluginJson.version` assertion in `validate-kaola-workflow-gitlab-contracts.js` mirroring the Gitea edition guard; validator now fails fast on version drift.
```

- Validation: confirm only one `[Unreleased]` header exists

### Task 7: Final sweep

- Action: RUN (no file changes)
- Write set: none
- Dependencies: Tasks 4, 5, 6
- Parallelization group: serial, must be last
- Validation commands:
  1. `npm test`
  2. `node scripts/simulate-workflow-walkthrough.js`
- Both must exit 0

---

## Parallelization Plan

```
Group 1 (serial — RED/GREEN dependency):
  Task 1 → Task 2 (RED run) → Task 3 → Task 4 (GREEN run)

Group 2 (can start concurrently with Group 1 after Task 1 is committed):
  Task 5 (README) — independent of Task 6
  Task 6 (CHANGELOG) — independent of Task 5

Final:
  Task 7 (after Groups 1 and 2 complete)
```

---

## External Dependencies

None. All files are local. No npm installs, no network calls, no new packages.

---

## Explicit Out-of-Scope Items

- No shared helper module between GitLab and Gitea validators
- No root validator meta-check
- No changes to `.codex-plugin/plugin.json` (Codex is on a separate versioning track)
- No changes to the GitHub main plugin or its validator
- No README content assertion added to the validator
- No `package-lock.json` changes
