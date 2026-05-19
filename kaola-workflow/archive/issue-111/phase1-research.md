# Phase 1 - Research / Discovery: issue-111

## Deliverable
- `plugins/kaola-workflow-gitea/scripts/kaola-gitea-forge.js` — Gitea forge adapter (~250 LOC) mirroring `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-forge.js`
- `plugins/kaola-workflow-gitea/scripts/test-gitea-forge-helpers.js` (~150 LOC unit tests) mirroring `test-gitlab-forge-helpers.js`

## Why
Foundational forge adapter for the Gitea plugin edition. All other Gitea sub-issues (#112 sinks, #113 workflow scripts, #115 manifests, #116 integration tests) depend on this adapter.

## Affected Area
- NEW: `plugins/kaola-workflow-gitea/scripts/` (directory to be created)
- Reference: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-forge.js` (mirror pattern)
- Reference: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-forge-helpers.js` (mirror test pattern)
- No existing files modified

## Key Patterns Found

1. **CLI wrapper with injectable mock**: `glabExec(args, opts)` uses `opts.execFileSync` override for test mocking, offline via `KAOLA_WORKFLOW_OFFLINE=1` or `opts.offline`. Mirror as `teaExec(args, opts)` using `'tea'` binary. (`plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-forge.js`)

2. **`tea api` for REST**: Since `tea api` works like `glab api` (supports `-X METHOD`, `-f key=val`, `-d JSON`), REST calls (issue comments, PR merge) can go through `teaExec(['api', ...])` — same pattern, no separate HTTP client. (`gitea.com/gitea/tea` docs confirmed)

3. **Hand-rolled test runner**: `runner(calls, responses)` factory pattern — injectable `execFileSync`, responses keyed by `args.join(' ')`. Same framework (Node `assert` module, no dependencies). (`plugins/kaola-workflow-gitlab/scripts/test-gitlab-forge-helpers.js:1-134`)

4. **normalizeState/normalizeIssue/normalizePR**: Gitea uses `open`/`closed`/`merged` states (same as GitHub, different from GitLab's `opened`). PR field is `number` not `iid`. Rename `normalizeMergeRequest` → `normalizePullRequest` and `mr_url` → `pr_url`.

5. **Version check pattern**: No version check in GitLab adapter. Gitea adapter needs explicit `tea --version` check (≥ 0.9.2) and `GET /api/v1/version` check (≥ 1.17 for auto-merge). Implement as lazy checks in `teaExec` and `giteaApi`.

## Test Patterns
- Framework: Node built-in `assert`, hand-rolled (no Jest/Mocha)
- Location: `plugins/kaola-workflow-gitea/scripts/test-gitea-forge-helpers.js`
- Structure: linear script, runner factory, normalization tests then CLI-mock tests, final `calls[n][0] === 'tea'` assertion
- Offline: `{ offline: true, offlineStdout: '[]' }` in opts

## Config & Env
- `KAOLA_WORKFLOW_OFFLINE=1` — disables all CLI/REST calls
- `GITEA_TOKEN` — auth token (fallback if tea login not configured)
- `GITEA_SERVER_URL` — Gitea instance URL (used in `giteaApi` REST helper)
- No project-level config files; rely on `tea login` context

## External Docs
- docs.gitea.com/development/api-usage — auth header, endpoint paths
- gitea.com/gitea/tea — tea CLI commands and `tea api` sub-command
- Issue comments: POST/GET/PATCH confirmed at `/api/v1/repos/{owner}/{repo}/issues/{index}/comments`
- PR merge: POST `/api/v1/repos/{owner}/{repo}/pulls/{index}/merge` with `Do: "squash"|"merge"|"rebase"`
- auto_merge: NOT confirmed in docs — implement as optional/best-effort only
- Server version: `GET /api/v1/version` → `{"version": "1.21.0"}`
- tea version: `tea --version` → `Version: 0.10.1+...`

## GitHub Issue
KaolaBrother/Kaola-Workflow#111

## Completeness Score
10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | invoked | .cache/docs-lookup.md | Gitea REST API + tea CLI behavior needed |

## Notes / Future Considerations
- `auto_merge` via REST merge body unverified — implement as opt-in with comment noting unverified status
- `tea api --header` may be needed if `tea login` not configured but `GITEA_TOKEN` is set
- `updateIssueLabels` equivalent: use `tea issues edit <N> --add-labels L --remove-labels L`
- HTML comment marker (`<!-- kw:claim project=X -->`) roundtrip: issue #111 requests verification against a live Gitea instance; implement and document in adapter header, with note that offline tests cover the format only
