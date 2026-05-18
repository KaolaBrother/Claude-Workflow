# Phase 1 - Research: issue-87

## Deliverable

Bring `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-roadmap.js` to parity with the hardened GitHub roadmap generator for missing-source protection, atomic roadmap writes, and exclusive explicit issue source creation.

## Why

Without these safeguards, GitLab roadmap generation can erase a non-empty generated `ROADMAP.md` when `.roadmap/` is missing, can leave direct-write partial output on interruption, and can hide concurrent `init-issue` races by always reporting `created`.

## Affected Area

- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-roadmap.js`
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`
- Possible structural validator coverage in `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`

## Key Patterns Found

1. `scripts/kaola-workflow-roadmap.js` - source behavior includes `guardAgainstMissingRoadmapSource`, `writeFileAtomicReplace`, and `createFileExclusive`.
2. `scripts/simulate-workflow-walkthrough.js` - GitHub regression coverage has three relevant cases: missing `.roadmap` guard, atomic generate temp cleanup, and concurrent `init-issue` exclusivity.
3. `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-roadmap.js` - current `writeIfDiff()` directly calls `fs.writeFileSync()` for generated roadmap output.
4. `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-roadmap.js` - current `cmdInitIssue()` delegates to `writeIssueRecord()` and always prints `created`.
5. `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js` - existing GitLab roadmap coverage only verifies `refreshFromGitLab()` happy-path source and rendered output.

## Test Patterns

- Framework: Node `assert`, temp directories under `os.tmpdir()`, and child process execution via `spawnSync`.
- Location: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`.
- Structure: direct function assertions for module APIs; command behavior through `runNode()` or a small async spawn helper.

## External Docs

None. Internal Node `fs` usage and existing GitHub implementation are sufficient.

## Completeness Score

10/10

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | local-fallback-explicit | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | Internal filesystem behavior only |
