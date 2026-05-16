# Code Architect Cache — issue-35

## Design Decisions

- **Re-sort in `cmdStartup`, not in `fetchOpenIssueRecords`**: `cmdStartup` calls `sortIssueRecords(issueFetch.issues, opts)` where opts carries the merged config. `fetchOpenIssueRecords` is untouched and continues to call `sortIssueRecords(issues)` with no opts for bootstrap/status paths. The signature extension uses `opts = {}` default for backward compat.
- **`readPriorityConfig` is read-only on both layers**: Unlike `readOrCreateConfig` in classifier.js, never writes to disk. Any ENOENT or parse error → returns `[]`.
- **`ranking` covers all issues in post-sort order**: Every issue in the startup loop appears in the ranking array, regardless of pick/skip/block. Additive on all three `writeStartupReceipt` call sites.
- **Case-sensitive label matching**: Mirrors existing `issueHasLabel` / `issueLabelNames` semantics.
- **Multiple P-labels → minimum tier**: `["P2","P0"]` → tier 0, `priority_label: "P0"`.
- **Override supersedes P-parse entirely**: when override fires, `priority_label: null`, `override_label: matchedLabel`.
- **Constant placed near file-top constants** (~line 11-14). Helpers placed immediately before `sortIssueRecords` (~line 920).

## Files to Modify

| File | Changes |
|------|---------|
| `scripts/kaola-workflow-claim.js` | Add constant, two helpers, extend `sortIssueRecords`, wire config + ranking in `cmdStartup` |
| `scripts/simulate-workflow-walkthrough.js` | Add Epic Cases 14a and 14b after existing Epic Case 14 block |
| `scripts/validate-workflow-contracts.js` | Add 6 `assertIncludes` assertions |
| `CHANGELOG.md` | Add entry under `[Unreleased]` |
| `README.md` | Add P0-P3 label ranking + top-tier config note |

## Files to Create
None.

## Data Flow

```
cmdStartup()
  → readPriorityConfig(root)             # merge global + project-local config layers
  → fetchOpenIssueRecords(root)          # returns issues sorted by: queued | number
  → sortIssueRecords(issues, { topTierLabels })
        per issue: parsePriorityTier(issue, topTierLabels) → { tier, priority_label, override_label }
        sort key 1: workflow:queued (0/1)
        sort key 2: priority tier (0-4)
        sort key 3: issue.number ascending
  → ranking = issues.map(issue => parsePriorityTier result + issue.number)
  → runStartupClaimFirstAvailable(... sortedIssues ...)
  → writeStartupReceipt(... { ranking } ...)   # on all three paths: owned / no-pick / picked
```

## Build Sequence

### Step 1 — Constant `PRIORITY_TIER_BY_LABEL` (no deps)
File: `scripts/kaola-workflow-claim.js`
Insert after line 11 (`const RECENT_CLAUDE_SESSION_MS = ...`):
```js
// Maps label names to sort tier. Lower tier = higher priority.
const PRIORITY_TIER_BY_LABEL = { P0: 0, P1: 1, P2: 2, P3: 3 };
```

### Step 2 — Helper `parsePriorityTier(issue, topTierLabels)` (depends on Step 1, uses `issueLabelNames`)
Insert immediately before `sortIssueRecords` (~line 921). After `issueHasLabel`.

Pseudocode:
```
function parsePriorityTier(issue, topTierLabels):
  labels = issueLabelNames(issue)
  // Top-tier override check (highest precedence)
  for each label in labels:
    if topTierLabels includes label:
      return { tier: 0, priority_label: null, override_label: label }
  // P-label scan — take minimum tier
  minTier = 4; minLabel = null
  for each label in labels:
    if PRIORITY_TIER_BY_LABEL[label] is defined:
      t = PRIORITY_TIER_BY_LABEL[label]
      if t < minTier: minTier = t; minLabel = label
  return { tier: minTier, priority_label: minLabel, override_label: null }
```

Notes:
- Pure function (no I/O). `topTierLabels` always an array. Uses `issueLabelNames` (strings already).

### Step 3 — Helper `readPriorityConfig(root)` (depends on `os`, `fs`, `path` imports — already present)
Insert immediately before `parsePriorityTier`.

Pseudocode:
```
function readPriorityConfig(root):
  globalCfgPath = path.join(os.homedir(), '.config', 'kaola-workflow', 'config.json')
  localCfgPath  = path.join(root, 'kaola-workflow', 'config.json')

  function safeReadLabels(filePath):
    try:
      cfg = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      arr = cfg.priority_top_tier_labels
      if Array.isArray(arr): return arr.filter(x => typeof x === 'string' && x.length > 0)
      return []
    catch: return []  // ENOENT, parse error — silently return []

  return [...safeReadLabels(globalCfgPath), ...safeReadLabels(localCfgPath)]
  // union: global first, then local; duplicates harmless (override check exits on first match)
```

Key divergence from classifier.js: NO `mkdirSync` or `writeFileSync` on ENOENT. Read-only.

### Step 4 — Extend `sortIssueRecords(issues, opts)` (depends on Steps 1-3)
Modify existing function at claim.js:921-928. New signature: `function sortIssueRecords(issues, opts)`.

Pseudocode:
```
function sortIssueRecords(issues, opts):
  topTierLabels = (opts && Array.isArray(opts.topTierLabels)) ? opts.topTierLabels : []
  return issues.slice().sort(function(a, b):
    aq = issueHasLabel(a, 'workflow:queued') ? 0 : 1
    bq = issueHasLabel(b, 'workflow:queued') ? 0 : 1
    if aq !== bq: return aq - bq
    at = parsePriorityTier(a, topTierLabels).tier
    bt = parsePriorityTier(b, topTierLabels).tier
    if at !== bt: return at - bt
    return Number(a.number || 0) - Number(b.number || 0)
  )
```

Callers with no opts (bootstrap path) → `opts` undefined → `topTierLabels = []` → all tier 4 → behavior unchanged.

### Step 5 — Wire config and ranking into `cmdStartup` (depends on Steps 1-4)
Five precise changes within `cmdStartup` (~lines 1172-1253):

5a. After `const root = getRoot();`:
```js
const topTierLabels = readPriorityConfig(root);
```

5b. After `const issueFetch = fetchOpenIssueRecords(root);`:
```js
if (issueFetch.issues.length > 0) {
  issueFetch.issues = sortIssueRecords(issueFetch.issues, { topTierLabels });
}
```

5c. Build ranking after re-sort:
```js
const ranking = issueFetch.issues.map(function(issue) {
  const t = parsePriorityTier(issue, topTierLabels);
  return { issue: Number(issue.number), tier: t.tier, priority_label: t.priority_label, override_label: t.override_label };
});
```

5d-5e. Add `ranking: ranking` to all three `writeStartupReceipt` calls (owned case ~1198, no-pick ~1218, picked ~1238). Append to existing data object, no other changes.

### Step 6 — Epic Cases 14a and 14b (depends on Steps 1-5)
File: `scripts/simulate-workflow-walkthrough.js`
Insert after closing `}` of existing Epic Case 14 block (after line 3234).

**Epic Case 14a — Priority label ranking:**
- 4 issues in reverse-priority order: 301(P3), 302(P2), 303(P1), 304(P0)
- HOME = tmp dir (no real config read)
- Run startup with `sess-14a`
- Assert: `first14a.issue === 304`, `first14a.ranking.length === 4`, tier/priority_label/override_label for issue 304 and 301 are correct

**Epic Case 14b — Top-tier override:**
- 2 issues: 401(hotfix label, no P-label), 402(P0)
- Write `<tmp>/kaola-workflow/config.json` with `{ "priority_top_tier_labels": ["hotfix"] }`
- HOME = tmp dir
- Run startup with `sess-14b`
- Assert: `first14b.issue === 401`, `r401.override_label === 'hotfix'`, `r401.priority_label === null`

Note: Epic Case 14 fixture has no P-labels → all tier 4 → sort unchanged. Existing `first.issue === 201` assertion still passes.

### Step 7 — Contract assertions (depends on Step 6)
File: `scripts/validate-workflow-contracts.js`
Append before final `console.log(...)` line:
```js
assertIncludes('scripts/kaola-workflow-claim.js', 'PRIORITY_TIER_BY_LABEL');
assertIncludes('scripts/kaola-workflow-claim.js', 'parsePriorityTier');
assertIncludes('scripts/kaola-workflow-claim.js', 'readPriorityConfig');
assertIncludes('scripts/kaola-workflow-claim.js', 'ranking');
assertIncludes('scripts/simulate-workflow-walkthrough.js', 'Epic Case 14a');
assertIncludes('scripts/simulate-workflow-walkthrough.js', 'Epic Case 14b');
```

### Step 8 — Docs
CHANGELOG.md under `[Unreleased]`:
```
### Added
- `startup` now ranks open issues by P0/P1/P2/P3 GitHub labels before claiming (P0 highest).
  Startup receipt includes a `ranking` array listing tier, matched priority label, and any top-tier override label for every candidate issue.
- Two-layer priority config: global `~/.config/kaola-workflow/config.json` and project-local
  `<repo>/kaola-workflow/config.json` may both supply `priority_top_tier_labels` arrays;
  union of both arrays forces any matching label to tier 0.
```

README.md: add subsection after startup command description documenting sort order and `priority_top_tier_labels` config key with example.

## Edge Cases

| Edge case | Handling |
|-----------|----------|
| No P-labels | tier 4, priority_label null, override_label null |
| Multiple P-labels | min tier wins; priority_label = label that gave min tier |
| P-label + top-tier override | override check runs first; priority_label null, override_label set |
| priority_top_tier_labels not array | safeReadLabels checks Array.isArray; returns [] |
| Config file missing (ENOENT) | safeReadLabels catches → [] |
| Config file malformed JSON | safeReadLabels catches → [] |
| Offline path (labels: []) | All tier 4, sort by number — no regression |
| issueFetch.issues empty | Re-sort skipped (length check); ranking [] |
| opts is undefined (bootstrap callers) | topTierLabels = []; all tier 4; behavior unchanged |

## Validation Commands

After each step:
```bash
node scripts/simulate-workflow-walkthrough.js
```
Must exit 0 with "Workflow walkthrough simulation passed".

After Step 7:
```bash
node scripts/validate-workflow-contracts.js
```
Must exit 0 with "Workflow contract validation passed".

## Explicit Out-of-Scope
- cmdBootstrap / listOpenIssues priority ranking
- Offline label inference from .roadmap/ files
- Per-tier override config (only top-tier at tier 0)
- Configurable priority regex or custom P-label names
- Reading priority from issue body or title
- Changes to classifier.js, sink-pr.js, roadmap.js
- Shared config module extraction
- Writing defaults to config files
