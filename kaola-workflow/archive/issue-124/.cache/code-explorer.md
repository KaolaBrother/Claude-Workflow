# Code Explorer Output — Issue #124

## Entry Points

- `npm test` (line 35, `package.json`): runs only `test:kaola-workflow:claude` then `test:kaola-workflow:codex`
- `npm run test:kaola-workflow:gitlab` (line 38): GitLab parity suite, exists but not chained
- `npm run test:kaola-workflow:gitea` (line 39): Gitea parity suite, exists but not chained

## Exact package.json scripts section (lines 34–40)

```json
"scripts": {
  "test": "npm run test:kaola-workflow:claude && npm run test:kaola-workflow:codex",
  "test:kaola-workflow:claude": "node scripts/validate-script-sync.js && node scripts/validate-vendored-agents.js && bash -n install.sh uninstall.sh && node -e \"JSON.parse(require('fs').readFileSync('package.json', 'utf8'))\" && node scripts/validate-workflow-contracts.js && node scripts/simulate-workflow-walkthrough.js",
  "test:kaola-workflow:codex": "node scripts/validate-script-sync.js && node scripts/validate-kaola-workflow-contracts.js && node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js",
  "test:kaola-workflow:gitlab": "node scripts/validate-vendored-agents.js && node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js && node plugins/kaola-workflow-gitlab/scripts/simulate-gitlab-workflow-walkthrough.js && node plugins/kaola-workflow-gitlab/scripts/simulate-gitlab-codex-workflow-walkthrough.js",
  "test:kaola-workflow:gitea": "node scripts/validate-vendored-agents.js && node plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js && node plugins/kaola-workflow-gitea/scripts/simulate-gitea-workflow-walkthrough.js && node plugins/kaola-workflow-gitea/scripts/simulate-gitea-codex-workflow-walkthrough.js"
}
```

## Existing Contract Assertion (validate-kaola-workflow-contracts.js line 242)

```js
assertIncludes('package.json', 'test:kaola-workflow:codex');
```

This is the exact pattern to extend with gitlab and gitea assertions.

## Key Files

| File | Role |
|------|------|
| `package.json` lines 34-40 | Test script definitions; primary fix target |
| `scripts/validate-kaola-workflow-contracts.js` line 242 | Existing codex guard; add gitlab+gitea assertions here |
| `scripts/validate-workflow-contracts.js` lines 211-215 | Claude-path validator; secondary candidate |
| `README.md` lines 381-388 | Release checklist (only `npm test`; no change needed if we extend `test`) |
| `docs/agents-source.md` line 40 | Lists `npm run test:kaola-workflow:gitlab` manually; may become redundant |
| `scripts/simulate-workflow-walkthrough.js` | 1447-line walkthrough; not the right home for package.json guards |

## README Release Checklist (lines 381-388)

```bash
npm test
git diff --check
git tag kaola-workflow-v<X.Y.Z>
git push origin main --tags
```

## Architecture Notes

- All validate scripts share `assert`/`assertIncludes`/`assertConcept` helpers — no shared module, each self-contained
- Plugin scripts in `plugins/kaola-workflow-gitlab/scripts/` and `plugins/kaola-workflow-gitea/scripts/` mirror root script structure
- `simulate-workflow-walkthrough.js` uses hand-rolled `assert` at line 17; its `main()` runs sequential named test functions (lines 1401-1441)
- Extending `npm test` directly is the simpler path (no `test:all` precedent in codebase)
