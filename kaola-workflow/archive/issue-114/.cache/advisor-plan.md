# Advisor Plan Gate: issue-114

## Verdict
Plan is mostly sound. One blocking gap plus minor sharpenings. Do not route back to code-architect — fold directly into phase3-plan.md.

## Blocking Gap

### `glab mr <other verbs>` leak
After step 13 catch-all (`glab` → `tea`), any `glab mr update/close/reopen/checkout/approve` becomes `tea mr <verb>`. Bare lowercase `mr` is not substituted by step 21 (uppercase only) and not caught by validation regex.

Two-part fix:
1. Enumerate actual `glab mr <verb>` patterns in source: `grep -rEo 'glab mr [a-z]+' plugins/kaola-workflow-gitlab/ | sort -u`
2. Add belt-and-suspenders after step 13: `tea mr ` → `tea pr ` (trailing space prevents false matches)
3. Add `(^|[^A-Za-z0-9])mr [a-z]+` to forbidden-token validation regex

## Smaller Gaps

### forge.js exports unconfirmed
Steps 8/9 reference `addIssueComment()` / `mergePullRequest()` by name without confirming they exist in forge.js. Before Phase 4 substitution batch, executor must run:
```
grep -E '^(exports\.|module\.exports|function |const .* = )' plugins/kaola-workflow-gitea/scripts/kaola-gitea-forge.js
```
and reconcile actual export names.

### Case variants of "merge request"
Step 14 only covers `merge request` and `Merge Request` (2 of 4 case combos). Expand to all 4, or rely on validation to catch any miss.

## Non-blocking Notes
- `glab auth status` etc. → `tea auth status` is mechanical; whether `tea` supports it is out of scope
- `#FC6D26` in validation regex only matches codex manifest — correct

## Applied Sharpenings for phase3-plan.md
1. Add step 13.5: `tea mr ` → `tea pr ` (after step 13 catch-all)
2. Confirm forge.js exports before Phase 4 substitution batch begins
3. Expand step 14 to 4 case variants
4. Add `(^|[^A-Za-z0-9])mr [a-z]+` to forbidden-token validation
