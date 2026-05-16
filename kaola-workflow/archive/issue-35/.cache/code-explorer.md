# Code Explorer Cache — issue-35

## Entry Points

- `cmdStartup()` — `scripts/kaola-workflow-claim.js:1172`
- `cmdClassify()` — `scripts/kaola-workflow-classifier.js:369`

## Execution Flow

1. `cmdStartup()` (claim.js:1172) calls `fetchOpenIssueRecords(root)` (claim.js:950)
2. `fetchOpenIssueRecords()` (claim.js:950) runs `gh issue list --json number,title,state,labels,updatedAt,url` then calls `sortIssueRecords(issues)` (claim.js:964)
3. `sortIssueRecords()` (claim.js:921-928) — **THE ENTIRE RANKING LOGIC**:
   - Primary sort key: `workflow:queued` label presence (rank 0 = queued, rank 1 = all others)
   - Secondary sort key: ascending `issue.number`
   - P0/P1/P2/P3 priority labels are completely absent
4. `runStartupClaimFirstAvailable()` (claim.js:1151-1170) iterates sorted list, calling `classifyIssueCandidate()` on each
5. `classifyIssueCandidate()` (claim.js:1041-1057) spawns `classifier.js classify --issue N` subprocess
6. First issue returning `green` or `yellow` from classifier is claimed via `runBootstrapClaim()` (claim.js:1092)

## Key Fix Location

```js
// claim.js:921-928 — sortIssueRecords (entire body):
function sortIssueRecords(issues) {
  return issues.slice().sort(function(a, b) {
    const aq = issueHasLabel(a, 'workflow:queued') ? 0 : 1;
    const bq = issueHasLabel(b, 'workflow:queued') ? 0 : 1;
    if (aq !== bq) return aq - bq;
    return Number(a.number || 0) - Number(b.number || 0);
  });
}
```

P0/P1/P2/P3 produce no weight. Fix must extend this comparator.

## Startup Receipt Structure

`writeStartupReceipt()` at claim.js:528-537. Fields on successful claim:
- `startup_completed`, `session`, `written_at`, `runtime`
- `issue_sync`, `roadmap_sync`, `issue_source`
- `project`, `issue`, `selected_issue`, `selected_project`
- `verdict`, `claim`
- `skipped` — array of `{ issue, verdict, reason }`
- `blocked` — array of `{ issue, reason }`

No `ranking` field currently emitted.

## Label Data Structure

**Online path** (fetchOpenIssueRecords, claim.js:955-960): `gh issue list --json labels`
→ each label: `{ name: "P1", color: "...", description: "..." }`
→ helper `issueHasLabel(issue, labelName)` at claim.js:917 for presence checks
→ helper `issueLabelNames(issue)` at claim.js:911 for name extraction

**Offline path** (readLocalRoadmapIssueRecords, claim.js:930-948):
→ `labels` hardcoded to `[]` — local `.roadmap/issue-N.md` has `labels: P0, P1, bug` flat string BUT NOT parsed

Label name extraction: `labelName(label)` at classifier.js:208 — `String((label && label.name) || label || '')`

## Config File Pattern

- Global user config: `~/.config/kaola-workflow/config.json`
- Read by `readOrCreateConfig()` at classifier.js:72-81
- Current content: `{ "parallel_mode": "auto" }`
- Only consumed by `cmdClassify`, not `cmdStartup` or `sortIssueRecords`
- No project-level config file exists today

## Classifier Logic (classifier.js)

- `classify()` at classifier.js:322 — checks `depends-on:#N` blocking and file/area overlaps
- `parseDependsOn()` at classifier.js:187 — parses `depends-on:#N` from label array
- `parseAreaLabels()` at classifier.js:195 — parses `area:*` labels
- Neither touches P0/P1/P2/P3 labels

## Test Locations and Framework

| File | Purpose |
|---|---|
| `scripts/simulate-workflow-walkthrough.js` | Integration tests — main |
| `scripts/validate-workflow-contracts.js` | Contract/structural assertions (Claude plugin) |
| `scripts/validate-kaola-workflow-contracts.js` | Contract tests (Codex plugin) |

Framework: hand-rolled `assert(condition, message)` — no external framework.
Run: `node scripts/simulate-workflow-walkthrough.js` → must exit 0.
Startup tests: Epic Case 14 (simulate line 3111).
Classifier tests: Epic Case 6 (line 890) and Epic Case 12 (line 2753).
No existing test for priority label ordering.

## Naming Conventions

- Functions: `camelCase` (e.g. `sortIssueRecords`, `parseDependsOn`, `parseAreaLabels`)
- CLI entry points: `cmd` prefix + PascalCase (e.g. `cmdStartup`, `cmdClassify`)
- Constants: `UPPER_SNAKE_CASE` (e.g. `CLAIM_LABEL`, `RECENT_HEARTBEAT_MS`)
- Regex constants: `_REGEX` suffix (e.g. `FILE_PATH_REGEX`, `AREA_PATH_REGEX`, `DEPENDS_ON_REGEX`)
- Boolean helpers: plain verbs (`issueHasLabel`, `isSafeName`)

## Error Handling Patterns

- Top-level: `try { main(); } catch (err) { process.stderr.write(err.message + '\n'); process.exitCode = 1; }` (claim.js:2106)
- `gh` failures fall back silently to local roadmap (claim.js:965)
- Classifier subprocess failure: returns `verdict: 'skipped'` with reason (claim.js:1051-1055)
- Config read failure: caught silently, creates default config (classifier.js:75-81)

## Second Iteration Path

`runBootstrapClassify` → `pickFirstActionableIssue` (claim.js:1059-1071) used by `cmdBootstrap` also goes through `fetchOpenIssueRecords` → `sortIssueRecords`. Same pipeline needs the fix.
