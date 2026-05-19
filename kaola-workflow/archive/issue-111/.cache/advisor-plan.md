# Advisor Plan Gate: Issue #111

## Verdict: Approved — three fixes folded in, no architect revision needed

### Fix 1 (Locking): JSON key insertion order in mock keys
`JSON.stringify` emits fields in insertion order. Two functions affected:

`mergePullRequest` body must be constructed in this exact order to match mock key:
```js
const mergeBody = {};
mergeBody.Do = opts.squash ? 'squash' : 'merge';
mergeBody.delete_branch_after_merge = !!opts.removeSourceBranch;
if (opts.sha) mergeBody.merge_message_field = opts.sha;
// Result: {"Do":"squash","delete_branch_after_merge":true,"merge_message_field":"abc123"}
```

`ensureLabel` POST body must be constructed in this order:
```js
const labelBody = { name: labelDef.name, color: labelDef.color, description: labelDef.description || '' };
// Result: {"name":"workflow:in-progress","color":"#e11d48","description":""}
```

### Fix 2 (Documentation): `updateIssueComment` path comment
Path `/api/v1/repos/{owner}/{repo}/issues/comments/{commentId}` has no `{index}` segment.
Add a code comment citing docs-lookup: "Gitea PATCH comment endpoint omits the issue index — /issues/comments/{id} is correct per docs-lookup".

### Fix 3 (Signature consistency): `closeIssue` without `project` param
Keep `closeIssue(issueNum, opts)` — CLI form does not need project (tea derives from cwd).
Document in code comment: "no project param — mirrors GitLab adapter; tea resolves repo from cwd".

### Phase 4 Note (not blocking)
`tea issues edit` may not emit JSON stdout — `parseJson(raw, {})` returns `{}` if it prints human-readable.
Document assumption in adapter header. If test fails, switch to after-call `viewIssue(issueNum)`.

## Accepted As-Is
- Task A→B→(C∥D)→E sequence
- Lazy-once version check with execFileSync skip
- `/api/v1/` prefix rule uniform
- 23-export surface
- Mock key strategy with binary assertion loop
