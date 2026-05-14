# Security Review — branch-issue-merge-sink

## Files Reviewed
- `scripts/kaola-workflow-sink-merge.js`
- `scripts/kaola-workflow-claim.js`

## HIGH
### S-H1 — args.branch passed to git without `--` end-of-options separator
Files: `sink-merge.js:99,109,121,125,150,152`; `claim.js:353`

Leading-dash branch names (e.g. `--upload-pack=cmd`) are interpreted as git flags. `execFileSync` prevents shell injection but git parses its own argv. Fix: prepend `--` before branch name in all positional git invocations, OR add leading-dash rejection to validation.

Note: `isSafeName` blocks `/` so cannot be used for branch validation (workflow/ prefix must be allowed). A separate `isSafeBranchName` check or `--` separator is required.

## MEDIUM
### S-M1 — args.branch used as String.replace replacement string (backreference risk)
File: `claim.js:367`

`content.replace(/^branch:.*$/m, 'branch: ' + args.branch)` — dollar signs in branch name are interpreted as backreference patterns. Use function form: `() => 'branch: ' + args.branch`.

## LOW
### S-L1 — claim_comment_id from disk not re-validated before use as gh arg
File: `claim.js:373`

Validate with `/^\d+$/.test(lock.claim_comment_id)` before passing to gh CLI.

## NOTE
`npm test` runs on rebased branch content — intentional design; requires trusted branch authors.

## Confirmed Clean
- No shell: true in any execFileSync call — command injection not possible
- No hardcoded secrets or credentials
- args.project / args.session gated by isSafeName before all path construction
- args.issue parseInt'd and asserted > 0 before gh invocation
- OFFLINE guards all gh CLI calls
- Lock file uses O_EXCL (fs.openSync with 'wx') — TOCTOU safe

## Verdict
1 HIGH (blocking), 1 MEDIUM, 1 LOW
