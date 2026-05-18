# Phase 2 - Ideation: issue-71

## Approaches Evaluated

### Option A: Documentation-only launch pass

- Summary: update README and CHANGELOG only.
- Pros: smallest edit set.
- Cons: misses the GitLab manual installer support-script bug found in Phase 1.
- Risk: launch gate would be weak because install smoke tests would fail or be skipped.
- Complexity: low.
- What not to build: no installer or runtime changes.

### Option B: Launch readiness pass

- Summary: update docs, changelog, release-version prose, GitLab terminology, and the GitLab installer script list; validate with final suites and isolated install/uninstall smoke tests.
- Pros: directly maps to #71 scope and acceptance criteria.
- Cons: touches both documentation and installer code, so validation must cover shell syntax and smoke installs.
- Risk: low to medium, mainly around manual install behavior.
- Complexity: moderate.
- What not to build: no runtime workflow redesign, no shared forge abstraction, no tag publication.

### Option C: Full release publication pass

- Summary: bump versions, publish tags, and treat #71 as a tagged release cut.
- Pros: explicit release signal.
- Cons: overbuilt for the issue and risks racing with concurrent mainline version work.
- Risk: medium.
- Complexity: high.
- What not to build: no automatic tag creation without explicit user request.

## Advisor Findings

The advisor gate selected Option B. Passing validators alone is not enough because #71 includes manual install/uninstall smoke tests and user-facing docs. A release/tag pass is unnecessary because package and plugin manifest versions are already internally consistent.

## Selected Approach

Use Option B, the launch readiness pass. Keep edits scoped to `README.md`, `CHANGELOG.md`, `install.sh`, GitLab command/skill docs, and workflow evidence for issue #71. Do not modify `plugins/kaola-workflow/`.

## Out of Scope

- Bitbucket, Gitea, Forgejo, or other forge support.
- Runtime forge switching.
- GitHub plugin changes.
- Tag creation or publication.
- Migrating in-flight workflow projects between forges.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked locally | `.cache/planner.md` | Subagents were not explicitly requested in this session |
| advisor ideation gate | invoked locally | `.cache/advisor-ideation.md` | Strongest available local review used |
