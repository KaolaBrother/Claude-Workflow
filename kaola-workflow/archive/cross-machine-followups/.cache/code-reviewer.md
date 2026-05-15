# Code Review: cross-machine-followups

## HIGH

### SIGHUP handler conflicts with nohup daemon survivability

File: `scripts/kaola-workflow-claim.js` lines 527–528

All 12 shims launch the ticker with:
```sh
nohup node ... ticker --session "$KAOLA_SESSION_ID" >/dev/null 2>&1 &
disown
```

The `nohup` command sets SIGHUP disposition to `SIG_IGN` at the kernel level so the ticker survives SSH disconnects and terminal closes. The new line:
```js
process.on('SIGHUP', function() { try { fs.unlinkSync(pidPath); } catch (_) {} process.exit(0); });
```
calls libuv's `uv_signal_start` which issues `sigaction()` and overwrites the inherited `SIG_IGN`. This was confirmed empirically on macOS: a Node process launched under `nohup` that registers a SIGHUP handler exits on `kill -SIGHUP`, while one without the handler survives.

`disown` prevents the parent shell from forwarding SIGHUP, but does not protect against SIGHUP delivered by SSH, the terminal, or any process targeting the ticker directly.

Recommended fix: Drop the SIGHUP handler. SIGTERM and SIGINT are correct for clean shutdown. SIGHUP is traditionally a hang-up signal; the ticker's `nohup` launch specifically opts out of SIGHUP. Remove the handler and remove the matching SIGHUP sub-test in `simulate-workflow-walkthrough.js`.

## MEDIUM

### DRY violation — three identical signal cleanup bodies (lines 523–528)

```js
process.on('SIGTERM', function() { try { fs.unlinkSync(pidPath); } catch (_) {} process.exit(0); });
process.on('SIGINT',  function() { try { fs.unlinkSync(pidPath); } catch (_) {} process.exit(0); });
process.on('SIGHUP',  function() { try { fs.unlinkSync(pidPath); } catch (_) {} process.exit(0); });
```

Preferred after HIGH fix (only two handlers remain):
```js
function gracefulShutdown() { try { fs.unlinkSync(pidPath); } catch (_) {} process.exit(0); }
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT',  gracefulShutdown);
```

## LOW

### Stale comment in test 9B2

`simulate-workflow-walkthrough.js` comment says "Write lock file with a real issue_number" but code passes `null`. Comment misleads future maintainers.

### Test file size (pre-existing)

`simulate-workflow-walkthrough.js` was 1731 lines before this PR; now 1856 lines. Exceeds the 800-line project maximum. Pre-existing violation worsened. SIGINT and SIGHUP sub-tests are near-duplicate 36-line blocks that could be parameterized. Epic-9 block should eventually be extracted.

## Confirmed Correct

- L1 g-flag regex: correct defensive fix
- L2 `--` separator: correct
- MEDIUM-4 stderr logging: correct improvement
- LOW-1 tautology removal: correct
- LOW-fd return true: safe
- I1 Number.isFinite: correct
- Shim liveness check (12 files): correct and portable
- Test 9B2 async liveness: event listener registration timing is safe
- LOW-3 corpus-grep: reliable
