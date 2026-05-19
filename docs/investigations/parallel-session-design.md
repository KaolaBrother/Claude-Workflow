# Parallel-Session Crossover — Design Investigation

**Status**: Investigation only. No code change yet. Decide which findings to file as issues.

**Trigger**: During the Phase 6 closure of #62, evidence emerged that a parallel session on the same machine (same user, same git repo) was finalizing #87 concurrently. The crossover caused a stale `kaola-workflow/issue-87/` to appear in my main-repo `git status`, a divergent origin/main mid-flight, and an aborted `sink-merge.js`. #62 itself (folder-duplicate class) was fixed cleanly, but the underlying parallel-session contract has gaps.

**Confirmed**: 852bce3 was authored by `KaolaBrother <yanleichen@hotmail.com>` at 22:45 CST on the same machine. Filesystem-level crossover, not origin-level.

---

## Q1 — Where does each session's state live?

| Class | Location (`KAOLA_WORKTREE_NATIVE=1`) | Owner |
|------|--------------------------------------|-------|
| Main session conversation cwd | main repo (`/workspace/kaola-workflow/`) | session-local but on shared filesystem |
| Phase artifacts written by main session | `<main-repo>/kaola-workflow/{project}/` | session-A — but lives in shared main repo |
| Linked worktree | `<main-repo>.kw/{project}/` | session-local, isolated path |
| Branch checkout | linked worktree (locked exclusively by git) | session-local |
| Commits | branch (until merge) | session-local |

The asymmetry: **branch / commits / linked worktree are isolated by git's worktree locking; phase artifacts in the main repo's `kaola-workflow/{project}/` are not**. Step 8a mirrors them to the linked worktree only at finalize time; until then, all sessions' artifacts coexist in the same `kaola-workflow/` namespace on the same filesystem.

## Q2 — Which state is shared across sessions?

| Shared resource | Mechanism | Cross-session writers? |
|----------------|-----------|------------------------|
| `.git/` (refs, packed objects, worktree registry) | git's own locking | yes, with git-level safety |
| Main repo's `kaola-workflow/` namespace | filesystem | **yes, no locking** |
| `kaola-workflow/.roadmap/` | filesystem | **yes, no locking** |
| `kaola-workflow/ROADMAP.md` | filesystem (generated from `.roadmap/`) | **yes, no locking** |
| `kaola-workflow/archive/` | filesystem | **yes, no locking** |
| origin/main | remote ref | yes, with push race retries |
| Vendored plugin install at `~/.claude/kaola-workflow/` | filesystem | per-user, not per-session |

## Q3 — When does each session read or write shared state?

| Event | Reads | Writes |
|-------|-------|--------|
| Startup (`cmdStartup`) | all of `kaola-workflow/*/workflow-state.md` via `readActiveFolders` | `kaola-workflow/{my-project}/workflow-state.md` (claim) |
| Watch-pr (`cmdWatchPr`) | all `sink: pr` folders globally | archives ANY of them whose PR is MERGED/CLOSED |
| Phase 1–5 work (main session in main repo) | own folder | own folder + tracked source files |
| Step 8a mirror | own folder + own modified tracked files + `git status` of main repo (sees other sessions' untracked artifacts) | linked worktree only |
| `cmdFinalize` (after #62 fix) | own folder | rename in linked worktree + `rmSync(main-repo/{my-project}/)` |
| ROADMAP regen | `.roadmap/issue-*.md` (all) | `ROADMAP.md` (overwrite) |
| Sink-merge (manual or scripted) | main branch | main branch tip + push to origin |

The cross-session blast radius concentrates in: **`readActiveFolders` (read-all)**, **`cmdWatchPr` (write-all-PR-sinks)**, and **ROADMAP regen (write-shared-mirror)**.

## Q4 — Which invariants does the current workflow assume that parallel sessions can break?

1. **"Active folder reflects MY session's work"** — `readActiveFolders` doesn't tag folders by session. Any session's folder is visible to all. `cmdStartup` without a target auto-claims a sole active folder via `verdict: owned`, regardless of which session created it. (In practice the `/workflow-next` contract requires the agent to set `KAOLA_TARGET_ISSUE` before calling startup, so this is a hazard only for code that calls `cmdStartup` directly outside that contract.)

2. **"My `git status` shows only my drift"** — broken when another session writes phase artifacts to the main repo for a different project. (Observed: `?? kaola-workflow/issue-87/` appeared in my status because the parallel session's main-session writes landed there.)

3. **"origin/main moves only via my push"** — broken when a parallel session pushes between my fetch and my merge.

4. **"Sink-merge can checkout main"** — broken when my branch is locked to my linked worktree AND sink-merge runs from the linked worktree. (Observed: sink-merge failed with "main is already used by worktree".)

5. **"`watch-pr` only touches my folders"** — broken by design: `watch-pr` scans ALL folders globally. A startup in session A can archive session B's PR folder.

6. **"ROADMAP.md regen reflects MY state"** — broken when another session has a stale `.roadmap/issue-N.md` source that I haven't pulled yet, or vice versa. (Observed: my regen re-introduced a stale issue-79 row because the prior finalize had not deleted its source.)

---

## Design Options

### Option 1 — Status quo + targeted patches (paper-cut closures)

Keep the current "one filesystem, many sessions" model. File one issue per gap. The system can already complete in parallel; the failures are friction, not corruption.

**Pros**:
- No architectural shift; no risk of regression in the well-tested happy path.
- Each gap is independently testable.
- Matches the explicit #63 model: "GitHub issues + local folders are the only durable state."

**Cons**:
- Future sessions will hit the same surprises until each gap is closed.
- Some gaps (auto-pickup adopting another session's folder) are silent and dangerous.

**Gaps to file** (paper-cuts identified post-#62):
- A. Phase 6 resolves CLAIM_JS to globally-installed plugin first, hiding workspace fixes during self-test.
- B. Sink-merge can't `git checkout main` when the feature branch is locked to a linked worktree.
- C. Sink-merge's race-retry doesn't recover from divergent origin/main; only handles ff-only races.
- D. AC#4 from #62 (sweep for existing stale duplicates) — deferred.
- E. Tracked-file modifications written from main session sit in BOTH worktrees until Step 8a; main-session is the canonical writer when `KAOLA_WORKTREE_NATIVE=1`.
- F. `.roadmap/issue-N.md` not auto-deleted by its own finalize.
- **NEW** G. Auto-pickup (`startup → verdict: owned` when active.length === 1) silently adopts any other session's sole folder.
- **NEW** H. `watch-pr` scans all sessions' folders without session-ownership check.

### Option 2 — Strengthen worktree isolation (main session always runs in linked worktree)

Make `KAOLA_WORKTREE_NATIVE=1` the default and force the main session to `cd` into the linked worktree at startup. Phase artifacts, mirrors, and edits all live in the linked worktree. The main repo only sees archive folders post-merge and tracked-file changes via merge.

**Pros**:
- Eliminates Q4 invariants 1, 2 by construction.
- Step 8a becomes a no-op (artifacts are already in the linked worktree).
- The #62 fix becomes redundant (no main-repo copy ever exists), but keeps it as defense-in-depth.

**Cons**:
- Significant rework of `workflow-next.md` (startup) and every phase command.
- Many tools (claude-code itself, advisor, subagents) currently inherit the conversation cwd — would need to be re-routed.
- Doesn't fix Q4 invariants 3, 4, 5, 6 (origin race, sink-merge worktree lock, watch-pr cross-archive, roadmap regen).

### Option 3 — Add a coordination layer (REJECTED)

Considered but rejected. Any per-session ownership tag is either purely informational (useless against an explicit `/workflow-next N` target) or becomes the same "ownership trap" #63 deleted. A `flock`-based sink-merge gate could exist without ownership semantics, but its job — preventing simultaneous pushes — is already done by git's own ref-update race; the visible failure was a script bug (gap B), not a missing lock. Reintroducing a coordination layer to fix a missing checkout-helper would not survive review.

### Why Option 1 is enough today

The session **completed**. The 6 gaps cost ~5 minutes of human attention. No data lost, no commit corrupted. Pre-commit guard held. The #63 bet — "GitHub issues + local folders are the only durable state" — survived this parallel run; the broken invariants were script-helper bugs (B, A), not architectural failure.

---

## Recommendation

**Option 1 + close gaps B and A first.** Defer the rest. Re-evaluate Option 2 only if more than 2 parallel sessions becomes common.

Rationale (ordered by evidence weight):
- **B (HIGH)** — `sink-merge.js` aborted my closure today. The script tries `git checkout main` from inside a linked worktree where the feature branch is locked. Replace `process.chdir(mainRoot)` with `git -C <mainRoot>` so the script doesn't move HEAD in the linked worktree's context. Recurrence-likely.
- **A (HIGH for installer changes)** — Phase 6 resolves `CLAIM_JS` via `$HOME/.claude/...` before `./scripts/`. When the fix IS in claim.js, finalize runs the stale plugin copy. Self-test of any claim.js change fails until reinstall. Fix: in the `kaola_script` helper, prefer the workspace path when the workspace itself is a kaola-workflow checkout (detect via `package.json.name === 'kaola-workflow'` or a `KAOLA_DEV=1` env).
- **G (defense-in-depth, not lead)** — `cmdStartup`'s `active.length === 1 → verdict: owned` path is unsafe ONLY for direct `cmdStartup` callers outside the `/workflow-next` contract. The contract already requires `KAOLA_TARGET_ISSUE` before startup, so this is not a hazard for normal parallel sessions. Keep for direct-caller hardening but DO NOT lead with it.

Defer (paper-cuts, file but lower priority):
- **C** (divergent-origin retry in sink-merge) — currently caught by humans via manual rebase. Worth fixing but not urgent.
- **D** (one-time sweep for existing stale duplicates) — drift accumulates slowly; manual cleanup acceptable.
- **E** (tracked-file dual-write) — bookkeeping inefficiency, no correctness impact.
- **F** (`.roadmap/issue-N.md` auto-delete) — already in Phase 6 Step 7, just gets forgotten by humans.
- **H** (`watch-pr` cross-archive) — theoretical; not observed in practice.

Reject Option 2 and Option 3. Option 2 is a large lift for the current crossover damage; Option 3 reintroduces coordination that #63 deleted and doesn't survive review. Re-evaluate Option 2 if more than 2 parallel sessions becomes common, or if a silent corruption (not just friction) is observed.

---

## Issue Map

If user approves filing:

| Issue | Priority | Title (proposed) | Source |
|------:|---------|-------------------|--------|
| #G1 | HIGH | `sink-merge.js` cannot checkout main when feature branch is locked to a linked worktree (`git -C` instead of `chdir`) | Gap B |
| #G2 | HIGH | Phase 6 resolves CLAIM_JS to globally-installed plugin before workspace copy — fix-self-test silently runs the stale version | Gap A |
| #G3 | LOW (defense-in-depth) | `cmdStartup`'s `active.length === 1 → verdict: owned` should reject ambiguous adoption when no explicit target | Gap G — only hazardous for direct script callers outside `/workflow-next` |
| #G4 | LOW | `sink-merge.js` race-retry handles ff-only but not divergent origin/main mid-flight | Gap C |
| #G5 | LOW | Phase 6 Step 7 sometimes leaves a stale `.roadmap/issue-N.md` source from a prior session | Gap F |
| #G6 | LOW | `cmdWatchPr` archives folders globally with no session-ownership filter | Gap H |
| (deferred) | LOW | One-time sweep for existing stale duplicates | Gap D |
| (deferred) | LOW | Tracked-file dual-write between main repo and linked worktree | Gap E |

Open questions before filing:
- File G3 at all, or document the contract-violation hazard in `commands/workflow-next.md` only? G3 is a fix in defense of misuse, not a fix for observed breakage.
- Bundle G2 with the `kaola_script` helper redesign, or keep it minimal (env flag opt-in)?
- Should G1 carry an integration test in `simulate-workflow-walkthrough.js` that simulates a linked-worktree invocation?
