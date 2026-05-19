# Planner: Issue #111 — Gitea Forge Adapter Strategy

## Approaches Considered

This is not an open design question — Phase 1 has narrowed it. Recorded for the record:

1. **Mirror approach (single CLI wrapper, `tea api` for REST)** — chosen. Matches GitLab adapter line-for-line where possible.
2. **Hybrid CLI + direct HTTPS via Node `https`** — rejected. `tea api` covers all REST; adding HTTP duplicates auth, retry, and error handling.
3. **Pure `tea api` (no high-level `tea issue list`)** — rejected unless `tea issue list --output json` proves missing during Phase 2 verification. GitLab mixes high-level and `glab api`; mirror that.

## Architectural Fit — Field/Function Rename Map

| GitLab field/fn | Gitea field/fn |
|---|---|
| `normalizeMergeRequest` | `normalizePullRequest` |
| `createMergeRequest` | `createPullRequest` |
| `viewMergeRequest` | `viewPullRequest` |
| `listMergeRequests` | `listPullRequests` |
| `mergeMergeRequest` | `mergePullRequest` |
| `mr_iid` | `pr_number` |
| `mr_url` | `pr_url` |
| `createIssueNote` | `createIssueComment` |
| `listIssueNotes` | `listIssueComments` |
| `updateIssueNote` | `updateIssueComment` |
| `updateIssue` (broad) | `updateIssueLabels` (labels only) |
| `projectApiRef` (numeric or url-encoded path) | dropped — Gitea uses `{owner}/{repo}` path segments |
| n/a | `ensureLabel` (new, idempotent create) |

## Implementation Phases

### Phase 1 — Pure helpers
- Create adapter shell with constants, pure helpers (`parseJson`, `firstNumber`, `labelsOf`, `uniqueLabels`, `preserveWorkflowLabels`, `normalizeState`)
- Create test scaffold with `runner(calls, responses)` factory, assertions for pure helpers

### Phase 2 — `teaExec`, version check, project discovery
- Verify `tea api` flag syntax (BLOCK before locking test strings)
- Verify high-level JSON output availability
- Implement `teaExec` with lazy version check (cached, offline-safe)
- Implement `normalizeProject` + `discoverProject`

### Phase 3 — Issues, comments, ensureLabel
- `normalizeIssue`, `listIssues`, `viewIssue`
- `updateIssueLabels` (PUT-replace semantics), `closeIssue`
- Comment CRUD via `tea api`
- `ensureLabel` (idempotent create)

### Phase 4 — Pull requests with best-effort auto-merge
- `normalizePullRequest`, `createPullRequest`, `viewPullRequest`, `listPullRequests`
- `mergePullRequest` with server-version-gated auto-merge downgrade
- Module exports (all listed surface)

## Open Verifications (Before Locking Test Strings)

**BLOCK:**
1. Exact `tea api` flag syntax — method flag, body flag, body encoding
2. Whether `tea api` auto-prefixes `/api/v1`

**Non-block:**
3. JSON output availability for `tea issues list`, `tea repo view`, `tea pulls list`
4. Gitea issue identifier — JSON field `number` vs URL path `index`
5. Auto-merge field name and minimum server version

## Key Design Decisions

- **`teaExec` version check**: lazy-once, cached, injectable for tests via `opts.execFileSync`
- **Label management**: PUT-replace semantics (not add/remove by id) — simpler, callers pre-merge via `preserveWorkflowLabels`
- **Auto-merge**: opt-in, server-version-gated, downgrade to plain merge on version < 1.17 or any error
- **No `projectApiRef`**: Gitea uses `{owner}/{repo}` — store `owner` and `name` on normalized project
- **`issue_iid` alias kept**: downstream callers using `.issue_iid` work unchanged

## Items NOT to Build

- No direct HTTP, `https` module, or `fetch`
- No token loading/storage/refresh (`tea` owns auth)
- No webhook listener, event router, retry/backoff
- No caching layer for lists
- No CLI entrypoint (library only)
- No project mutation beyond `discoverProject`
- No methods outside listed export surface
- No `package.json` or external dependencies
- No reconciliation of label color/description on existing labels
- No integration test against live Gitea server

## Success Criteria

- [ ] `test-gitea-forge-helpers.js` exits 0
- [ ] Every recorded call uses `bin === 'tea'`
- [ ] `KAOLA_WORKFLOW_OFFLINE=1` path covered
- [ ] Auto-merge downgrade path covered (both branches)
- [ ] `ensureLabel` idempotency covered (both branches)
- [ ] Exported surface matches spec exactly
- [ ] `node scripts/simulate-workflow-walkthrough.js` still exits 0
- [ ] No `package.json` added
