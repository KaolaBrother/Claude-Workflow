# Phase 2 - Ideation: issue-124

## Approaches Evaluated

### Option A: Inline `&&` chain + structural guard on `scripts.test` (Selected)
- Summary: Append gitlab and gitea to the `test` npm script chain; replace the weak string-presence guard at `validate-kaola-workflow-contracts.js:242` with a `parseJson` loop that asserts `pkg.scripts.test` chains all four editions
- Pros: Matches existing `&&`-chain convention exactly; guard checks the actual `test` value so it fails if any edition is removed from the chain; no new files or abstractions
- Cons: `test` line becomes longer (four chained invocations)
- Risk: Low — both parity suites verified green; no CI redundancy conflicts
- Complexity: Small (2-3 files, ~6 lines of change)

### Option B: `test:kaola-workflow:all` intermediate alias
- Summary: Add a new alias script that `test` delegates to
- Pros: Shorter `test` line; named "run everything" target
- Cons: No `test:all` precedent in codebase; two-hop guard logic; can drift from `test`
- Risk: Medium
- Complexity: Low-Medium (rejected)

### Option C: Node orchestrator script
- Summary: `scripts/run-all-tests.js` invoked by `test`
- Pros: Centralized sequencing, per-edition reporting
- Cons: Over-engineering; moves source of truth out of package.json; adds a file to maintain
- Risk: Medium
- Complexity: Medium-High (rejected)

## Advisor Findings
Both parity suites (`test:kaola-workflow:gitlab`, `test:kaola-workflow:gitea`) verified green on this checkout. No `.github/workflows/` found — no CI redundancy. Advisor confirmed Approach A and specified: replace line 242 (don't augment); add guard only in `validate-kaola-workflow-contracts.js` (runs in the codex path); the structural loop covers codex too.

## Selected Approach
**Approach A — inline `&&` chain + structural `parseJson` loop guard**

Rationale: fulfills both halves of the goal (run everything by default, prevent silent drops) with the least machinery. Idiomatic with the existing `&&`-chain convention. Guard is structurally honest — it checks `scripts.test` content, not mere file presence.

## Touch List
1. `package.json:35` — extend `test` chain: `&& npm run test:kaola-workflow:gitlab && npm run test:kaola-workflow:gitea`
2. `scripts/validate-kaola-workflow-contracts.js:242` — replace `assertIncludes('package.json', 'test:kaola-workflow:codex')` with `parseJson`-based loop asserting `pkg.scripts.test` chains all four editions
3. `docs/agents-source.md:37-41` — simplify the manual `npm run test:kaola-workflow:gitlab` step to `npm test` (and note gitea was never listed there)
4. `CHANGELOG.md` — add `[Unreleased]` entry

## Out of Scope (explicit)
- No new npm dependencies
- No `test:all` parallel entry point
- No refactoring of existing `test:kaola-workflow:*` scripts
- No deduplication of `validate-vendored-agents.js` triple invocations
- No README release checklist change (already shows `npm test`)
- No CI workflow changes (no workflows found)

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
