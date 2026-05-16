# TDD Task 14 (PR2-B-sk) — Worktree cd in SKILL.md Session Heartbeat Blocks

## Task

Add `cd "$KAOLA_WORKTREE_PATH" 2>/dev/null || true` to the Session Heartbeat bash block in each phase SKILL.md so that worktree-provisioned sessions automatically navigate to the correct directory on skill startup.

## Files Modified

6 SKILL.md files were modified (the 3 remaining skills — init, next, next-pr — have no Session Heartbeat block and were intentionally left unchanged):

1. `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md` (line 44)
2. `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md` (line 36)
3. `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md` (line 36)
4. `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md` (line 36)
5. `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md` (line 36)
6. `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` (line 44)

## Change Applied

In each file, inside the `[ -n "${KAOLA_SESSION_ID:-}" ] && { ... }` block, after the `fi` that closes the ticker liveness check, the following line was added:

```bash
  cd "$KAOLA_WORKTREE_PATH" 2>/dev/null || true
```

### Placement Rationale

- Placed **inside** the session-guarded block so the `cd` only runs when a session is active.
- Placed **after** the ticker `fi` so the ticker is already running before navigating.
- The `2>/dev/null || true` makes it a no-op for legacy sessions where `KAOLA_WORKTREE_PATH` is unset.

## TDD Verification

**Baseline (before change):** `node scripts/simulate-workflow-walkthrough.js` — EXIT 0
**After change:** `node scripts/simulate-workflow-walkthrough.js` — EXIT 0

LOW-3 assertions verified intact:
- `kill -0 "$(cat "$_TICKER_PID_FILE" 2>/dev/null)" 2>/dev/null` present in all 6 phase SKILL.md files
- Session rehydration via `node "$claim_script" session` present in all 6 files

## Files NOT Modified

- `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md` — no Session Heartbeat block (init runs before any session/worktree exists)
- `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` — no Session Heartbeat block (router skill with a different startup structure)
- `plugins/kaola-workflow/skills/kaola-workflow-next-pr/SKILL.md` — no Session Heartbeat block (delegator, ≤40 lines by contract)
