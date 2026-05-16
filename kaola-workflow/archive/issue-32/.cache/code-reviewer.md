# Code Review — issue-32: fix isolation tree orchestration-layer gaps

**Scope check**: All changes are directly traceable to the 4 declared gaps. No unrelated drift.

---

## Findings

---

**[MEDIUM] Artifact mirror loop is unsafe for renamed and space-containing file paths**
Files: `commands/kaola-workflow-phase6.md` (~line 544), `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` (~line 160)

The mirror loop uses `git status --porcelain` (without `-z`) and then slices with `${line:3}`:

```bash
git status --porcelain | while IFS= read -r line; do
  f="${line:3}"
  ...
  cp "$(pwd)/$f" "$ACTIVE_WORKTREE_PATH/$f"
done
```

Two bugs:

1. **Rename lines** produce entries like `R  old-name -> new-name`. Slicing at position 3 yields `old-name -> new-name`, which is not a valid path. The `cp` call silently fails or produces a file with a literal `->` in the name.

2. **Filenames with spaces** are quoted by git in non-`-z` output (e.g., `"path with spaces/file"`), causing the `cp` to operate on a quoted string, not the actual path.

Fix: use `git status --porcelain -z` with `while IFS= read -r -d '' line`, and filter or skip entries whose status prefix starts with `R` or `C`. Alternatively, use `git diff --name-only --diff-filter=d -z`.

---

**[MEDIUM] Defensive stray-dir cleanup regex is too broad and runs against the live repo**
File: `scripts/simulate-workflow-walkthrough.js` (lines 4390–4399)

```javascript
try {
  const cwdKw = path.join(process.cwd(), 'kaola-workflow');
  if (fs.existsSync(cwdKw)) {
    for (const d of fs.readdirSync(cwdKw)) {
      if (/^proj-ac/.test(d)) {
        fs.rmSync(path.join(cwdKw, d), { recursive: true, force: true });
      }
    }
  }
} catch (_) {}
```

Two issues:

1. `process.cwd()` is the live repository root, not `tmp`. This deletion runs against the real `kaola-workflow/` folder. Any real project directory whose name starts with `proj-ac` (e.g., `proj-accounts`, `proj-acme`) would be permanently deleted.

2. The regex `/^proj-ac/` should be anchored: `/^proj-ac\d+$/`. Even better, the original Gap 3-A fix (`cwd: tmp`) should have already eliminated the need for this cleanup block — if still necessary, the path should be inside `tmp`, not `process.cwd()`.

---

**[MEDIUM] Artifact mirror copies all non-workflow modified files from main worktree**
Files: `commands/kaola-workflow-phase6.md` (~line 546), `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` (~line 162)

The mirror's exclusion clause only skips `kaola-workflow/*` paths. Any other modified file (unrelated local edits, editor swap files) will be copied into the linked worktree and included in the commit.

---

**[LOW] `isSyntheticTestSession` predicate naming misleads**
File: `scripts/kaola-workflow-claim.js` (line 583)

```javascript
function isSyntheticTestSession(lock) {
  return !lock || !lock.session_id || String(lock.session_id).startsWith('synthetic-');
}
```

Also returns `true` for corrupt/partial locks. Should be renamed `isSyntheticOrCorruptLock` or the corrupt case extracted separately.

---

**[LOW] Gap 1+2 structural tests check substring only, not ordering or context**
File: `scripts/simulate-workflow-walkthrough.js` (lines 4375–4385)

Assertions verify string presence but not that mirror block appears before commit gate, or that strings appear inside bash fences rather than prose.

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0     |
| HIGH     | 0     |
| MEDIUM   | 3     |
| LOW      | 2     |

**Verdict: No blockers for Phase 6. MEDIUM findings are informational.**

Most important: stray-dir cleanup (#2) references `process.cwd()` (live repo) not `tmp` with broad `/^proj-ac/` pattern — dangerous. Verify whether the block is still needed after the `cwd: tmp` fix.
