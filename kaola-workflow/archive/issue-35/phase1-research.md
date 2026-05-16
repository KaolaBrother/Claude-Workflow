# Phase 1 - Research / Discovery: issue-35

## Deliverable
Extend `sortIssueRecords()` in `scripts/kaola-workflow-claim.js` to rank open issues by P0/P1/P2/P3 priority labels (ascending) before falling back to issue-number ascending. Add optional top-tier override label support via `~/.config/kaola-workflow/config.json`. Emit a `ranking` field in the startup receipt showing which priority tier each candidate was assigned.

## Why
The startup classifier picks the next work item by ascending issue number, ignoring P0/P1/P2/P3 priority labels. This causes low-priority issues (P3) to be selected over high-priority work (P0/P1/P2), requiring human intervention on every `/workflow-next` invocation and defeating the autonomous-loop goal stated in the router docs.

## Affected Area
- `scripts/kaola-workflow-claim.js` — `sortIssueRecords()` at line 921 (primary fix)
- `scripts/kaola-workflow-claim.js` — `cmdStartup()` at line 1172 (startup receipt emission)
- `~/.config/kaola-workflow/config.json` — top-tier label config field (new key)
- `scripts/simulate-workflow-walkthrough.js` — new Epic Case for priority label ordering
- `scripts/validate-workflow-contracts.js` — new contract assertion for `sortIssueRecords`

## Key Patterns Found
1. `sortIssueRecords()` at `claim.js:921-928` — sole ranking comparator; currently only weights `workflow:queued` (rank 0) vs all others (rank 1), then issue number ascending
2. `issueHasLabel(issue, labelName)` at `claim.js:917` — reusable label-presence helper that handles both string and object label formats
3. `parseDependsOn()` at `classifier.js:187` and `parseAreaLabels()` at `classifier.js:195` — naming/pattern convention for label parsing helpers: `camelCase`, pure functions, return typed values
4. `writeStartupReceipt()` at `claim.js:528-537` — receipt writer; `skipped` array already has `{ issue, verdict, reason }`; add `ranking` as parallel array of `{ issue, priority, tier }`
5. `readOrCreateConfig()` at `classifier.js:72-81` — existing global config read pattern; extend with `top_tier_labels: []` default

## Test Patterns
- Framework: hand-rolled `assert(condition, message)` — no external test framework
- Location: `scripts/simulate-workflow-walkthrough.js` (Epic Cases), `scripts/validate-workflow-contracts.js` (contract assertions)
- Structure: Epic Cases use temp git repos via `execFileSync`/`spawnSync`, assert on startup JSON output
- Existing startup tests: Epic Case 14 at simulate line 3111
- Existing classifier tests: Epic Case 6 (line 890) and Epic Case 12 (line 2753)
- New test needed: Epic Case for priority label ordering in startup (P0 picked over P3, top-tier label beats P-labels)

## Config & Env
- `~/.config/kaola-workflow/config.json` — global user config, created by `readOrCreateConfig()` if absent
- Current keys: `parallel_mode: "auto"` — add `top_tier_labels: []` and `priority_label_regex: "^P([0-9]+)$"` (configurable)
- No project-level config file exists today; suggestion from issue to use `kaola-workflow/config.json` at project level is a scope extension — Phase 2 will decide on project-level vs user-level only

## External Docs
None — fix is purely internal to `scripts/kaola-workflow-claim.js`.

## GitHub Issue
KaolaBrother/Kaola-Workflow#35

## Completeness Score
10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | fix is internal; label data structure known from code-explorer |

## Notes / Future Considerations
- **Offline path gap**: `readLocalRoadmapIssueRecords()` (claim.js:930-948) hardcodes `labels: []` — offline startup will still ignore priority. Phase 2 should decide whether to parse the flat `labels: P0, P1, bug` string from `.roadmap/issue-N.md` files as part of this fix or defer it.
- **Project-level config**: The issue suggests `kaola-workflow/config.json` for top-tier labels. No project-level config exists today. Using the global `~/.config/kaola-workflow/config.json` is the lower-risk path; a project-level override layer is a scope extension.
- **Second iteration path**: `runBootstrapClassify` → `pickFirstActionableIssue` (claim.js:1059) also feeds from `sortIssueRecords`. Fix here automatically covers both paths.
- **Startup receipt `ranking` field**: Issue asks to emit "picked #160 because top_tier=Engine Showcase Gap; deferred #4 P3, …". The existing `skipped` array can carry per-issue priority tier; a separate `ranking` field or enriched `skipped` entries are both viable.
