# Advisor Ideation Gate: Issue #111

## Verdict: Proceed — plan sound with 4 adjustments

### Adjustment 1 (Material): `updateIssueLabels` signature
Use `tea issues edit <N> --add-labels=L --remove-labels=L` (NOT `tea api` PUT-replace).
Gitea REST label endpoints take IDs not names; `tea issues edit` resolves names server-side.
Signature: `updateIssueLabels(project, issueNumber, { add, remove, ...exec })` — mirrors issue spec.
Drop PUT-replace semantics from plan.

### Adjustment 2 (Documentation): `tea api` flag syntax assumed, no live verification possible
- No auto-prefix of `/api/v1` (docs examples show `repos/{owner}/{repo}/labels` directly)
- Flags: `-X METHOD`, `-d 'JSON'`, `-f key=value`
- Document in adapter header comment as assumptions; future maintainer with live instance can verify.
- Don't gate work on live verification not available in this environment.

### Adjustment 3 (Documentation): HTML comment roundtrip deferred
`<!-- kw:claim project=X -->` stored as-is in `body` — verification requires live Gitea instance.
Note in ideation and plan docs; revisit when integration tests land (#116).

### Adjustment 4 (Cosmetic): Rename implementation sub-phases
Use "Task A/B/C/D" not "Phase 1/2/3/4" to avoid collision with kaola-workflow Phase 1-6 naming.

## Accepted As-Is
- Mirror approach with `tea api` for REST
- Lazy-once `tea --version` check with injectable `execFileSync`
- `issue_iid` alias on normalized issue
- Auto-merge as opt-in best-effort with version-gated downgrade (422 → catch → plain merge)
- No `projectApiRef` — Gitea uses `{owner}/{repo}` directly
- `ensureLabel` idempotent create, no reconciliation
- Items NOT to build list — comprehensive

## Selected Approach
Mirror approach (single `teaExec` CLI wrapper, `tea api` for REST, `tea issues edit` for label add/remove).
Proceed to Phase 3.
