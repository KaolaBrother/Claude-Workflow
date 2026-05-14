# Code Review — branch-issue-merge-sink

## File Sizes
| File | Lines | Limit |
|------|-------|-------|
| `scripts/kaola-workflow-sink-merge.js` | 157 | 800 |
| `scripts/kaola-workflow-claim.js` | 391 | 800 |
| `scripts/validate-workflow-contracts.js` | 208 | 800 |
| `scripts/simulate-workflow-walkthrough.js` | 567 | 800 |

All files under 800-line limit.

---

## CRITICAL
none

## HIGH

### H1 — updateSinkLease in-place regex duplicates the Lease block
File: `scripts/kaola-workflow-claim.js:126`

`/^## Lease[\s\S]*?(?=\n##|\s*$)/m` — with the `m` flag, `$` matches end-of-line, not end-of-string. The non-greedy `[\s\S]*?` stops immediately after `"## Lease"` because `\s*$` is satisfied at EOL. The replacement inserts new Lease fields but leaves old fields in place, producing duplicate keys.

Reachable on re-claim (after heartbeat timeout + sweep). Not covered by any Epic Case.

Fix: drop the `m` flag:
```js
updated = updated.replace(/^## Lease[\s\S]*?(?=\n##|\s*$)/, leaseBlock.slice(1));
```

### H2 — sink-merge.js `main()` is 114 lines (2× the 50-line limit)
File: `scripts/kaola-workflow-sink-merge.js:42–155`

Extract: `doRebase(args, alreadyUpToDate)` for Steps 3-4; `ffMergeLoop(args)` for the retry loop (Steps 5-6); slim `main()` sequences them.

### H3 — phase6.md Step 8 bash template unconditionally passes `--issue "$SINK_ISSUE"` even when value is `"unset"`
File: `commands/kaola-workflow-phase6.md:415–424`

When `SINK_ISSUE` is the literal string `unset`, `parseInt('unset', 10) → NaN`, assertion throws, sink-merge exits 1. Breaks all projects without a linked GitHub issue.

Fix: conditional `--issue` flag:
```bash
SINK_ISSUE_FLAG=""
[ "$SINK_ISSUE" != "unset" ] && SINK_ISSUE_FLAG="--issue $SINK_ISSUE"
node ~/.claude/kaola-workflow/scripts/kaola-workflow-sink-merge.js \
  --branch "$SINK_BRANCH" \
  $SINK_ISSUE_FLAG \
  --project {project}
```

## MEDIUM

### M1 — `$` in branch/project name truncates `branch:` line in regex replacement
Files: `scripts/kaola-workflow-claim.js:125`, `scripts/kaola-workflow-claim.js:367`

`String.replace` interprets `$1` in the replacement string as a backreference. Use function form: `content.replace(/^branch:.*$/m, () => 'branch: ' + branchName)`. Both lines 125 and 367 need this.

### M2 — sink-merge.js `--branch` validation weaker than rest of codebase
File: `scripts/kaola-workflow-sink-merge.js:44`

Add null byte, `.`, `..` exclusions consistent with `cmdPatchBranch`.

### M3 — simulate-workflow-walkthrough.js `main()` is 445 lines
File: `scripts/simulate-workflow-walkthrough.js:121–565`

Extract each Epic Case into its own named function.

## LOW

### L1 — `cmdClaim()` is 51 lines (1 over limit)
### L2 — `sleepMs` CPU spin-wait
### L3 — Stage 1 migration block in phase1.md Step 6 logically unreachable as written

---

## Verdict
WARNING — 3 HIGH issues must be resolved before Phase 6.
