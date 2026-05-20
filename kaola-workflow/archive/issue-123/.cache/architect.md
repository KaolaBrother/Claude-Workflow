# Architect — issue-123

## Source
Transcribed from planner.md (advisor confirmed planner output IS the blueprint; no re-invocation needed).

## Files to Create
| File | Purpose | Key Interfaces |
|------|---------|----------------|
| plugins/kaola-workflow-gitea/scripts/simulate-gitea-codex-workflow-walkthrough.js | Thin execFileSync wrapper that runs the three Gitea Codex subscripts in sequence | execFileSync, path.resolve(__dirname,'..','..','..') for root |

## Files to Modify
| File | Changes | Why |
|------|---------|-----|
| plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js | Add 'simulate-gitea-codex-workflow-walkthrough.js' to scriptFiles array after 'simulate-gitea-workflow-walkthrough.js' (single Edit covering trailing comma + new entry) | Contract validator must assert the new script exists |
| package.json | Append `&& node plugins/kaola-workflow-gitea/scripts/simulate-gitea-codex-workflow-walkthrough.js` to test:kaola-workflow:gitea | Include sim in CI test chain |

## Build Sequence
1. CREATE simulate-gitea-codex-workflow-walkthrough.js — no deps, standalone
2. MODIFY validate-kaola-workflow-gitea-contracts.js — depends on new file existing (contract check)
3. MODIFY package.json — depends on new file existing (npm test chain)

Steps 2 and 3 are independent after step 1.

## Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | 1 (create sim) | no deps |
| B | 2, 3 (contracts + package.json) | disjoint files, both depend on Group A |

## External Dependencies
None. Uses Node.js built-ins: child_process.execFileSync, path.resolve.

## Subscripts to run (in order)
1. validate-kaola-workflow-gitea-contracts.js
2. test-gitea-workflow-scripts.js
3. test-gitea-sinks.js

## Success message
'Gitea Codex workflow walkthrough simulation passed'
