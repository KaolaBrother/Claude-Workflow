# Phase 3 - Plan: issue-124

## Blueprint

### Files to Create
None.

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `package.json` line 35 | Append `&& npm run test:kaola-workflow:gitlab && npm run test:kaola-workflow:gitea` to `test` script | Include all four forge editions in default `npm test` |
| `scripts/validate-kaola-workflow-contracts.js` line 242 | Replace `assertIncludes(...)` with `parseJson`-based loop over 4 editions asserting `pkg.scripts.test` chains each | Structural guard that fails if any edition is dropped from the chain |
| `docs/agents-source.md` line 40 | Remove `npm run test:kaola-workflow:gitlab` from manual step bash block | Prevents stale docs teaching readers `npm test` is incomplete |
| `CHANGELOG.md` | Add entry under `## [Unreleased] / ### Added` | Document user-visible change per project checklist |

### Build Sequence
1. `package.json:35` — no dependencies; this is the anchor all other steps read from
2. `validate-kaola-workflow-contracts.js:242` — depends on step 1 (guard would fail before the chain is extended)
3. `docs/agents-source.md:40` — depends on step 1 (manual step safe to remove only after gitlab is in npm test)
4. `CHANGELOG.md` — no dependency; last by convention

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| Serial | 1 → 2 → 3 → 4 | All steps are fast; step 2 logically depends on step 1 value |

### External Dependencies
None. All changes use only existing helpers (`parseJson`, `assert`) already present in `validate-kaola-workflow-contracts.js`.

## Task List

### Task 1: Extend `npm test` chain
- File: `package.json`
- Test File: none (contract guard in Task 2 validates this)
- Write Set: `package.json` line 35
- Depends On: none
- Parallel Group: serial
- Action: MODIFY
- Implement: Change line 35 from `"npm run test:kaola-workflow:claude && npm run test:kaola-workflow:codex"` to `"npm run test:kaola-workflow:claude && npm run test:kaola-workflow:codex && npm run test:kaola-workflow:gitlab && npm run test:kaola-workflow:gitea"`
- Mirror: existing `&&` chain convention at `package.json:35`
- Validate: `node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); ['claude','codex','gitlab','gitea'].forEach(e=>{if(!p.scripts.test.includes('npm run test:kaola-workflow:'+e))throw new Error('missing '+e)}); console.log('ok')"`

### Task 2: Replace weak guard with structural loop
- File: `scripts/validate-kaola-workflow-contracts.js`
- Test File: `scripts/validate-kaola-workflow-contracts.js` (self-validating when run)
- Write Set: `scripts/validate-kaola-workflow-contracts.js` line 242
- Depends On: Task 1
- Parallel Group: serial
- Action: MODIFY
- Implement: Replace `assertIncludes('package.json', 'test:kaola-workflow:codex');` (1 line) with:
  ```js
  const pkg = parseJson('package.json');
  for (const edition of ['claude', 'codex', 'gitlab', 'gitea']) {
    assert(pkg.scripts.test.includes(`npm run test:kaola-workflow:${edition}`), `package.json scripts.test must chain test:kaola-workflow:${edition}`);
  }
  ```
- Mirror: `parseJson` at line ~36, `assert` at line ~18, both module-scope
- Validate: `node scripts/validate-kaola-workflow-contracts.js` (must exit 0)

### Task 3: Remove redundant manual gitlab step from docs
- File: `docs/agents-source.md`
- Test File: none
- Write Set: `docs/agents-source.md` line 40
- Depends On: Task 1
- Parallel Group: serial
- Action: MODIFY
- Implement: Remove the `npm run test:kaola-workflow:gitlab` line from the bash block; leave `node scripts/validate-vendored-agents.js` and `npm test`
- Mirror: none (doc cleanup)
- Validate: verify bash block contains only `node scripts/validate-vendored-agents.js` and `npm test`

### Task 4: Add CHANGELOG entry
- File: `CHANGELOG.md`
- Test File: none
- Write Set: `CHANGELOG.md`
- Depends On: none (last by convention)
- Parallel Group: serial
- Action: MODIFY
- Implement: Before writing, run `head -20 CHANGELOG.md` to confirm `## [Unreleased]` and `### Added` exist; insert entry under `### Added`:
  ```
  - **GitLab and Gitea parity tests included in `npm test`** (issue #124): `npm test` now chains all four forge editions (`claude`, `codex`, `gitlab`, `gitea`). The contract guard in `scripts/validate-kaola-workflow-contracts.js` is upgraded from a string-presence check to a structural `parseJson` loop that asserts each edition appears in `pkg.scripts.test`, preventing silent omission in future edits.
  ```
- Mirror: existing CHANGELOG entry format
- Validate: `head -20 CHANGELOG.md` confirms entry present

### Task 5: Full suite validation
- File: none (validation only)
- Write Set: none
- Depends On: Tasks 1-4
- Action: VALIDATE
- Validate: `npm test` must exit 0 with all four forge walkthrough simulations passing

## Advisor Notes
Blueprint approved. Two Phase 4 watch-points: (1) verify CHANGELOG structure before writing; (2) confirm guard replacement is in module scope (self-catches via `node validate-kaola-workflow-contracts.js`). Do not deduplicate `validate-vendored-agents.js` triple invocations — out of scope.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | — | Blueprint approved on first pass; no gaps found |
