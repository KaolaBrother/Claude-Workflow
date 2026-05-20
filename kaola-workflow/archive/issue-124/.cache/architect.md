# Code Architect Output — Issue #124

## Files to Create
None.

## Files to Modify

| File | Change | Priority |
|------|--------|----------|
| `package.json` line 35 | Append `&& npm run test:kaola-workflow:gitlab && npm run test:kaola-workflow:gitea` | 1 |
| `scripts/validate-kaola-workflow-contracts.js` line 242 | Replace 1-line string guard with 3-line parseJson loop over 4 editions | 2 |
| `docs/agents-source.md` line 40 | Remove redundant `npm run test:kaola-workflow:gitlab` line from bash block | 3 |
| `CHANGELOG.md` | Add entry under `## [Unreleased] / ### Added` | 4 |

## Precise Changes

### package.json line 35
**Current:**
```
"test": "npm run test:kaola-workflow:claude && npm run test:kaola-workflow:codex",
```
**Replace with:**
```
"test": "npm run test:kaola-workflow:claude && npm run test:kaola-workflow:codex && npm run test:kaola-workflow:gitlab && npm run test:kaola-workflow:gitea",
```

### validate-kaola-workflow-contracts.js line 242
**Current:**
```js
assertIncludes('package.json', 'test:kaola-workflow:codex');
```
**Replace with:**
```js
const pkg = parseJson('package.json');
for (const edition of ['claude', 'codex', 'gitlab', 'gitea']) {
  assert(pkg.scripts.test.includes(`npm run test:kaola-workflow:${edition}`), `package.json scripts.test must chain test:kaola-workflow:${edition}`);
}
```

### docs/agents-source.md lines 36-41
**Remove the `npm run test:kaola-workflow:gitlab` line** from the bash block so only `node scripts/validate-vendored-agents.js` and `npm test` remain.

### CHANGELOG.md
**Add under `## [Unreleased] / ### Added`:**
```markdown
- **GitLab and Gitea parity tests included in `npm test`** (issue #124): `npm test` now chains all four forge editions (`claude`, `codex`, `gitlab`, `gitea`). The contract guard in `scripts/validate-kaola-workflow-contracts.js` is upgraded from a string-presence check to a structural `parseJson` loop that asserts each edition appears in `pkg.scripts.test`, preventing silent omission in future edits.
```

## Build Sequence
1. `package.json:35` — no dependencies; all subsequent steps read this value
2. `validate-kaola-workflow-contracts.js:242` — depends on step 1 (guard would fail if run before step 1)
3. `docs/agents-source.md:40` — depends on step 1 (safe to remove only once gitlab is in npm test)
4. `CHANGELOG.md` — no dependency; last by convention

## Task List

### Task 1 — Extend `npm test` chain
- Write set: `package.json` line 35
- Validation: `node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); ['claude','codex','gitlab','gitea'].forEach(e=>{if(!p.scripts.test.includes('npm run test:kaola-workflow:'+e))throw new Error('missing '+e)}); console.log('ok')"`

### Task 2 — Replace weak guard with structural loop
- Write set: `scripts/validate-kaola-workflow-contracts.js` line 242
- Validation: `node scripts/validate-kaola-workflow-contracts.js` (must exit 0)

### Task 3 — Remove redundant manual gitlab step from agents-source.md
- Write set: `docs/agents-source.md` line 40
- Validation: visual inspection that bash block contains only `node scripts/validate-vendored-agents.js` and `npm test`

### Task 4 — Add CHANGELOG entry
- Write set: `CHANGELOG.md` under `## [Unreleased] / ### Added`
- Validation: `head -20 CHANGELOG.md` confirms entry present

### Task 5 — Full suite validation
- Command: `npm test`
- Must exit 0 with all four forge walkthrough simulations passing

## Out-of-Scope
- No new npm dependencies
- No `test:all` alias
- No refactoring of existing `test:kaola-workflow:*` scripts
- No README.md changes
- No changes to `scripts/validate-workflow-contracts.js`
- No deduplication of `validate-vendored-agents.js` invocations
- No CI workflow additions
