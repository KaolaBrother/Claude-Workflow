# Code-Explorer: pr-sink

## Completeness Score: 9/10

## Key Findings

### 1. Primary Mirror: kaola-workflow-sink-merge.js (174 lines)
CLI: `node kaola-workflow-sink-merge.js --branch <name> --issue <N> --project <name>`
10-step execution: fetch → merge-base-skip → rebase → npm test → pull main → FF merge (retry 3x) → push main → gh issue close → git branch -d → git push --delete
Exit codes: 0=success, 1=fatal, 2=FF race exhausted
OFFLINE flag: skips all network/git-remote operations
KAOLA_WORKFLOW_FORCE_FF_FAIL=<n>: test-only flag

### 2. Phase 6 Dispatch Location
Dispatch is in `commands/kaola-workflow-phase6.md` Step 8 (lines 427-452) — NOT in workflow-next.md.
Currently NO conditional dispatch — unconditionally invokes sink-merge.js.
workflow-next.md is 236 lines / 240-line cap — 4 lines headroom, no room for dispatch.

### 3. kaola-workflow-claim.js Subcommands
`claim | release | heartbeat | sweep | status | patch-branch`
No `watch-*` subcommand.
`release --session <id>`: finds lock, removes label, deletes lock file + session file.
`sweep`: removes expired locks (>24h).
Lock schema: `{project, session_id, machine_id, claimed_at, expires, last_heartbeat, issue_number, claim_comment_id}`
branch field: NOT in base lock; added by patch-branch via Object.assign.

Sink/Lease blocks written to workflow-state.md at claim time (claim.js:104-115):
```
## Sink
branch: workflow/issue-{N}-{project}   (or workflow/{project} when no issue)
issue_number: {N} | unset
claimed_at: {ISO}

## Lease
session_id: {uuid}
expires: {ISO}
last_heartbeat: {ISO}
claim_comment_id: {id} | N/A
```
No `sink:` discriminator field exists yet — must be added.

### 4. Config File
`~/.config/kaola-workflow/config.json` currently: `{"parallel_mode":"auto"}`
No `pr_auto_merge` field. Pattern: `readOrCreateConfig()` in classifier.js:47-56.

### 5. workflow-next.md
236 lines, cap 240 (validate-workflow-contracts.js:151). Only 4 lines headroom.
Startup Step 0 was updated by issue #6.
Co-active Leases section (lines 149-152) is documentation text only.

### 6. kaola-workflow-roadmap.js project-name subcommand
Does NOT exist. Dispatch handles only: generate | migrate | validate | init-issue.
Branch naming: `claim.js:100-102` — `workflow/issue-{N}-{project}` or `workflow/{project}`.
sink-pr.js should read branch from `## Sink` block in workflow-state.md directly.

### 7. validate-workflow-contracts.js — assertions to mirror
For sink-merge.js (lines 192-198):
```js
assertIncludes('install.sh', 'kaola-workflow-sink-merge.js');
assertIncludes('commands/kaola-workflow-phase6.md', 'kaola-workflow-sink-merge.js');
assertIncludes('scripts/kaola-workflow-sink-merge.js', 'MAX_AUTOMERGE_RETRIES');
assertIncludes('scripts/kaola-workflow-sink-merge.js', 'KAOLA_WORKFLOW_OFFLINE');
assertIncludes('scripts/kaola-workflow-sink-merge.js', 'KAOLA_WORKFLOW_FORCE_FF_FAIL');
```

### 8. simulate-workflow-walkthrough.js Epic Cases
- Cases 2/3/4 (lines 410-558): sink-merge (OFFLINE, rebase, FF race)
- Case 5 (lines 561-675): roadmap.js
- Case 6 (lines 677-803): classifier
- Case 7: PR sink (new)
Cases 2/3/4 scaffold real bare git repos + gh shim for network ops.
6E/6E' uses a shell `gh` shim at `{sandbox}/bin/gh` prepended to PATH.

### 9. Line Counts and Cap
workflow-next.md: 236 lines, cap 240 (4 lines headroom)
kaola-workflow-phase6.md: Step 8 is the sink dispatch location

### 10. Phase 6 Artifacts
No `phase6-pr-body.md` template exists.
`phase6-summary.md` template defined in kaola-workflow-phase6.md:299-353.
Most recent archived: kaola-workflow/archive/branch-issue-merge-sink/phase6-summary.md

## Critical Discrepancies for Design

1. Phase 6 dispatch is in `kaola-workflow-phase6.md` Step 8, not workflow-next.md.
2. `kaola-workflow-roadmap.js project-name` subcommand does not exist — derive branch from ## Sink block.
3. Epic Cases 2/3/4 = sink-merge; 5 = roadmap; 7 = PR sink (new).
