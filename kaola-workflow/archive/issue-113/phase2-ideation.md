# Phase 2 - Ideation: issue-113

## Approaches Evaluated

### Option A: Mirror the GitLab plugin (Recommended)
- Summary: Copy each `kaola-gitlab-*` script, rename to `kaola-gitea-*`, swap `require('./kaola-gitlab-forge')` → `./kaola-gitea-forge`, adjust Gitea-specific differences (PR URL parsing, label/comment project-arg shape, issue_number field names).
- Pros: Smallest surface area; most-tested template; matches existing Gitea sink conventions; confirmed template files exist at `plugins/kaola-workflow-gitlab/scripts/`.
- Cons: Must verify each GitLab-specific adapter call maps correctly to Gitea forge API.
- Risk: Low
- Complexity: Medium (639 LOC claim.js is the only large file)

### Option B: Thin-wrapper approach
- Summary: `kaola-gitea-workflow-claim.js` re-exports GitHub `kaola-workflow-claim.js` with forge injection.
- Pros: No code duplication.
- Cons: Requires invasive refactor of GitHub script to accept injected forge module; breaks "scripts own atomicity" contract; out of scope.
- Risk: High
- Complexity: XL

### Option C: Full async rewrite
- Summary: Port to async/await with unified forge interface.
- Cons: Speculative; breaks parity with GitLab plugin; nothing in #113 asks for it.
- Risk: High
- Complexity: XL

## Advisor Findings

From `.cache/advisor-ideation.md`:
- GitLab plugin confirmed present — all 7 template files exist. Approach A is genuine "copy-rename-swap-forge-name."
- OFFLINE short-circuit confirmed at forge level (`kaola-gitea-forge.js:15`). No redundant OFFLINE guards needed, except `cmdWatchPr` for its structured offline output.
- `simulate-gitea-workflow-walkthrough.js` is OUT OF SCOPE — issue #116 owns integration tests.
- `issue_iid` dual-read REMOVED from plan — Gitea uses `issue_number` only; no cross-contamination.

## Selected Approach
**Option A — Mirror the GitLab plugin.**

Rationale:
1. Template files confirmed present and validated by GitLab edition tests.
2. Gitea forge module already handles OFFLINE at `teaExec` level — reduces guard boilerplate.
3. Gitea-specific adaptations are isolated to 3 scripts (active-folders, classifier, claim); 3 scripts (roadmap, compact-context, repair-state) are pure file I/O and need only a rename.
4. Issue #44 contract (explicit target, no auto-pick) and `claimExplicitTarget` are preserved verbatim from GitLab template.
5. Sink repointing (2 line changes) is the only change to existing files.

## Out of Scope (explicit)
- `simulate-gitea-workflow-walkthrough.js` — issue #116
- `validate-kaola-workflow-gitea-contracts.js` — issue #116
- `install.sh --forge=gitea` wiring — issue #115
- Skill/SKILL.md updates — issue #117
- Migration of on-disk state files from GitHub edition
- Async/await refactor

## Build Sequence
1. `kaola-gitea-workflow-active-folders.js` — no deps
2. `kaola-gitea-workflow-classifier.js` — imports active-folders
3. `kaola-gitea-workflow-claim.js` — imports active-folders, spawns classifier
4-6. `kaola-gitea-workflow-roadmap.js`, `compact-context.js`, `repair-state.js` — independent
7. Repoint sinks (2 line changes)
8. `test-gitea-workflow-scripts.js` — tests everything

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
