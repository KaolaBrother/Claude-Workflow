# Phase 1 - Research / Discovery: claim-hardening

## Deliverable
Five targeted hardening fixes to `scripts/kaola-workflow-claim.js`:
- M1: Ensure `issue_number`/`claimed_at` are refreshed on re-claim when `## Sink` already exists in workflow-state.md
- M2: Emit a stderr warning in `updateLeaseInPlace` when `## Lease` section is absent (currently silently no-ops)
- S-L1: Set file mode `0o600` on lock and session file creation (currently world-readable 0644)
- S-L2: Validate `claim_comment_id` as a positive integer before writing to workflow-state.md
- INFO: Add `isSafeName` guard in `cmdStatus` before `readSessionFile(root, lock.session_id)` path join

## Why
These items close MEDIUM/LOW/INFO findings from the multi-session-substrate (issue #3) Phase 5 review. They improve security posture (file permissions, input validation) and observability (surfacing silent drift), making the multi-session substrate more robust for concurrent and cross-machine use.

## Affected Area
`scripts/kaola-workflow-claim.js` — all 5 items. Test changes go in `scripts/simulate-workflow-walkthrough.js`. Contract assertions may need minor updates in `scripts/validate-workflow-contracts.js`.

## Key Patterns Found

### M1 — Re-claim Sink block refresh
1. `buildSinkBlock(lockData)` at claim.js:97–111 — always uses fresh `finalLock.issue_number` and `finalLock.claimed_at`
2. `updateSinkLease` re-claim path at claim.js:132–137 — regex `/\n## Sink[\s\S]*?(?=\n## [^SL]|\n## L|$)/` replaces Sink block; may have edge cases when Sink is at EOF without trailing newline or when `\n## L` lookahead interacts with `\n## Last Updated`
3. **Note:** M1's original root cause (no refresh logic at all) may have been addressed by pr-sink's addition of `buildSinkBlock`. Phase 2 must confirm whether a residual edge case remains or whether M1 is fully addressed, and whether any test coverage gap exists for the re-claim path.

### M2 — Silent no-op in `updateLeaseInPlace`
4. `updateLeaseInPlace` at claim.js:140–150 — line 143 `if (!/^## Lease\s*$/m.test(content)) return;` silently returns; called from cmdHeartbeat (line 293) and cmdWatchPr (line 446)
5. Stderr warning pattern: `process.stderr.write('msg\n')` used at lines 243 and 420 for non-fatal warnings

### S-L1 — File permission fixes
6. `fs.openSync(lp, 'wx')` at claim.js:153 — no mode arg; needs `0o600` as third param
7. `fs.writeFileSync(sessionPath(...), ..., )` at claim.js:171 — no `{ mode: 0o600 }`
8. `fs.writeFileSync(lp, ..., )` at claim.js:231 — lock re-write after commentId; no `{ mode: 0o600 }`

### S-L2 — `claim_comment_id` validation
9. Written at claim.js:123–124 as `(lockData.claim_comment_id || 'N/A')` — no validation
10. Existing `^\d+$` guard pattern at claim.js:386 (`cmdPatchBranch`) — apply same pattern before write

### INFO — `cmdStatus` isSafeName
11. `isSafeName` at claim.js:12–16 — rejects `/`, `\`, `\0`, `.`, `..`
12. Guards in cmdRelease (247–248) and cmdHeartbeat (280–281): `assert(isSafeName(match.session_id), ...)`
13. Unguarded call at claim.js:330: `readSessionFile(root, lock.session_id)` → `path.join(sessionsDir(root), sessionId + '.json')` with untrusted `session_id`

## Test Patterns
- Framework: Hand-rolled `assert(condition, message)` in simulate-workflow-walkthrough.js (lines 10–14)
- Location: `scripts/simulate-workflow-walkthrough.js`, Epic Case 1 (lines ~329–408) covers cmdClaim, cmdHeartbeat, cmdStatus, cmdSweep, cmdRelease
- Structure: `mkdtempSync` temp dir per Epic Case; `execFileSync(process.execPath, [scriptPath, ...args], { env })` subprocess invocations; inline file-content assertions via `JSON.parse(fs.readFileSync(...))`
- Environment isolation: `KAOLA_WORKFLOW_OFFLINE: '1'` + custom `HOME` in env

## Config & Env
- `KAOLA_WORKFLOW_OFFLINE=1` — disables all `gh` calls and external I/O
- No new env vars needed for these fixes

## External Docs
docs-lookup: N/A — internal patterns sufficient. All fixes use Node.js `fs` module standard `mode` option (available since Node.js v12+) and existing claim.js validation patterns.

## GitHub Issue
KaolaBrother/Kaola-Workflow#10

## Completeness Score
10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | N/A — all fixes are Node.js stdlib and internal patterns | no external API/framework behavior needed |

## Notes / Future Considerations
- M1 re-claim path: pr-sink may have already fixed the root cause. Phase 2 must decide: (a) verify the current regex is correct and add test coverage only, or (b) simplify the regex to eliminate the edge case. Do not invent a bug if the code is correct.
- S-L1: `getMachineId` at lines 43–45 also writes `~/.config/kaola-workflow/machine-id` at 0644. That's a config file (not a lock/session), low-sensitivity; defer or treat as separate follow-up per scope decision in Phase 2.
- Simulate-walkthrough.js is at 1061 lines (MEDIUM follow-up from pr-sink). New tests for this hardening pass should not push it significantly over 1100 lines; if they do, flag for extraction.
