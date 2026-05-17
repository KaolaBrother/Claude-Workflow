# Advisor Plan Cache — issue-39

## Verdict: ENDORSE — with one blocker corrected

Proceed to `phase3-plan.md`. All three source fixes (1A/2A/3A) are correct. Case 6J test design has a race that must be corrected in the plan before Phase 4 starts.

## Bug Fixes: Correct as Designed

Bug 2 (2A), Bug 1 (1A), Bug 3 (3A) source changes are surgically correct. Build order (A→B→C) is sound.

## Case 6J Blocker — Race in Spawn Pattern (FIXED in plan)

### Problem
The architect's spawn `nohup ... & disown; echo $!` via `sh -c` races:
- Ticker's `walkToClaudePid()` is called at line 1895
- Until the `sh` parent exits, the ancestor chain is `sh → test_process → ... → Claude`
- If ticker reaches line 1895 before sh exits, walkToClaudePid finds Claude → orphan path never fires
- **Test passes on CI (no Claude ancestor), fails when run inside a Claude session** — the development workflow

### Fix Applied (in phase3-plan.md)
1. Use `(cmd &)` subshell: `sh -c '(nohup node ticker ... 2>/tmp/ticker-stderr-$$ &)'` — subshell exits immediately after fork, narrowing the race window
2. Redirect stderr to captured temp file, NOT `/dev/null`
3. Assert `'no Claude ancestor at startup'` in captured stderr — proves orphan path fired (not just any exit)

## Phase 4 Implementer Checks (verify, don't rewrite)

1. **`KAOLA_KERNEL_SESSION_SKIP=1` NOT needed**: `enforcePlatformSessionOrExit` at line 1890 (cmdTicker) returns immediately when `KAOLA_ENFORCE_PLATFORM_SESSION !== '1'` (line 256) — it's a no-op by default. Remove from test env.

2. **Reasoning string confirmed**: `hasExactOverlap` returns `'exact file path overlap at "' + exactOverlapPath + '" with a claimed project'` (line 342). Case 6H assertion `r6H.reasoning.includes('exact file path')` is correct.

3. **New AREA_PATH_REGEX is greedier**: `/[A-Za-z0-9_-]+\/(?=$|[^A-Za-z0-9_./-])/g` matches any bare `word/` token. Run full 6A–6F suite after implementation to confirm no regressions from phrases like `npm install/` or `read/write`.

4. **Plugin parity diffs**: Must be explicit in every task's validate step. Both diffs must produce zero output:
   ```
   diff scripts/kaola-workflow-classifier.js plugins/kaola-workflow/scripts/kaola-workflow-classifier.js
   diff scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js
   ```
   Test file `simulate-workflow-walkthrough.js` → `simulate-kaola-workflow-walkthrough.js` is semantic mirror only (different filename, no byte-diff expected).

5. **cmdTicker ordering confirmed**: `acquirePidFile` at line 1889 writes the PID file first. The orphan check (inserted after line 1895) correctly unlinks it. PID file exists before the orphan check runs.
