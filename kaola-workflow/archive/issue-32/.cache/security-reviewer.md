# Security Review — issue-32: fix isolation tree orchestration-layer gaps

No CRITICAL or HIGH issues found. Two MEDIUM findings, one LOW finding.
No hardcoded secrets, no SQL injection surface, no authentication bypass.

---

## Finding 1 — MEDIUM

**File:** `scripts/kaola-workflow-claim.js` (lines 580-584 and ~1815-1817)

**Unenforced `synthetic-` prefix invariant at arg boundary.**

`isSyntheticTestSession` sweeps any lock whose `session_id` starts with `synthetic-`, bypassing the staleness gates. The design comment says `crypto.randomUUID()` never produces this prefix. However, `validateClaimArgs` does not reject `--session synthetic-foo`. A developer who creates a real session with a `synthetic-` prefix (e.g., copying a test fixture command) will have that lease swept on the next sweep invocation, silently releasing an active project.

Recommendation: Add to `validateClaimArgs`:
```javascript
assert(
  !String(args.session).startsWith('synthetic-'),
  '--session must not start with "synthetic-" (reserved for test use)'
);
```

---

## Finding 2 — MEDIUM

**File:** `scripts/simulate-workflow-walkthrough.js` (lines 4390-4399)

**Unanchored `/^proj-ac/` regex in stray-dir cleanup may delete user directories collaterally.**

The cleanup loop deletes any `kaola-workflow/` subdirectory starting with `proj-ac`, including `proj-acme`, `proj-active-prod`, etc. The fix `cwd: tmp` (Gap 3-A) should already prevent new stray dirs, making this block redundant. If kept, tighten to `/^proj-ac\d+$/`.

---

## Finding 3 — LOW

**Files:** `commands/kaola-workflow-phase6.md` (~lines 544-551), `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` (~lines 160-167)

**`git status --porcelain` without `-z` doesn't handle C-quoted paths.**

`${line:3}` on a C-quoted git status line yields the quoted string, not the actual path. Files with spaces/special chars are silently skipped from the mirror. No injection risk, correctness only.

---

## Items Confirmed Clean

- Lock file write: `fs.openSync` with `wx` exclusive-create flag, mode `0o600`. Correct.
- Lock file read: `JSON.parse` in try/catch, parse errors silently skipped. Appropriate.
- `ACTIVE_WORKTREE_PATH` in bash: always double-quoted. No injection.
- `spawnSync` calls: array-form arguments, no shell-string interpolation.
- `isSafeName`: blocks `/`, `\`, `\0`, `\n`, `\r`, `\t`, `.`, `..`. No path traversal.
- `claim_comment_id`: validated `/^\d+$/` before URL interpolation. No injection.
- No hardcoded secrets found.

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0     |
| HIGH     | 0     |
| MEDIUM   | 2     |
| LOW      | 1     |

**No blockers for Phase 6. MEDIUM findings logged as follow-up.**
