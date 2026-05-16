# Phase 3 - Plan: issue-35

## Blueprint

### Files to Create
None.

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `scripts/kaola-workflow-claim.js` | Add `PRIORITY_TIER_BY_LABEL` constant; add `readPriorityConfig()` and `parsePriorityTier()` helpers; extend `sortIssueRecords(issues, opts)`; wire config + ranking in `cmdStartup` | Core priority-ranking implementation |
| `scripts/simulate-workflow-walkthrough.js` | Add Epic Cases 14a and 14b after Epic Case 14 | Integration test coverage for P-label ranking and top-tier override |
| `scripts/validate-workflow-contracts.js` | Add 6 `assertIncludes` assertions | Contract enforcement for new symbols |
| `CHANGELOG.md` | Add entry under `[Unreleased]` | Document new feature |
| `README.md` | Add priority sort order + `priority_top_tier_labels` config note | User-facing documentation |

### Build Sequence
1. Add `PRIORITY_TIER_BY_LABEL` constant to claim.js (no deps)
2. Add `parsePriorityTier(issue, topTierLabels)` helper (depends on Step 1, uses `issueLabelNames`)
3. Add `readPriorityConfig(root)` helper (depends on `os`, `fs`, `path` — already imported)
4. Extend `sortIssueRecords(issues, opts)` to add priority tier sort key (depends on Steps 1-3)
5. Wire `topTierLabels` and `ranking` into `cmdStartup` — 5 sub-changes (depends on Steps 1-4)
6. Add Epic Cases 14a and 14b to simulate-workflow-walkthrough.js (depends on Steps 1-5; requires HOME isolation verification)
7. Add 6 `assertIncludes` to validate-workflow-contracts.js (depends on Step 6)
8. Update CHANGELOG.md and README.md (no code deps)

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | Steps 1-5 | All in claim.js, sequential by dependency |
| B | Steps 6-7 | Test files; must run after A (need running code to validate) |
| C | Step 8 | Docs only; fully independent |

Steps 1-5 must be sequential (each depends on the prior). Steps 6-7 should be done after A. Step 8 is independent and can be parallelized with A.

### External Dependencies
- `os`, `fs`, `path` — already imported in claim.js
- No new npm packages

## Task List

### Task 1: PRIORITY_TIER_BY_LABEL constant
- File: `scripts/kaola-workflow-claim.js`
- Write Set: `scripts/kaola-workflow-claim.js`
- Depends On: none
- Parallel Group: serial (first)
- Action: MODIFY
- Implement: Insert `const PRIORITY_TIER_BY_LABEL = { P0: 0, P1: 1, P2: 2, P3: 3 };` after line 11 (`const RECENT_CLAUDE_SESSION_MS = ...`)
- Mirror: Other top-of-file constants pattern in claim.js
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task 2: parsePriorityTier helper
- File: `scripts/kaola-workflow-claim.js`
- Write Set: `scripts/kaola-workflow-claim.js`
- Depends On: Task 1
- Parallel Group: serial
- Action: MODIFY
- Implement: Insert before `sortIssueRecords`. Pure function: check `topTierLabels` first (→ `{ tier: 0, priority_label: null, override_label: label }`), then scan for P-labels taking minimum tier (→ `{ tier, priority_label, override_label: null }`), else `{ tier: 4, priority_label: null, override_label: null }`.
- Mirror: `issueHasLabel` / `issueLabelNames` call pattern
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task 3: readPriorityConfig helper
- File: `scripts/kaola-workflow-claim.js`
- Write Set: `scripts/kaola-workflow-claim.js`
- Depends On: none (imports already present)
- Parallel Group: serial (with Task 2)
- Action: MODIFY
- Implement: Insert before `parsePriorityTier`. Read global `~/.config/kaola-workflow/config.json` then project-local `<root>/kaola-workflow/config.json`. Inner `safeReadLabels(path)`: JSON.parse + `Array.isArray` check + `.filter(x => typeof x === 'string' && x.length > 0)`, catch all → `[]`. Return `[...global, ...local]`. No writes on ENOENT.
- Mirror: `readOrCreateConfig()` at classifier.js:72 for the read pattern (but NO mkdirSync/writeFileSync)
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task 4: Extend sortIssueRecords(issues, opts)
- File: `scripts/kaola-workflow-claim.js`
- Write Set: `scripts/kaola-workflow-claim.js`
- Depends On: Tasks 1-3
- Parallel Group: serial
- Action: MODIFY
- Implement: Change signature to `function sortIssueRecords(issues, opts)`. Add `const topTierLabels = (opts && Array.isArray(opts.topTierLabels)) ? opts.topTierLabels : [];`. Add priority tier as sort key 2 between queued (key 1) and issue number (key 3): `parsePriorityTier(a, topTierLabels).tier`. Callers with no opts get `topTierLabels = []` → all tier 4 → unchanged behavior.
- Mirror: Existing sort pattern at claim.js:921-928
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task 5: Wire topTierLabels and ranking into cmdStartup
- File: `scripts/kaola-workflow-claim.js`
- Write Set: `scripts/kaola-workflow-claim.js`
- Depends On: Tasks 1-4
- Parallel Group: serial
- Action: MODIFY
- Implement (5 sub-changes):
  - 5a. After `const root = getRoot();`: add `const topTierLabels = readPriorityConfig(root);`
  - 5b. After `const issueFetch = fetchOpenIssueRecords(root);`: add `if (issueFetch.issues.length > 0) { issueFetch.issues = sortIssueRecords(issueFetch.issues, { topTierLabels }); }`
  - 5c. After 5b: build `const ranking = issueFetch.issues.map(function(issue) { const t = parsePriorityTier(issue, topTierLabels); return { issue: Number(issue.number), tier: t.tier, priority_label: t.priority_label, override_label: t.override_label }; });`
  - 5d-5e. Add `ranking: ranking` to all three `writeStartupReceipt` calls (owned ~1198, no-pick ~1218, picked ~1238). Append to existing data object only.
- **Advisor verifications required before declaring Task 5 complete**:
  - V1: Read Epic Case 14 (lines ~3111-3234 in simulate-workflow-walkthrough.js) to confirm how it passes env to child process; mirror that pattern PLUS explicit `HOME=<tmpDir>` for Cases 14a/14b
  - V2: Confirm that `cmdStartup` reads `issueFetch.issues` (not a pre-captured `const issues = ...`) at the call site that feeds `runStartupClaimFirstAvailable`. Verify picked-case path also reads from the post-sort array.
- Mirror: Other `writeStartupReceipt` call sites in cmdStartup
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task 6: Epic Cases 14a and 14b
- File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/simulate-workflow-walkthrough.js`
- Depends On: Tasks 1-5
- Parallel Group: serial (after A)
- Action: MODIFY
- Implement:
  - **14a** — 4 issues (301:P3, 302:P2, 303:P1, 304:P0), HOME=tmpDir (no real config read), run startup with `sess-14a`; assert `first14a.issue === 304`, `first14a.ranking.length === 4`, tier/priority_label/override_label correct for issues 304 and 301
  - **14b** — 2 issues (401:hotfix label, 402:P0), write `<tmp>/kaola-workflow/config.json: { "priority_top_tier_labels": ["hotfix"] }`, HOME=tmpDir, run startup with `sess-14b`; assert `first14b.issue === 401`, `r401.override_label === 'hotfix'`, `r401.priority_label === null`
  - Use same HOME isolation pattern as Epic Case 14
- Mirror: Epic Case 14 block in simulate-workflow-walkthrough.js (lines ~3111-3234)
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task 7: Contract assertions
- File: `scripts/validate-workflow-contracts.js`
- Write Set: `scripts/validate-workflow-contracts.js`
- Depends On: Task 6
- Parallel Group: serial (after B)
- Action: MODIFY
- Implement: Append before final `console.log(...)`:
  ```js
  assertIncludes('scripts/kaola-workflow-claim.js', 'PRIORITY_TIER_BY_LABEL');
  assertIncludes('scripts/kaola-workflow-claim.js', 'parsePriorityTier');
  assertIncludes('scripts/kaola-workflow-claim.js', 'readPriorityConfig');
  assertIncludes('scripts/kaola-workflow-claim.js', 'ranking');
  assertIncludes('scripts/simulate-workflow-walkthrough.js', 'Epic Case 14a');
  assertIncludes('scripts/simulate-workflow-walkthrough.js', 'Epic Case 14b');
  ```
- Mirror: Existing `assertIncludes` calls in validate-workflow-contracts.js
- Validate: `node scripts/validate-workflow-contracts.js`

### Task 8: Docs
- File: `CHANGELOG.md`, `README.md`
- Write Set: `CHANGELOG.md`, `README.md`
- Depends On: none (parallel with Tasks 1-7)
- Parallel Group: C (independent)
- Action: MODIFY
- Implement:
  - CHANGELOG.md under `[Unreleased]`:
    ```
    ### Added
    - `startup` now ranks open issues by P0/P1/P2/P3 GitHub labels before claiming (P0 highest).
      Startup receipt includes a `ranking` array listing tier, matched priority label, and any top-tier override label for every candidate issue.
    - Two-layer priority config: global `~/.config/kaola-workflow/config.json` and project-local
      `<repo>/kaola-workflow/config.json` may both supply `priority_top_tier_labels` arrays;
      union of both arrays forces any matching label to tier 0.
    ```
  - README.md: add subsection after startup command description with sort-order table and `priority_top_tier_labels` config example. Include note: "`workflow:queued` always wins, then priority tier, then issue number."
- Validate: `node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js`

## Advisor Notes
The advisor confirmed the blueprint is strong and implementable. Two concrete verifications Phase 4 must perform before declaring complete:

1. **HOME isolation (Epic Cases 14a/14b)**: Read Epic Case 14 to see exactly how it passes env to spawned child processes. Mirror that pattern PLUS explicit `HOME=<tmpDir>` for 14a/14b so real `~/.config/kaola-workflow/config.json` is never read.

2. **Re-sort placement**: Verify `cmdStartup` reads `issueFetch.issues` (not a pre-captured `const issues = ...`) at the call site feeding the claim loop. The picked-case path (~line 1238) must also read from the post-sort array.

Edge case to document: `workflow:queued` is still the primary sort key — a queued P3 outranks an unqueued P0. Include one sentence in README clarifying this.

Non-blocking: Double sort (fetchOpenIssueRecords already sorts at line 964, cmdStartup re-sorts with opts) is harmless waste; acceptable for now.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | — | Advisor approved on first pass with no gaps requiring revision |
