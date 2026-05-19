# Phase 2 - Ideation: issue-111

## Approaches Evaluated

### Option A: Mirror approach — single `teaExec` wrapper + `tea api` for REST (Selected)
- Summary: Mirror `kaola-gitlab-forge.js` line-for-line. `teaExec(args, opts)` wraps the `tea` CLI binary. All REST calls that lack high-level `tea` sub-commands go through `teaExec(['api', '-X', 'METHOD', path, '-d', body])`. Label add/remove via `tea issues edit --add-labels --remove-labels`. Auth delegated to `tea`.
- Pros: Identical test harness (injectable `opts.execFileSync`, offline shim); no extra HTTP layer; `tea api` handles auth automatically; minimal surface divergence from GitLab adapter.
- Cons: Assumes `tea api` flag syntax is stable; flag syntax unverifiable without live instance.
- Risk: Low (mitigated by documenting assumptions in adapter header)
- Complexity: Small–Medium

### Option B: Hybrid CLI + direct Node `https`
- Summary: Use `tea` CLI for high-level operations; raw `https.request` for REST calls.
- Pros: No dependency on `tea api` sub-command stability.
- Cons: Duplicates auth, retry, error handling; adds `GITEA_TOKEN` requirement for all REST paths; diverges from GitLab pattern significantly.
- Risk: Medium
- Complexity: Large
- **Rejected**: `tea api` covers all REST; adding HTTP is unnecessary complexity.

### Option C: Pure `tea api` (no high-level sub-commands)
- Summary: Route everything through `tea api`, including `issue list` and `repo view`.
- Pros: Uniform REST interface; no CLI version fragility.
- Cons: Loses the `--output json` convenience of high-level commands; more verbose test strings.
- Risk: Low
- Complexity: Small
- **Rejected** unless high-level JSON output is confirmed unavailable (treat as fallback per-function).

## Advisor Findings

Plan sound. Four adjustments applied:

1. **`updateIssueLabels` signature corrected**: Use `tea issues edit --add-labels=L --remove-labels=L` (Gitea REST label endpoints require IDs; `tea` handles name resolution server-side). Signature: `updateIssueLabels(project, num, { add, remove })`.
2. **`tea api` flag syntax documented as assumptions**: `-X METHOD`, `-d JSON`, `-f key=value`; no auto-prefix of `/api/v1`. No live Gitea instance available — document in adapter header for future verification.
3. **HTML comment roundtrip deferred**: `<!-- kw:claim project=X -->` format defer to #116 integration tests.
4. **Implementation sub-phases renamed**: "Task A/B/C/D" (not "Phase 1/2/3/4") to avoid naming collision.

## Selected Approach

**Option A** — Mirror approach with `teaExec` wrapper and `tea api` for REST.

Rationale: Lowest implementation risk, identical test infrastructure to GitLab, no new dependencies. All four advisor adjustments are non-blocking and folded into the implementation plan. `updateIssueLabels` correction is the only material change vs. planner output.

## Field/Function Rename Map (from GitLab)

| GitLab | Gitea |
|--------|-------|
| `normalizeMergeRequest` | `normalizePullRequest` |
| `createMergeRequest` | `createPullRequest` |
| `viewMergeRequest` | `viewPullRequest` |
| `listMergeRequests` | `listPullRequests` |
| `mergeMergeRequest` | `mergePullRequest` |
| `mr_iid` | `pr_number` |
| `mr_url` | `pr_url` |
| `createIssueNote` | `createIssueComment` |
| `listIssueNotes` | `listIssueComments` |
| `updateIssueNote(project, issueIid, noteId, body)` | `updateIssueComment(project, issueNum, commentId, body)` |
| `updateIssue` (broad) | `updateIssueLabels(project, num, {add, remove})` |
| `projectApiRef` | dropped — Gitea uses `{owner}/{repo}` directly |
| n/a | `ensureLabel` (new) |

## Out of Scope (explicit)

- No direct HTTP/`https`/`fetch`
- No token loading or auth management (`tea` owns it)
- No webhook listener, event router, retry/backoff, caching
- No CLI entrypoint (library only)
- No project mutation beyond `discoverProject`
- No methods outside specified export surface
- No `package.json` or external dependencies
- No label color/description reconciliation on existing labels
- No integration tests against live Gitea (deferred to #116)
- No auto-prefix of `/api/v1` in `tea api` calls

## Notes / Future Considerations

- HTML comment marker `<!-- kw:claim project=X -->` roundtrip verification deferred to #116 integration tests
- `tea api` flag syntax (`-X`, `-d`, `-f`) documented as environment assumption; verify against live instance when #116 lands
- `auto_merge` field name unconfirmed in docs — implement as opt-in best-effort; server 422 is caught and triggers plain-merge downgrade
- If `tea --output json` is unavailable on some high-level sub-commands, fall back to `tea api` per-function

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
