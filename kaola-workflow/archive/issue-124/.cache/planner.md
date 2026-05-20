# Planner Output — Issue #124

## Recommendation: Approach A — Inline `&&` chain + structural guard on `scripts.test`

### Option A (Recommended)
- **Change**: Append `&& npm run test:kaola-workflow:gitlab && npm run test:kaola-workflow:gitea` to the `test` script in `package.json`
- **Guard**: Replace weak `assertIncludes` at line 242 with a `parseJson` + loop over all 4 editions asserting `pkg.scripts.test` chains each `npm run test:kaola-workflow:<edition>`
- **Pros**: Matches existing `&&`-chain convention; guard checks actual `test` value, not just string presence; no new files or abstractions
- **Cons**: `test` line gets long (four chained invocations)
- **Risk**: Low
- **Complexity**: Small (2 files, ~6 lines)

### Option B — `test:kaola-workflow:all` alias
- Adds indirection with no precedent; two-hop guard; medium complexity; rejected

### Option C — Node orchestrator script
- Over-engineering; moves source of truth out of package.json; rejected

## Touch List
1. `package.json:35` — extend `test` chain with `&& npm run test:kaola-workflow:gitlab && npm run test:kaola-workflow:gitea`
2. `scripts/validate-kaola-workflow-contracts.js:242` — replace with `parseJson` + loop over 4 editions asserting `pkg.scripts.test` chains each edition
3. `docs/agents-source.md:37-41` — simplify manual `npm run test:kaola-workflow:gitlab` step to `npm test` (fix pre-existing gap: line 40 never listed gitea)
4. `CHANGELOG.md` — add `[Unreleased]` entry

## Missing Facts
1. Are the 4 gitlab/gitea simulation scripts currently green? (Files exist, not executed)
2. Is there a CI workflow invoking `:gitlab`/`:gitea` separately? (Quick grep needed)

## Items NOT to Build
- No new npm dependencies
- No `test:all` parallel entry point
- No refactoring of existing test scripts
- No deduplication of `validate-vendored-agents.js` triple invocation
- No README checklist change (it already says `npm test` which will be correct)
