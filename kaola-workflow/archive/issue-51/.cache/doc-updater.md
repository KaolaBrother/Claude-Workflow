# Documentation Update Report — Issue #51

**Date:** 2026-05-18  
**Issue:** #51 — Core lifecycle + Codex parity + validation green  
**Updated by:** doc-updater agent

---

## Summary

Issue #51 shipped several user-facing changes requiring documentation updates:

1. **Closed-issue cleanup** — new `isIssueClosed` helper + `cmdSweep` closed-fast-path + `claimExplicitTarget` closed guard
2. **Ticker Codex safety** — new Codex-safe gate (OR-of-three: `args.runtime === 'codex'` || `CODEX_THREAD_ID` || `KAOLA_KERNEL_SESSION_SKIP === '1'`)
3. **Second-pass archive** — `cmdSweep` now detects `step:complete` + `phase6-summary.md` and archives as `closed`
4. **Session ownership guard** — `cmdResume` now validates ownership via explicit `--session` argument
5. **Worktree finalize label cleanup** — `cmdWorktreeFinalize` now sets `remoteCleanup: true` (was false)
6. **Plugin hook parity** — new `plugins/kaola-workflow/hooks/kaola-workflow-pre-commit.sh` (byte-identical copy)

---

## Documentation Assessment

### 1. README.md

**Status:** UPDATED

**Changes Made:**
- Line 309: Updated `kaola-workflow-claim.js` description to emphasize new closed-issue workflow, ownership guard, and step:complete detection
- Line 312: Added `kaola-workflow-repair-state.js` note about `ownedByCurrentSession` behavior change (now returns false for empty session IDs)
- Lines 527–528: Extended sweep description to include closed-fast-path and second-pass step:complete archive detection

**Reasoning:** The sweep fast-path for closed issues is user-facing — agents and CLI users need to understand that closed GitHub issues are now cleaned up immediately without a 24-hour cutoff, and that completed workflows are auto-archived in the second pass. This affects workflow planning and session recovery behavior.

**Evidence:**
- Closed issues trigger label/assignee removal + worktree deletion immediately (line 2151–2166 in claim.js)
- Step:complete detection makes completed-but-not-finalized projects self-archive (line 2205–2210)
- Both behaviors are visible to users via sweep operations and status output

---

### 2. API/CLI Documentation

**Status:** NO CHANGE REQUIRED

**Reasoning:** This repository has no HTTP/REST API docs. The "API" is the shell command interface to `kaola-workflow-claim.js` subcommands. All CLI subcommands already appear in README's "Automation Scripts" table (lines 309–317), which now includes updated descriptions for sweep behavior. No separate API docs file exists.

---

### 3. CHANGELOG.md

**Status:** UPDATED

**Changes Made:**
- Added new entry under `## [Unreleased]` documenting issue #51:
  - **Core lifecycle fixes** — closed-issue cleanup, step:complete archive, repair-state ownership guard, ticker Codex safety, worktree-finalize label cleanup
  - **Plugin parity** — new hook file
  - Links to dependent follow-up issues (#N1, #N2)

**Version Bump:** Candidate for v3.7.0 (feature-level changes with new cleanup contracts and ownership validations)

**Reasoning:** This is a feature-level release (new cleanup behavior, new guards, new auto-archive capability) warranting a MINOR bump from v3.6.1 → v3.7.0. The closed-issue cleanup is a user-facing behavior change; step:complete archive is new automation.

**Evidence:**
- Line 5 shows current release is 3.6.1
- Changes include new lifecycle contracts (closed-issue handling, step:complete detection)
- Matches pattern from issue #42 and #46 (which both bumped to MINOR)

---

### 4. Architecture/Codemaps

**Status:** NO CHANGE REQUIRED

**Reasoning:** No `docs/CODEMAPS/` directory exists in this repository. The architectural documentation is embedded in README.md's "Phases" section (lines 487–496), which is already accurate (does not mention closed-issue handling because it's a sweep concern, not phase logic). The `kaola-workflow-claim.js` module's responsibilities remain the same; the new closed-issue functions are internal helpers not visible to the phase contracts.

---

### 5. .env.example

**Status:** NO CHANGE REQUIRED

**Reasoning:** No new environment variables introduced:
- `CODEX_THREAD_ID` (used in Codex-safe gate) — pre-existing, already documented in env-var handling
- `KAOLA_KERNEL_SESSION_SKIP` (used in Codex-safe gate) — pre-existing, already documented at line 10–12

The closed-fast-path and ownership guards use only existing env vars and lock-file fields. No documentation expansion needed.

---

### 6. Inline Code Comments

**Status:** VERIFIED UP-TO-DATE

**Reasoning:** Phase 5 review already fixed three MEDIUM code-clarity items:
- Line 2638–2641: Added 4-line comment explaining B7b deviation (why `cmdResume` uses `args.session` explicitly)
- Line 33–39: Added HOOK PARITY NOTE block in `validate-script-sync.js` documenting manual sync requirement
- Line 2146–2148: Added `isSafeName` guards in `cmdSweep` (security fix)
- Line 2055: Added clarifying comment on `runTick` ticker-late-yield rationale

All public interfaces with changed behavior now have inline documentation.

---

## Files Updated

### README.md
- **Lines 309–317:** Updated "Automation Scripts" table entries for `kaola-workflow-claim.js` and `kaola-workflow-repair-state.js`
- **Lines 527–528:** Extended `cmdSweep` and `sweep` section descriptions to document closed-fast-path and step:complete archive behavior

### CHANGELOG.md
- **Lines 3–34:** New `## [Unreleased]` section documenting issue #51 changes (Core lifecycle fixes, Plugin parity fixes)
- **Version candidate:** v3.7.0 (MINOR bump from v3.6.1)

---

## Files NOT Updated (with reasoning)

| File/Category | Reason |
|---|---|
| **API docs** | No separate API docs file; CLI coverage in README sufficient |
| **Architecture docs** | No `docs/CODEMAPS/` directory exists; phase contracts unchanged |
| **.env.example** | No new env vars; existing vars already documented |
| **Command files** | Phase contracts unchanged; sweep/cleanup are implementation details |
| **Skill files** | No Codex-specific behavior changes beyond ticker Codex-safe gate (already in code comments) |

---

## Quality Checklist

- [x] Changes generated from actual code (phase4-progress.md, phase5-review.md, claim.js diff)
- [x] All file paths verified to exist
- [x] Code examples (if present) match actual implementation
- [x] Links tested (README links verified)
- [x] Freshness timestamps updated (README, CHANGELOG dated 2026-05-18)
- [x] No obsolete references

---

## Notes for Phase 6

1. **Version bump decision**: Consider whether v3.7.0 is appropriate for main release. Closed-issue cleanup and step:complete archive are feature-level changes, not patches. Current release is v3.6.1.

2. **Follow-up doc items** (deferred to Phase 6 or subsequent issues):
   - Hook-sync CI check (separate from doc updates)
   - Env-var naming normalization (`KAOLA_OFFLINE` vs `KAOLA_WORKFLOW_OFFLINE`)
   - `isIssueClosed` performance optimization if high-frequency sweep use occurs

3. **No user-prompt changes needed** in command files. The closed-issue behavior is automatic (no agent decision required); the step:complete archive is also automatic.

---

## Last Updated
2026-05-18T05:00:00.000Z
