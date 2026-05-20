# code-architect raw output — issue-104

## Design decisions (architect-resolved)

1. **SKILL.md files are NOT byte-identical to command files**. They are condensed mirrors. Strategy: expand each SKILL.md to carry the full Step 1-3 prose at SKILL.md density (omit bash fences; keep prose steps + template). The GitLab SKILL.md line 9 currently says `Mirror of commands/kaola-workflow-fast.md` (should say GitLab path) — pre-existing cosmetic error, OUT OF SCOPE.
2. **Replace line-number references with section-name references**. Provided Step 0a-1 prose had `commands/kaola-workflow-fast.md:38` (twice). After the Steps 1-3 rewrite, line 38 shifts. Both occurrences replaced with "the Mid-Flight Escalation section of `commands/kaola-workflow-fast.md`".
3. **GitLab fast.md substitution = 2 items**. Current GitLab diverges from GitHub only at line 59. Rewritten Step 1 reintroduces "linked GitHub issue body" in planner prelude, so GitLab task substitutes both occurrences.
4. **workflow-state.md field completeness**. Current Step 1 writes `phase`, `phase_name`, `step`, `workflow_path`, `next_command`. Rewrite preserves the full field set; adds orchestrator/ownership/fallback fields alongside.
5. **Step 1 `step:` field corrected**. Current file writes `step: execute` in Step 1 (pointing ahead). Rewrite changes to `step: plan` (current step). More accurate for resume detection.
6. **Required Agent Compliance table** added inside fast-summary template in all 4 fast files (2 commands + 2 SKILL.md).
7. **Mid-flight escalation contract** preserved verbatim (lines 1-55 untouched).
8. **Issue #44 compliance** — Step 0a-1 is pure prose. `KAOLA_PATH` export is a shell variable, not a script mutation.
9. **GitLab `assertNoForbidden` compliance** — `glab` alone does not match `/\b[a-z]+glab\b/i` (requires lowercase prefix). Safe.

## Files to Modify (6)

| # | File | Change | Priority |
|---|------|--------|----------|
| 1 | `commands/workflow-next.md` | Insert Step 0a-1 block (~43 lines) after line 76; append `Workflow path:` to Required Output block | 1 |
| 2 | `commands/kaola-workflow-fast.md` | Replace lines 56-135 (Steps 1-3 + fast-summary template); preserve lines 1-55 and 137-144 verbatim | 2 |
| 3 | `plugins/kaola-workflow-gitlab/commands/workflow-next.md` | Mirror Task 1 with GitLab substitutions | 3 |
| 4 | `plugins/kaola-workflow-gitlab/commands/kaola-workflow-fast.md` | Mirror Task 2 with 2 GitLab substitutions | 4 |
| 5 | `plugins/kaola-workflow/skills/kaola-workflow-fast/SKILL.md` | Replace lines 21-70 with expanded subagent-delegation prose at SKILL.md density | 5 |
| 6 | `plugins/kaola-workflow-gitlab/skills/kaola-workflow-fast/SKILL.md` | Mirror Task 5 with 2 GitLab substitutions | 6 |

## Concrete content (verbatim)

### Step 0a-1 block (File 1, with `gh issue view` for GitHub; File 3 uses `glab issue view "$KAOLA_TARGET_ISSUE" --output json`)

```markdown
## Startup Step 0a-1 — Path Intent

Before Step 0b, pick fast or full and export `KAOLA_PATH` if fast.
The agent owns this judgment; scripts do not auto-pick. Precedence top-down — first match wins.

1. If `KAOLA_PATH` is already exported, honor it.
   (Rationale: KAOLA_PATH is an explicit shell override; inferred intent
   from prompt prose should not silently overrule it.)
2. Else sniff the user's initial prompt (case-insensitive):
   - fast triggers: "quick fix", "trivial", "one-line", "one line",
     "rename", "typo", "small change", "fast path", "fast mode"
   - full triggers: "thorough", "full review", "full path",
     "carefully", "all phases", "deep dive"
   Tie or both match → prefer full.
3. Else fetch the selected issue once:
   ```bash
   gh issue view "$KAOLA_TARGET_ISSUE" --json number,title,body,labels
   ```
   Judge against the fast-path eligibility contract in the Mid-Flight
   Escalation section of `commands/kaola-workflow-fast.md`. Export
   `KAOLA_PATH=fast` ONLY if all hold: ≤ 2 closely related files, no new
   external deps, no public API/schema/migration change, no
   security/auth/encryption concern, no `depends-on:#N` label, single area.
4. If the issue fetch fails for any reason (KAOLA_WORKFLOW_OFFLINE=1,
   missing CLI, auth failure, network error), default to full.
5. Default `full`. When in doubt, full.

State the chosen path and one-line reason aloud before Step 0b:

```text
Path: fast (rubric — scope: 1 file, no risk markers)
Path: full (rubric — disqualifier: schema migration)
Path: full (default — rubric ambiguous; prefer safety)
```

Bias toward full when in doubt. Fast false positives escalate cleanly via the
Mid-Flight Escalation section of `commands/kaola-workflow-fast.md`; false
negatives only cost ceremony.
```

### Required Output line (File 1 + 3)

Insert after the `Branch:` line:
```
Workflow path: {fast|full — from KAOLA_PATH or Step 0a-1 judgment}
```

### Steps 1-3 + fast-summary template (File 2; File 4 = same with GitHub→GitLab in issue body refs)

See architect.md full text — sections "## Step 1 - Plan (planner)", "## Step 2 - Execute (tdd-guide)", "## Step 3 - Review (code-reviewer)", "## Write fast-summary.md".

Key elements per step:
- Step 1 begins with `mkdir -p kaola-workflow/{project}/.cache`
- Each step writes the full workflow-state.md field block (phase, phase_name, step, workflow_path, next_command, main_session_role, implementation_owner, inline_emergency_fallback_authorized)
- Each invokes named subagent with concrete asks
- Each persists raw output to `.cache/{agent}.md`
- Orchestrator (not subagent) writes status updates to fast-summary.md and workflow-state.md
- fast-summary.md template gains Required Agent Compliance table with planner/tdd-guide/code-reviewer rows

### SKILL.md condensed (File 5; File 6 = GitLab variant)

Density: drop bash fences, keep prose steps and the fast-summary template. Same structure (Step 1 / 2 / 3 + template + compliance table).

## Build Sequence

1. Read exact line numbers immediately before each edit (lines shift as prior edits land).
2. Edit `commands/workflow-next.md` (Task 1).
3. Edit `commands/kaola-workflow-fast.md` (Task 2).
4. Validate: `node scripts/validate-workflow-contracts.js` + `node scripts/simulate-workflow-walkthrough.js`.
5. Edit `plugins/kaola-workflow-gitlab/commands/workflow-next.md` (Task 3).
6. Edit `plugins/kaola-workflow-gitlab/commands/kaola-workflow-fast.md` (Task 4).
7. Validate: `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`.
8. Edit `plugins/kaola-workflow/skills/kaola-workflow-fast/SKILL.md` (Task 5).
9. Edit `plugins/kaola-workflow-gitlab/skills/kaola-workflow-fast/SKILL.md` (Task 6).
10. Final: `node scripts/simulate-workflow-walkthrough.js` + `node scripts/validate-kaola-workflow-contracts.js`.

## Parallelization Plan

| Group | Tasks | Why safe |
|-------|-------|----------|
| A | 1, 2 | Disjoint files; both GitHub variants |
| B | 3, 4 | Disjoint files; after Group A so GitLab uses Group A as source |
| C | 5, 6 | Disjoint files; after Group B (Task 6 needs Tasks 4+5 outputs) |

No write-set overlap across any pair.

## External Dependencies
None. Pure doc edits.

## Test Strategy

Validators per task:
- Tasks 1, 2: `validate-workflow-contracts.js`
- Task 2: `simulate-workflow-walkthrough.js`
- Tasks 3, 4, 6: `validate-kaola-workflow-gitlab-contracts.js`
- Task 5: `validate-kaola-workflow-contracts.js`
- All tasks complete: final `simulate-workflow-walkthrough.js`

Success: all validators exit 0 + "Workflow walkthrough simulation passed".

## Out of Scope (carved off)

- Changes to `scripts/kaola-workflow-claim.js` or `scripts/kaola-workflow-classifier.js`.
- Changes to mid-flight escalation trigger list.
- New validator assertions on fast-mode prose.
- Changes to precedence chain.
- Subagent compliance on fast → Phase 6 handoff.
- GitLab SKILL.md line 9 path-reference cosmetic fix (separate issue).
- Changes to any phase command other than the fast command.
