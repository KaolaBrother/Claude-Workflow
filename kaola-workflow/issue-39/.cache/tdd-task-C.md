# TDD Task C — Bug 3: Orphaned Ticker Self-Termination + Test 6J

## Result: GREEN

## Change to scripts/kaola-workflow-claim.js (cmdTicker, ~line 1895)

Insert after `tickCtx.claudePid = walkToClaudePid();`, before `runTick(tickCtx);`:
```js
if (tickCtx.claudePid === null) {
  process.stderr.write('ticker: no Claude ancestor at startup; orphaned, exiting\n');
  try { fs.unlinkSync(pidPath); } catch (_) {}
  return;
}
```

## Test Case 6J Added

File: `scripts/simulate-workflow-walkthrough.js`
Inserted after Case 6I, inside Epic 6's outer try block.
Uses `(cmd &)` subshell pattern + stderr captured to file.
Asserts: PID file gone within 1500ms AND stderr contains 'no Claude ancestor at startup'.

Semantic mirror added to `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`.

## RED evidence
Before fix: `Error: Epic Case 6J: ticker stderr must contain "no Claude ancestor at startup", got: `
(PID file assertion already passed — runTick exits early when no lock exists — but stderr proved the orphan path had not fired)

## GREEN evidence
`node scripts/simulate-workflow-walkthrough.js` → exit 0
"Workflow walkthrough simulation passed"
All 6A–6J pass. No regressions.

## Plugin Mirror
`diff scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js` → zero output

## Deviations
- Used `path.join(root, 'scripts', 'kaola-workflow-claim.js')` instead of `__dirname` — idiomatic to this test file, resolves identically.
- Coord root confirmed: getCoordRoot() uses process.cwd() fallback → matches `path.join(epic6JTmp, '.git')`.
