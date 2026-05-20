# Code Architect Output — Issue #126

## Design Decisions
- All 8 sites are text-only edits in 4 files. No code, no new files, no test changes.
- Sites are independent — grouped by file for efficiency.
- Version values verified: kaola-workflow Codex manifest is `1.5.0`, kaola-workflow-gitlab is `1.5.0`, kaola-workflow-gitea Claude plugin is `3.10.0`. README stale — fixes confirmed correct.
- Validation runs once at the end via `node scripts/simulate-workflow-walkthrough.js`.

## Files to Create
None.

## Files to Modify

| File | Sites | Task |
|------|-------|------|
| README.md | 1a, 1b, 1c, 2, 3a, 3b, 3c, 4 | A |
| docs/workflow-state-contract.md | 5 | B |
| docs/api.md | 6, 7a, 7b, 7c | C |
| CHANGELOG.md | 8 | D |

All paths relative to worktree: `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-126/`

## Site-by-Site Edit Specifications

### Site 1a — README.md: Codex kaola-workflow manifest version
Old: `- Codex \`kaola-workflow\` plugin manifest: \`1.4.1\``
New: `- Codex \`kaola-workflow\` plugin manifest: \`1.5.0\``

### Site 1b — README.md: Codex kaola-workflow-gitlab manifest version
Old: `- Codex \`kaola-workflow-gitlab\` plugin manifest: \`1.4.1\``
New: `- Codex \`kaola-workflow-gitlab\` plugin manifest: \`1.5.0\``

### Site 1c — README.md: Add Gitea Claude Code command-install version row
Old string (post-1b state):
```
- Claude Code command install, GitLab edition: `3.10.0`
- Codex `kaola-workflow` plugin manifest: `1.5.0`
```
New string:
```
- Claude Code command install, GitLab edition: `3.10.0`
- Claude Code command install, Gitea edition: `3.10.0`
- Codex `kaola-workflow` plugin manifest: `1.5.0`
```

### Site 2 — README.md: Install paths — add Gitea scripts path
Old string:
```
`~/.claude/kaola-workflow/scripts/` for the GitHub edition or
`~/.claude/kaola-workflow-gitlab/scripts/` for the GitLab edition. Commands
```
New string:
```
`~/.claude/kaola-workflow/scripts/` for the GitHub edition,
`~/.claude/kaola-workflow-gitlab/scripts/` for the GitLab edition, or
`~/.claude/kaola-workflow-gitea/scripts/` for the Gitea edition. Commands
```

### Site 3a — README.md: KAOLA_WORKFLOW_OFFLINE description
Old: `| \`KAOLA_WORKFLOW_OFFLINE\` | \`0\` | Skip GitHub/GitLab calls for local tests or air-gapped usage |`
New: `| \`KAOLA_WORKFLOW_OFFLINE\` | \`0\` | Skip GitHub/GitLab/Gitea calls for local tests or air-gapped usage |`

### Site 3b — README.md: KAOLA_WORKFLOW_FORCE_FF_FAIL description
Old: `| \`KAOLA_WORKFLOW_FORCE_FF_FAIL\` | (unset) | DEV/TEST ONLY — fail first N fast-forward merge attempts (GitHub and GitLab) |`
New: `| \`KAOLA_WORKFLOW_FORCE_FF_FAIL\` | (unset) | DEV/TEST ONLY — fail first N fast-forward merge attempts (GitHub, GitLab, and Gitea) |`

### Site 3c — README.md: KAOLA_WORKFLOW_FORCE_MERGE_IMPOSSIBLE description
Old: `| \`KAOLA_WORKFLOW_FORCE_MERGE_IMPOSSIBLE\` | (unset) | DEV/TEST ONLY — force merge-impossible error in sink-merge fallback tests (GitHub and GitLab) |`
New: `| \`KAOLA_WORKFLOW_FORCE_MERGE_IMPOSSIBLE\` | (unset) | DEV/TEST ONLY — force merge-impossible error in sink-merge fallback tests (GitHub, GitLab, and Gitea) |`

### Site 4 — README.md: Hooks re-run instruction — add --forge=gitea
Old string:
```
- If hooks are missing, re-run `./install.sh --forge=github` (or
  `--forge=gitlab`). Do not edit `~/.claude/settings.json` directly —
```
New string:
```
- If hooks are missing, re-run `./install.sh --forge=github` (or
  `--forge=gitlab` or `--forge=gitea`). Do not edit `~/.claude/settings.json` directly —
```

### Site 5 — docs/workflow-state-contract.md:9
Old: `- GitHub issues are the canonical backlog and closure source when online.`
New: `- Forge issues (GitHub, GitLab, or Gitea) are the canonical backlog and closure source when online.`

### Site 6 — docs/api.md:7
Old: `The Phase 6 sink is responsible for delivering completed work to the repository and updating GitHub/GitLab metadata.`
New: `The Phase 6 sink is responsible for delivering completed work to the repository and updating GitHub, GitLab, or Gitea metadata.`

### Site 7a — docs/api.md: KAOLA_WORKFLOW_FORCE_FF_FAIL
Old: `...Applies to both GitHub and GitLab editions.`
New: `...Applies to GitHub, GitLab, and Gitea editions.`

### Site 7b — docs/api.md: KAOLA_WORKFLOW_FORCE_MERGE_IMPOSSIBLE
Old: `...Applies to both GitHub and GitLab editions.`
New: `...Applies to GitHub, GitLab, and Gitea editions.`

### Site 7c — docs/api.md: KAOLA_WORKFLOW_DEBUG_CWD
Old: `...Applies to both editions.`
New: `...Applies to all three editions.`

### Site 8 — CHANGELOG.md: Add Fixed entry for issue #126
Insert new bullet at top of existing `### Fixed` block under `[Unreleased]`.

## Build Sequence

Task A (README.md) — sequential within file:
1. Site 1a (bump kaola-workflow Codex version)
2. Site 1b (bump kaola-workflow-gitlab Codex version)
3. Site 1c (insert Gitea Claude Code edition line — depends on 1a+1b state)
4. Site 2 (install paths)
5. Sites 3a, 3b, 3c (env var table rows — independent, can apply in any order)
6. Site 4 (hooks re-run instruction)

Tasks B, C, D — independent of A and each other:
- Task B: Site 5 (workflow-state-contract.md)
- Task C: Sites 6, 7a, 7b, 7c (api.md — non-overlapping text regions, any order)
- Task D: Site 8 (CHANGELOG.md)

## Parallelization Plan

| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | README.md sites 1a→1b→1c→2→3a/3b/3c→4 | Single file, sequential within |
| B | docs/workflow-state-contract.md site 5 | Disjoint file from A/C/D |
| C | docs/api.md sites 6, 7a, 7b, 7c | Disjoint file from A/B/D |
| D | CHANGELOG.md site 8 | Disjoint file from A/B/C |

## Write Set Per Task

| Task | Files Written |
|------|--------------|
| A | README.md |
| B | docs/workflow-state-contract.md |
| C | docs/api.md |
| D | CHANGELOG.md |

## Validation Command
```
node scripts/simulate-workflow-walkthrough.js
```
Run once after all 8 sites applied. Must exit 0.

## Out of Scope
- Lines 442, 457, 533, 585+, 674 — deferred per phase2-ideation.md Out of Scope
- No code changes
- No new files
- No test changes
