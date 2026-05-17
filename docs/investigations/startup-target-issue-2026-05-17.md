# `startup` ignores user-named target issue; forces release + reclaim + receipt repair

**Date:** 2026-05-17
**Status:** Design draft — ready to file as a GitHub issue

---

## Mission

When the user names a specific issue in the prompt or goal context — e.g.
`/workflow-next 245`, "start issue #90", or a goal like "finish #90" — the
router must claim **that** issue directly. Today it ignores the named
target, runs the classifier, claims whatever the classifier picks first,
and the agent has to detect the mismatch and manually unwind three
layers of state (lock release, local artifact removal, startup receipt
repair) plus visible GitHub side effects (assignee + claim comment on
the wrong issue) before re-claiming the user's actual target.

This is a discrete bug, not part of #41's classifier/ranking concerns.
#41 is about how the classifier ranks and falls back when given no
direction. This bug is about **explicitly overriding the classifier
when the user has already named the target** — a different dimension of
user-intent override, the same family as #42 (sink) and #41 Gap 4
(fast/full path).

## Smoking-gun evidence (kaolaGIT Codex session, 2026-05-17)

Session: `019e339c-04a3-7d30-8bb9-fb81460389f2`
File: `~/.codex/sessions/2026/05/17/rollout-2026-05-17T09-45-23-019e339c-04a3-7d30-8bb9-fb81460389f2.jsonl`

| Event | Time (UTC) | What happened |
|---|---|---|
| [687] | 13:19:07 | User: "look at the issues … show me the one you think we should do the next" |
| [743] | 13:20:19 | Agent recommends **#90** (Widget polish: security/code-quality fix) |
| [748] | 13:30:47 | `/goal` stop-hook fires: "use kaola-workflow skill to finish the next issue in line in the roadmap" |
| [752] | 13:31:02 | Agent decides: "I'll run this as a Kaola-Workflow issue cycle for **#90**" |
| [779] | 13:31:26 | Agent runs `kaola-workflow-claim.js startup` |
| **[798]** | **13:32:00** | **Agent verbatim: "Kaola startup auto-claimed #74 because the router follows roadmap order, but the user objective explicitly says to finish #90 first. I'm going to release/remove the accidental #74 local startup artifacts…"** |
| [824] | 13:32:27 | Manual cleanup: `release`, `rm -rf kaola-workflow/issue-74`, `gh issue edit 74 --remove-assignee --remove-label` |
| [837] | 13:32:46 | Manual reclaim: `claim --project issue-90 --issue 90` |
| [858] | 13:33:10 | `verify-startup` **rejects** issue-90 with `"startup receipt does not authorize project issue-90"` (receipt still says #74) |
| [864-879] | 13:33:17-29 | Manual startup receipt repair to authorize issue-90 |
| [882] | 13:33:35 | "claimed and startup-authorized after user-directed override" |

**Cost per occurrence:** ~2 minutes of agent cleanup, plus visible
GitHub side effects (wrong assignee, wrong claim comment, then both
reversed). Three separate cleanup layers are required, each silently
incomplete from the others — there is no atomic "switch target" path.

## Current state (verified)

| Component | File:line | Behavior |
|---|---|---|
| Router (Claude) | `commands/workflow-next.md:14-17` | Documents `$ARGUMENTS` as "a GitHub issue number or free-form task description for new work" |
| Router (Claude) | `commands/workflow-next.md:60-69` | The actual `startup` invocation does **not** pass `$ARGUMENTS` to the script: `node "$CLAIM_JS" startup --session ... --runtime claude $KAOLA_SINK_FLAG` |
| Router (Codex) | `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md:39-47` | Same shape: calls `startup` without an issue argument |
| `parseArgs` | `scripts/kaola-workflow-claim.js:157` | Recognizes `--issue N` (only the `claim` subcommand uses it) |
| `cmdStartup` | `scripts/kaola-workflow-claim.js:1211` | Does not read `args.issue`; walks `sortedIssues` and claims the first green one |
| `runStartupClaimFirstAvailable` | `scripts/kaola-workflow-claim.js:1190-1208` | Pure first-available walk; no target filter |
| Startup receipt | `scripts/kaola-workflow-claim.js: writeStartupReceipt` | Always records the auto-selected issue; no concept of "target supplied" |
| `verify-startup` | called at session [858] in trace above | Rejects any project not matching the receipt — the third silent layer that has to be repaired separately |

**Doc/code drift:** the router documents `$ARGUMENTS` as an issue
number, but the code never threads it through.

## Proposal

### Shape

1. **Router NLU intent capture.** Extract a target issue from the prompt
   and goal context. Same shape as #42's sink-intent capture and #41
   Gap 4's path-intent capture.

   Match patterns (case-insensitive, in order, first match wins):

   - Numeric `$ARGUMENTS`: `/workflow-next 245`
   - `/workflow-next issue 245`, `/workflow-next #245`
   - Prompt phrases: `"start issue #245"`, `"work on #245"`,
     `"do issue 245"`, `"finish issue 245"`, `"continue #245"`,
     `"resume issue 245"`
   - Goal-context line containing `#NNN` or `issue NNN` (the goal
     directive at [748] in the trace).

   The router sets `KAOLA_TARGET_ISSUE=245` (env wire, parallel to
   `KAOLA_SINK`) before the startup call.

2. **`cmdStartup` honors `--target-issue N`** (and reads
   `KAOLA_TARGET_ISSUE` as fallback).

   When set, the function:
   - Skips `runStartupClaimFirstAvailable`'s ranking walk.
   - Validates N is in `sortedIssues` (i.e. open and not in archive).
   - Runs **one** classification for N via the existing classifier.
   - On `green`/`yellow`: claims N directly; writes the receipt with
     `selected_issue: N`, `selected_project: "issue-N"`,
     `target_source: "user_directed"`. **The receipt is consistent with
     the lock from the start** — no third-layer repair needed.
   - On `blocked` / `red`: writes a receipt with
     `claim: "user_target_blocked", target: N, reason: <classifier reason>`
     and exits. The router stops and asks; it does **not** silently
     fall back to auto-pick.

3. **Atomic switch helper for legacy traces** (defense in depth, not
   required for v1): add a `switch-target --from N --to M` subcommand
   that performs all three cleanup layers atomically (lock release,
   local artifact prune, receipt rewrite, GitHub side-effect rewind).
   Marked optional below; not in v1 if the NLU capture lands.

### Conflict rule (hard-coded, not agent judgment — per #41 Gap 3 lesson)

| User target | Current state | Result |
|---|---|---|
| #N (user named) | no active project for session | claim #N directly, write receipt with `target_source: user_directed` |
| #N | session already owns #N (same project) | resume — same path as `owned` verdict today |
| #N | session owns #M ≠ N | emit `target_mismatch`, list both, ask user (do not silently switch) |
| #N | another session owns #N | emit `target_occupied`, name the foreign session, stop |
| #N | #N is closed / not in open list | emit `target_unavailable` with reason, stop |
| #N | #N is open but classifier says `blocked` (depends-on, etc.) | emit `user_target_blocked`, stop and ask (user override available in next turn) |
| #N | #N is open but classifier says `red` (conservative red) | emit `user_target_red`, stop and ask |
| none | any | unchanged from today |

The router prints the typed verdict; the agent does not invent its own
recovery. Same pattern as the verbatim warning text in #41 Gap 4.

### Delete radius (the atomic PR scope)

1. **Modify** `commands/workflow-next.md`:
   - Add NLU extraction step before the startup call (matches above).
   - Set `KAOLA_TARGET_ISSUE` and pass `--target-issue $KAOLA_TARGET_ISSUE` to the startup invocation.
   - Add the conflict-rule handling for the new verdicts.
2. **Modify** `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` (Codex parity for all of (1)).
3. **Modify** `scripts/kaola-workflow-claim.js`:
   - `cmdStartup` reads `--target-issue` and `KAOLA_TARGET_ISSUE`.
   - When set, take the target-issue branch above; emit typed verdicts.
   - Receipt records `target_source: "user_directed"` so audits can see when the bug-trigger path was taken.
4. **Modify** `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` (byte-identical mirror).
5. **Modify** `scripts/validate-workflow-contracts.js` and its plugin mirror:
   - Assert the router passes `--target-issue` when `$ARGUMENTS` looks like an issue number.
   - Assert `cmdStartup` references `--target-issue` and the typed verdicts.
6. **Modify** `scripts/simulate-workflow-walkthrough.js`:
   - User-named target → direct claim, no classifier walk; receipt records `target_source`.
   - User-named target already claimed by self → resume path, no double-claim.
   - User-named target occupied by foreign session → `target_occupied`, stop.
   - User-named target blocked by classifier → `user_target_blocked`, stop and ask.
   - Backward compat: prompt with no target → unchanged from today.
7. **Update** `README.md` with a "Targeting a specific issue" subsection (one short paragraph + the phrase list).
8. **Update** `CHANGELOG.md` under `[Unreleased]`.

### Out of scope (explicit)

- **Mid-workflow target change.** Once the project is claimed, switching
  to a different issue is a separate proposal; see optional
  `switch-target` subcommand above.
- **Fuzzy intent extraction.** "the security bug" / "the widget one" —
  out of scope. Only numeric extraction (`#N`, `issue N`, bare `N` when
  it is `$ARGUMENTS`).
- **Auto-creating an issue** when the target number doesn't exist.
  Stop and ask instead.

### Acceptance criteria

- [ ] `/workflow-next 245` claims #245 directly when open and green;
  the startup receipt records `selected_issue: 245`,
  `target_source: "user_directed"`.
- [ ] `/workflow-next 245` with #245 already claimed by the same
  session resumes that project (no second claim attempt, no error).
- [ ] `/workflow-next 245` with #245 occupied by another session
  emits `target_occupied` and exits non-routing; the agent does not
  proceed to auto-pick.
- [ ] `/workflow-next 245` with #245 closed emits `target_unavailable`
  and stops with a clear reason.
- [ ] `/workflow-next 245` with #245 blocked by the classifier emits
  `user_target_blocked` and the router stops to ask, with classifier
  reason included.
- [ ] A goal-context line "finish #90" produces the same target
  extraction as `/workflow-next 90`.
- [ ] No regression for empty / non-numeric `$ARGUMENTS`: classifier
  walk runs unchanged.
- [ ] `verify-startup` succeeds on the first call after a
  user-directed claim — no third-layer receipt repair is needed.
- [ ] `node scripts/simulate-workflow-walkthrough.js` exits 0 with the
  five new cases.
- [ ] Both contract validators pass.
- [ ] README and CHANGELOG updated.

### Risks & mitigations

| Risk | Mitigation |
|---|---|
| NLU false positive — phrase `"do issue tracking"` matches the pattern | Patterns require a numeric capture (`#N`, `issue N`, bare `N`). No number = no target. Test in walkthrough. |
| User names a closed/archived issue, agent confused | `target_unavailable` is a typed verdict; agent must stop, not fall back. |
| Two issue numbers in one prompt | First match wins; emit the chosen number in startup output so user can correct in next turn. |
| Backward compat with in-flight workflows | When `KAOLA_TARGET_ISSUE` is unset and `--target-issue` is absent, behavior is unchanged. Default code path is the existing classifier walk. |
| Codex / Claude parity drift | Atomic PR touches both runtime files and both validators. |
| User says "fast" + "issue 245" in same prompt | Both intents capture independently: `KAOLA_TARGET_ISSUE=245` and `KAOLA_PATH=fast`. Fast-path on a user-named target is a valid combination. |

### Connection to other open issues

- **#41 Gap 4 (fast/full path)** — same NLU intent-capture pattern;
  shares no code beyond the pattern. Both can land independently.
- **#42 (sink consolidation)** — same env-wire shape
  (`KAOLA_TARGET_ISSUE` parallels `KAOLA_SINK`); validate consistency
  in the env-wire docs.
- **#41 Gap 1 (top-tier label discovery) and `analyzeIssue` sharing**
  — not blocked. The user-target path runs a single classification
  call regardless of `analyzeIssue` shape; when Gap 1 lands, the
  classification for the named target reuses the same function.
- **#41 Gap 2 (`claim:none` recovery)** — different surface. Gap 2
  handles the no-result case from the classifier; this proposal
  prevents a wrong-result case before it happens.

### Suggested labels

`bug`, `area:workflow-router`, `area:workflow-startup`
