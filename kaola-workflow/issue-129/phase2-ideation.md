# Phase 2 - Ideation: issue-129

## Approaches Evaluated

### Option A: Convert shims to Node.js (`#!/usr/bin/env node`)
- Summary: Replace `#!/bin/sh` + shell `case` with `#!/usr/bin/env node` + `if/else if/else` using `process.argv.slice(2).join(' ')` and `process.stdout.write(...)`.
- Pros: Eliminates shell execution entirely; self-proving; single-file change; no production code changes.
- Cons: Requires Node-on-PATH precondition (mitigated by PATH fix as Task 0).
- Risk: Low
- Complexity: Small

### Option B: Add timeout to spawnSync calls
- Summary: Add `timeout: 10000` to each spawnSync that execs shims.
- Pros: Minimal change.
- Cons: Partial mitigation only; tests still hang until timeout; doesn't fix root cause; flaky on slow CI.
- Risk: Medium
- Complexity: Small (but wrong)

### Option C: Explicit shell interpreter invocation
- Summary: Invoke shims as `/bin/sh shim args` instead of direct exec.
- Pros: Avoids macOS shebang hang.
- Cons: Requires changes to claim.js and classifier.js (production code).
- Risk: High
- Complexity: Large

## Advisor Findings

Advisor confirmed Option A. Critical gotcha identified: `node` is NOT on `process.env.PATH` in the child processes (confirmed by precondition check: `node dir: /opt/homebrew/Cellar/node/25.5.0/bin` — not on PATH). Mitigation: prepend `path.dirname(process.execPath) + path.delimiter` to the PATH construction in 4 locations (`runClaimOnline`, `runClaimOnlineLastJson`, and 2 inline spawnSync calls at lines 354-357 and 494-498). This PATH fix is Task 0 — required before any shim conversion works. Conversion invariants: use `if/else if/else` chain (first-match semantics), keep `chmodSync(0o755)`.

See `.cache/advisor-ideation.md` for full findings.

## Selected Approach

**Option A: Convert all 7 `gh` shell shims to Node.js `#!/usr/bin/env node` scripts.**

Required pre-step (Task 0): Prepend `path.dirname(process.execPath)` to PATH in 4 spawnSync call sites so that `#!/usr/bin/env node` shim discovery works.

Rationale: Eliminates the macOS hang at root cause. Single-file change. Self-proving test. No production code touched. PATH fix is a mechanical one-liner applied to 4 locations.

## Out of Scope (explicit)
- `scripts/kaola-workflow-claim.js` — no changes
- `scripts/kaola-workflow-classifier.js` — no changes
- `scripts/simulate-gitlab-workflow-walkthrough.js` — no shims, not affected
- `scripts/simulate-gitea-workflow-walkthrough.js` — no shims, not affected
- Timeout additions to spawnSync calls
- New files

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
