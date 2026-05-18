# Phase 1 - Research: issue-71

## Deliverable

Finish the GitLab edition launch gate by updating user-facing docs, release metadata, manual install behavior, terminology, and validation evidence for issue #71.

## Why

The GitLab implementation and validator suite now exist, but a new user still needs clear edition selection, correct install/uninstall instructions, current release metadata, and passing launch smoke tests before the #65 migration track can be considered finished.

## Affected Area

- `README.md`
- `CHANGELOG.md`
- `install.sh`
- GitLab command and skill docs under `plugins/kaola-workflow-gitlab/`
- Release manifests and package metadata for consistency checks
- Final validation commands and isolated install/uninstall smoke tests

## Key Patterns Found

1. `README.md:70` - Claude Code install section defaults to GitHub and has only a short GitLab one-liner.
2. `README.md:106` - Codex installation docs only describe `plugins/kaola-workflow/`, with no GitLab Codex plugin path.
3. `README.md:212` - release version section is stale relative to current manifests.
4. `CHANGELOG.md:3` - `[Unreleased]` is empty and needs the requested #65 launch entry.
5. `package.json:5` - package files include `plugins/`, so GitLab plugin files are already in the package surface.
6. `.claude-plugin/marketplace.json:12` - Claude marketplace includes both root and GitLab plugin entries.
7. `.agents/plugins/marketplace.json:12` - Codex marketplace includes both root and GitLab plugin entries.
8. `install.sh:72` - GitLab support script list uses GitHub-style script names, while actual files are `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-*.js`.
9. `uninstall.sh:4` - uninstall supports `--forge=github|gitlab|all`.
10. `plugins/kaola-workflow-gitlab/commands/workflow-next.md:69` - terminology cleanup is needed for typo artifacts such as `pass-througlab`; similar artifacts appear in other GitLab docs.

## Test Patterns

- Framework: npm scripts plus shell smoke tests.
- Location: `package.json`, `scripts/`, `plugins/kaola-workflow-gitlab/scripts/`, `install.sh`, `uninstall.sh`.
- Structure: run GitHub suite, GitLab suite, direct GitLab validator, Claude plugin validator, forbidden-reference grep, and isolated `HOME` install/uninstall smoke tests for both forges.

## External Docs

N/A. Existing issue #65 already captured the GitLab CLI/API reference set; #71 implementation can be verified from repository-owned behavior and docs.

## Completeness Score

9/10

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked locally | `.cache/code-explorer.md` | Subagents were not explicitly requested in this session |
| docs-lookup | N/A | `.cache/docs-lookup.md` | No new external behavior required beyond issue #65 references |
