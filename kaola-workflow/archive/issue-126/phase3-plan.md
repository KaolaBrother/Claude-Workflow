# Phase 3 - Plan: issue-126

## Blueprint

### Files to Create
None.

### Files to Modify

| File | Sites | Task |
|------|-------|------|
| `README.md` | 1a, 1b, 1c, 2, 3a, 3b, 3c, 4 | A |
| `docs/workflow-state-contract.md` | 5 | B |
| `docs/api.md` | 6, 7a, 7b, 7c | C |
| `CHANGELOG.md` | 8 | D |

All paths relative to worktree: `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-126/`

### Build Sequence

Task A (README.md) — sequential within file, 1c depends on 1a+1b:
1. Site 1a: bump `kaola-workflow` Codex manifest `1.4.1` → `1.5.0`
2. Site 1b: bump `kaola-workflow-gitlab` Codex manifest `1.4.1` → `1.5.0`
3. Site 1c: insert Gitea Claude Code edition line (old_string must match post-1a+1b state)
4. Site 2: extend install-path sentence to include Gitea
5. Sites 3a, 3b, 3c: update three env-var table rows
6. Site 4: extend hooks re-run instruction

Tasks B, C, D are independent of A and of each other.

### Parallelization Plan

| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | README.md (sequential internally) | Single file |
| B | docs/workflow-state-contract.md site 5 | Disjoint file |
| C | docs/api.md sites 6, 7a, 7b, 7c | Disjoint file |
| D | CHANGELOG.md site 8 | Disjoint file |

### External Dependencies
None.

## Task List

### Task A: README.md parity sweep (6 sites, sequential)

- File: `README.md`
- Test File: none (doc-only)
- Write Set: `README.md`
- Depends On: none
- Parallel Group: A (serial internally)
- Action: MODIFY
- Working directory: `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-126/`
- Validate: `node scripts/simulate-workflow-walkthrough.js` (run once after all tasks)

**Site 1a** (apply first):
- Old: `- Codex \`kaola-workflow\` plugin manifest: \`1.4.1\``
- New: `- Codex \`kaola-workflow\` plugin manifest: \`1.5.0\``

**Site 1b** (apply second):
- Old: `- Codex \`kaola-workflow-gitlab\` plugin manifest: \`1.4.1\``
- New: `- Codex \`kaola-workflow-gitlab\` plugin manifest: \`1.5.0\``

**Site 1c** (apply after 1a+1b — old_string matches post-1b state):
```
Old:
- Claude Code command install, GitLab edition: `3.10.0`
- Codex `kaola-workflow` plugin manifest: `1.5.0`

New:
- Claude Code command install, GitLab edition: `3.10.0`
- Claude Code command install, Gitea edition: `3.10.0`
- Codex `kaola-workflow` plugin manifest: `1.5.0`
```

**Site 2** (install paths):
```
Old:
`~/.claude/kaola-workflow/scripts/` for the GitHub edition or
`~/.claude/kaola-workflow-gitlab/scripts/` for the GitLab edition. Commands

New:
`~/.claude/kaola-workflow/scripts/` for the GitHub edition,
`~/.claude/kaola-workflow-gitlab/scripts/` for the GitLab edition, or
`~/.claude/kaola-workflow-gitea/scripts/` for the Gitea edition. Commands
```

**Site 3a** (env-var table — OFFLINE):
- Old: `| \`KAOLA_WORKFLOW_OFFLINE\` | \`0\` | Skip GitHub/GitLab calls for local tests or air-gapped usage |`
- New: `| \`KAOLA_WORKFLOW_OFFLINE\` | \`0\` | Skip GitHub/GitLab/Gitea calls for local tests or air-gapped usage |`

**Site 3b** (env-var table — FORCE_FF_FAIL; Gitea support verified at lines 14, 174 of sink-merge.js):
- Old: `| \`KAOLA_WORKFLOW_FORCE_FF_FAIL\` | (unset) | DEV/TEST ONLY — fail first N fast-forward merge attempts (GitHub and GitLab) |`
- New: `| \`KAOLA_WORKFLOW_FORCE_FF_FAIL\` | (unset) | DEV/TEST ONLY — fail first N fast-forward merge attempts (GitHub, GitLab, and Gitea) |`

**Site 3c** (env-var table — FORCE_MERGE_IMPOSSIBLE):
- Old: `| \`KAOLA_WORKFLOW_FORCE_MERGE_IMPOSSIBLE\` | (unset) | DEV/TEST ONLY — force merge-impossible error in sink-merge fallback tests (GitHub and GitLab) |`
- New: `| \`KAOLA_WORKFLOW_FORCE_MERGE_IMPOSSIBLE\` | (unset) | DEV/TEST ONLY — force merge-impossible error in sink-merge fallback tests (GitHub, GitLab, and Gitea) |`

**Site 4** (hooks re-run):
```
Old:
- If hooks are missing, re-run `./install.sh --forge=github` (or
  `--forge=gitlab`). Do not edit `~/.claude/settings.json` directly —

New:
- If hooks are missing, re-run `./install.sh --forge=github` (or
  `--forge=gitlab` or `--forge=gitea`). Do not edit `~/.claude/settings.json` directly —
```

### Task B: docs/workflow-state-contract.md (1 site)

- File: `docs/workflow-state-contract.md`
- Test File: none
- Write Set: `docs/workflow-state-contract.md`
- Depends On: none
- Parallel Group: B
- Action: MODIFY
- Working directory: `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-126/`
- Validate: `node scripts/simulate-workflow-walkthrough.js` (run once after all tasks)

**Site 5** (line 9):
- Old: `- GitHub issues are the canonical backlog and closure source when online.`
- New: `- Forge issues (GitHub, GitLab, or Gitea) are the canonical backlog and closure source when online.`

### Task C: docs/api.md (4 sites)

- File: `docs/api.md`
- Test File: none
- Write Set: `docs/api.md`
- Depends On: none
- Parallel Group: C
- Action: MODIFY
- Working directory: `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-126/`
- Validate: `node scripts/simulate-workflow-walkthrough.js` (run once after all tasks)

**Site 6** (line 7):
- Old: `The Phase 6 sink is responsible for delivering completed work to the repository and updating GitHub/GitLab metadata.`
- New: `The Phase 6 sink is responsible for delivering completed work to the repository and updating GitHub, GitLab, or Gitea metadata.`

**Site 7a** (FORCE_FF_FAIL applies-to):
- Old: `- **\`KAOLA_WORKFLOW_FORCE_FF_FAIL=N\`** — Fail the first N fast-forward merge attempts in \`ffMergeLoop\`. Used to test FF race-condition retry logic. Applies to both GitHub and GitLab editions.`
- New: `- **\`KAOLA_WORKFLOW_FORCE_FF_FAIL=N\`** — Fail the first N fast-forward merge attempts in \`ffMergeLoop\`. Used to test FF race-condition retry logic. Applies to GitHub, GitLab, and Gitea editions.`

**Site 7b** (FORCE_MERGE_IMPOSSIBLE applies-to):
- Old: `- **\`KAOLA_WORKFLOW_FORCE_MERGE_IMPOSSIBLE=token\`** — Force a merge-impossible error in \`postMergeCleanup\` by throwing a synthetic error. The token becomes the classification result returned by \`classifyMergeError\`. Used to test auto-fallback-to-PR behavior. Applies to both GitHub and GitLab editions.`
- New: `- **\`KAOLA_WORKFLOW_FORCE_MERGE_IMPOSSIBLE=token\`** — Force a merge-impossible error in \`postMergeCleanup\` by throwing a synthetic error. The token becomes the classification result returned by \`classifyMergeError\`. Used to test auto-fallback-to-PR behavior. Applies to GitHub, GitLab, and Gitea editions.`

**Site 7c** (DEBUG_CWD applies-to):
- Old: `- **\`KAOLA_WORKFLOW_DEBUG_CWD=path\`** — When set, sink-merge writes the final \`process.cwd()\` to the specified file on exit. Used by test suite to verify CWD restoration after worktree removal. Applies to both editions.`
- New: `- **\`KAOLA_WORKFLOW_DEBUG_CWD=path\`** — When set, sink-merge writes the final \`process.cwd()\` to the specified file on exit. Used by test suite to verify CWD restoration after worktree removal. Applies to all three editions.`

### Task D: CHANGELOG.md (1 site)

- File: `CHANGELOG.md`
- Test File: none
- Write Set: `CHANGELOG.md`
- Depends On: none
- Parallel Group: D
- Action: MODIFY
- Working directory: `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-126/`
- Validate: `node scripts/simulate-workflow-walkthrough.js` (run once after all tasks)

**Site 8** (prepend Fixed bullet under [Unreleased]):
```
Old:
### Fixed

- **Config-driven auto-merge parity for Gitea and GitLab sinks**

New:
### Fixed

- **Gitea parity sweep across README, workflow-state-contract, and api docs** (issue #126): Updated README.md, docs/workflow-state-contract.md, and docs/api.md to include Gitea alongside GitHub and GitLab everywhere. Corrected stale Codex manifest versions for `kaola-workflow` and `kaola-workflow-gitlab` from `1.4.1` to `1.5.0`. Added missing Gitea install path, env var scope notes, hooks re-run flag, and forge-neutral wording in the workflow state contract.

- **Config-driven auto-merge parity for Gitea and GitLab sinks**
```

## Advisor Notes

- All old_string values verified against actual file content before this plan was written (no drift found).
- Site 1c sequencing: 1c must run after 1a and 1b — old_string matches post-1b state.
- CHANGELOG: `### Fixed` section, not `### Added`.
- Worktree constraint: all tasks use working directory `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-126/`.
- Phase 6 acceptance includes `git diff` review to confirm exactly 8 sites changed, nothing else.
- Full advisor output: `.cache/advisor-plan.md`

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | old_strings verified pre-write; no revision loop needed | no drift found |
