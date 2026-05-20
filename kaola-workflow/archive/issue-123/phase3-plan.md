# Phase 3 - Plan: issue-123

## Blueprint

### Files to Create
| File | Purpose | Key Interfaces |
|------|---------|----------------|
| plugins/kaola-workflow-gitea/scripts/simulate-gitea-codex-workflow-walkthrough.js | Thin execFileSync wrapper running three Gitea Codex subscripts | execFileSync, path.resolve(__dirname,'..','..','..') |

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js | Add 'simulate-gitea-codex-workflow-walkthrough.js' to scriptFiles array (single Edit, trailing-comma-aware) | Contract validator asserts each listed script exists |
| package.json | Append sim to test:kaola-workflow:gitea chain | Include in CI |

### Build Sequence
1. CREATE simulate-gitea-codex-workflow-walkthrough.js (no deps)
2. MODIFY validate-kaola-workflow-gitea-contracts.js (depends on 1)
3. MODIFY package.json (depends on 1; parallel-safe with 2)

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | Task 1 | no deps |
| B | Tasks 2, 3 | disjoint files |

### External Dependencies
None. Node.js built-ins only.

## Task List

### Task 1: Create simulate-gitea-codex-workflow-walkthrough.js
- File: plugins/kaola-workflow-gitea/scripts/simulate-gitea-codex-workflow-walkthrough.js
- Test File: N/A (sim IS the integration test)
- Write Set: plugins/kaola-workflow-gitea/scripts/simulate-gitea-codex-workflow-walkthrough.js
- Depends On: none
- Parallel Group: A
- Action: CREATE
- Implement: ~22-line thin wrapper. `'use strict'`. `const { execFileSync } = require('child_process'); const path = require('path');`. `const root = path.resolve(__dirname, '..', '..', '..');`. `function run(script) { execFileSync(process.execPath, [path.join(root, 'plugins/kaola-workflow-gitea/scripts', script)], { cwd: root, encoding: 'utf8', stdio: 'pipe' }); }`. Call run() for each of the three subscripts. `console.log('Gitea Codex workflow walkthrough simulation passed');`
- Mirror: plugins/kaola-workflow-gitlab/scripts/simulate-gitlab-codex-workflow-walkthrough.js (gitlab→gitea substitutions)
- Subscripts: validate-kaola-workflow-gitea-contracts.js, test-gitea-workflow-scripts.js, test-gitea-sinks.js
- Validate: `node plugins/kaola-workflow-gitea/scripts/simulate-gitea-codex-workflow-walkthrough.js`

### Task 2: Add sim to validate-kaola-workflow-gitea-contracts.js scriptFiles
- File: plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js
- Write Set: plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js
- Depends On: Task 1
- Parallel Group: B
- Action: MODIFY
- Implement: In the scriptFiles array (lines ~120-131), the current last entry 'simulate-gitea-workflow-walkthrough.js' has no trailing comma. Single Edit: old_string matches the no-comma line, new_string adds the comma AND the new entry 'simulate-gitea-codex-workflow-walkthrough.js' on the next line.
- Mirror: Same array pattern in validate-kaola-workflow-gitlab-contracts.js
- Validate: `node plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js`

### Task 3: Extend test:kaola-workflow:gitea in package.json
- File: package.json
- Write Set: package.json
- Depends On: Task 1
- Parallel Group: B
- Action: MODIFY
- Implement: Append `&& node plugins/kaola-workflow-gitea/scripts/simulate-gitea-codex-workflow-walkthrough.js` to the end of the test:kaola-workflow:gitea value (line ~39)
- Validate: `npm run test:kaola-workflow:gitea`

## Advisor Notes
Blueprint is dependency-safe and complete. Trailing-comma handling is the critical implementation detail — use one Edit that covers both lines together. No architect revision needed. Verify order: standalone sim → full gitea chain → global walkthrough.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | Transcribed from planner per advisor-ideation.md |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | — | Advisor confirmed no gaps; planner output is complete blueprint |
