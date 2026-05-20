# Phase 3 - Plan: issue-104

## Blueprint

### Files to Create
None. Runtime artifacts produced during fast-mode runs (not part of this PR) are listed for reference:

| Runtime artifact | Created by | When |
|---|---|---|
| `kaola-workflow/{project}/.cache/planner.md` | orchestrator | fast Step 1 |
| `kaola-workflow/{project}/.cache/tdd-guide.md` | orchestrator (captures tdd-guide raw output) | fast Step 2 |
| `kaola-workflow/{project}/.cache/code-reviewer.md` | orchestrator (captures code-reviewer raw output) | fast Step 3 |

### Files to Modify

| # | File | Changes | Why |
|---|------|---------|-----|
| 1 | `commands/workflow-next.md` | Insert ~43-line Step 0a-1 block after Step 0a (current line 76); append `Workflow path:` line to Required Output block after `Branch:` | Gap A: agent-judged path selection |
| 2 | `commands/kaola-workflow-fast.md` | Replace lines 56-135 with rewritten Steps 1-3 (subagent delegations) + updated fast-summary template (adds Required Agent Compliance table); preserve lines 1-55 and lines 137-144 verbatim | Gap B: subagent enforcement |
| 3 | `plugins/kaola-workflow-gitlab/commands/workflow-next.md` | Mirror Task 1 with GitLab substitutions: `glab issue view "$KAOLA_TARGET_ISSUE" --json number,title,body,labels` replaces `gh issue view`; both Mid-Flight Escalation refs point to GitLab fast.md path | Gap A GitLab parity; honor `assertNoForbidden` |
| 4 | `plugins/kaola-workflow-gitlab/commands/kaola-workflow-fast.md` | Apply Task 2 replacement with 2 substitutions: "linked GitHub issue body" → "linked GitLab issue body" (Step 1 planner prelude) and any residual "GitHub issue body" → "GitLab issue body" | Gap B GitLab parity |
| 5 | `plugins/kaola-workflow/skills/kaola-workflow-fast/SKILL.md` | Replace lines 21-70 (current stub-write through fast-summary template close) with expanded Step 1 heading + condensed-density Steps 1-3 prose + fast-summary template w/ Required Agent Compliance table; preserve lines 1-20 (frontmatter/Goal Contract) and lines 72-75 (Continue block) | Codex runtime parity with command file |
| 6 | `plugins/kaola-workflow-gitlab/skills/kaola-workflow-fast/SKILL.md` | Apply Task 5 with same 2 GitLab substitutions as Task 4 | Codex runtime + GitLab parity |

### Build Sequence

1. Re-read exact line numbers immediately before each edit (lines shift as earlier edits land).
2. Task 1 — `commands/workflow-next.md` (GitHub workflow-next).
3. Task 2 — `commands/kaola-workflow-fast.md` (GitHub fast.md).
4. Validate: `node scripts/validate-workflow-contracts.js` and `node scripts/simulate-workflow-walkthrough.js`.
5. Task 3 — `plugins/kaola-workflow-gitlab/commands/workflow-next.md` (GitLab workflow-next).
6. Task 4 — `plugins/kaola-workflow-gitlab/commands/kaola-workflow-fast.md` (GitLab fast.md).
7. Validate: `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`.
8. Task 5 — `plugins/kaola-workflow/skills/kaola-workflow-fast/SKILL.md` (GitHub SKILL.md).
9. Task 6 — `plugins/kaola-workflow-gitlab/skills/kaola-workflow-fast/SKILL.md` (GitLab SKILL.md).
10. Final: `node scripts/simulate-workflow-walkthrough.js` and `node scripts/validate-kaola-workflow-contracts.js`.

### Parallelization Plan

| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | 1, 2 | Disjoint files; both GitHub variants |
| B | 3, 4 | Disjoint files; after Group A so GitLab uses Group A as canonical diff source |
| C | 5, 6 | Disjoint files; after Group B (Task 6 needs Task 5 + Task 4 outputs) |

No write-set overlap between any two tasks.

### External Dependencies
None. Pure documentation edits.

## Task List

### Task 1: Insert Step 0a-1 + Workflow path — GitHub workflow-next
- File: `commands/workflow-next.md`
- Test File: Doc-only task — validator pass is the GREEN signal; tdd-guide returns the diff + validator stdout as evidence; no test file written.
- Write Set: `commands/workflow-next.md`
- Depends On: none
- Parallel Group: A
- Action: MODIFY
- Implement: Insert Step 0a-1 block (~43 lines) after line 76 between Step 0a and Step 0b. Use the verbatim text in `.cache/architect.md` "### Step 0a-1 block". Append `Workflow path: {fast|full — from KAOLA_PATH or Step 0a-1 judgment}` inside the Required Output fenced block after the `Branch:` line.
- Mirror: Step 0a prose style (`commands/workflow-next.md:69-76`); use section-name reference for fast.md Mid-Flight Escalation (not line number).
- Validate: `node scripts/validate-workflow-contracts.js`

### Task 2: Rewrite Steps 1-3 + fast-summary template — GitHub fast.md
- File: `commands/kaola-workflow-fast.md`
- Test File: Doc-only task — validator pass is the GREEN signal; tdd-guide returns the diff + validator stdout as evidence; no test file written.
- Write Set: `commands/kaola-workflow-fast.md`
- Depends On: none (independent of Task 1)
- Parallel Group: A
- Action: MODIFY
- Implement: Replace lines 56-135 (`## Step 1 - Plan (Single-Pass)` through closing ` ``` ` of fast-summary template). Preserve lines 1-55 (header through Mid-Flight Escalation) and lines 137-144 (Continue to Phase 6) verbatim. Use the verbatim text from `.cache/architect.md` "### Steps 1-3 + fast-summary template". Each step preserves the full workflow-state.md field block (phase, phase_name, step, workflow_path, next_command) and adds orchestrator/ownership/fallback fields. Step 1 corrects `step: execute` → `step: plan`. Step 1 includes `mkdir -p kaola-workflow/{project}/.cache`. fast-summary template gains Required Agent Compliance table with planner/tdd-guide/code-reviewer rows.
- Mirror: `commands/kaola-workflow-phase2.md:61-89` (planner prelude); `commands/kaola-workflow-phase4.md:218-254` (tdd-guide prelude); `commands/kaola-workflow-phase5.md:120-143` (code-reviewer prelude); `commands/kaola-workflow-phase1.md:186-191` (compliance table format).
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task 3: Insert Step 0a-1 + Workflow path — GitLab workflow-next
- File: `plugins/kaola-workflow-gitlab/commands/workflow-next.md`
- Test File: Doc-only task — validator pass is the GREEN signal; tdd-guide returns the diff + validator stdout as evidence; no test file written.
- Write Set: `plugins/kaola-workflow-gitlab/commands/workflow-next.md`
- Depends On: Task 1 (uses Task 1's finished GitHub text as diff source)
- Parallel Group: B
- Action: MODIFY
- Implement: Insert Step 0a-1 block after line 76 (end of `## Startup Step 0a — MR Intent Capture`). Substitutions: `glab issue view "$KAOLA_TARGET_ISSUE" --json number,title,body,labels` replaces `gh issue view` (syntax confirmed against `plugins/kaola-workflow-gitlab/commands/kaola-workflow-phase1.md:213`); both Mid-Flight Escalation section refs point to `plugins/kaola-workflow-gitlab/commands/kaola-workflow-fast.md`. Append `Workflow path:` line identically to Task 1. Confirm no forbidden tokens (`\bgh\b`, `GitHub`, `PR URL`, `PR number`, `pull request`, `[a-z]+glab`).
- Mirror: Task 1 output with GitLab substitutions.
- Validate: `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`

### Task 4: Rewrite Steps 1-3 + fast-summary template — GitLab fast.md
- File: `plugins/kaola-workflow-gitlab/commands/kaola-workflow-fast.md`
- Test File: Doc-only task — validator pass is the GREEN signal; tdd-guide returns the diff + validator stdout as evidence; no test file written.
- Write Set: `plugins/kaola-workflow-gitlab/commands/kaola-workflow-fast.md`
- Depends On: Task 2 (uses Task 2's finished GitHub text as diff source)
- Parallel Group: B
- Action: MODIFY
- Implement: Apply Task 2 replacement. Two GitLab substitutions: "linked GitHub issue body" → "linked GitLab issue body" (Step 1 planner prelude); any residual "GitHub issue body" → "GitLab issue body" (covers current line 59 divergence). All other prose identical to Task 2.
- Mirror: Task 2 output with GitLab substitutions.
- Validate: `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`

### Task 5: Expand SKILL.md — GitHub
- File: `plugins/kaola-workflow/skills/kaola-workflow-fast/SKILL.md`
- Test File: Doc-only task — validator pass is the GREEN signal; tdd-guide returns the diff + validator stdout as evidence; no test file written.
- Write Set: `plugins/kaola-workflow/skills/kaola-workflow-fast/SKILL.md`
- Depends On: Task 2 (uses Task 2's finished GitHub fast.md Steps 1-3 as prose source)
- Parallel Group: C
- Action: MODIFY
- Implement: Replace lines 21-70 with expanded Step 1 heading + condensed-density Steps 1-3 prose + updated fast-summary template including Required Agent Compliance table. Preserve lines 1-20 (frontmatter through Goal Contract) and lines 72-75 (Continue block). Density: drop bash fences but keep prose steps and template. Use the verbatim condensed text from `.cache/architect.md` "### SKILL.md condensed".
- Mirror: Task 2 prose, condensed to SKILL.md density matching the existing compression ratio between command file and SKILL.md.
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 6: Expand SKILL.md — GitLab
- File: `plugins/kaola-workflow-gitlab/skills/kaola-workflow-fast/SKILL.md`
- Test File: Doc-only task — validator pass is the GREEN signal; tdd-guide returns the diff + validator stdout as evidence; no test file written.
- Write Set: `plugins/kaola-workflow-gitlab/skills/kaola-workflow-fast/SKILL.md`
- Depends On: Task 5 (uses Task 5's finished GitHub SKILL.md as diff source), Task 4 (uses GitLab substitution list)
- Parallel Group: C (after Task 5)
- Action: MODIFY
- Implement: Apply Task 5 text with the two GitLab substitutions ("linked GitHub issue body" → "linked GitLab issue body"; residual "GitHub issue body" → "GitLab issue body").
- Mirror: Task 5 output with GitLab substitutions.
- Validate: `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`

## Advisor Notes

Plan is implementable. Build sequence dependency-safe; 6 files + integration points identified; developer can implement from plan alone (anchors, substitution rules, validator commands concrete); edge cases covered (OFFLINE degrades to full; orchestrator owns escalation during in-flight subagent; trivial inline edit retained with explicit orchestrator-applies prose).

**Resolved before Phase 4**:
1. **tdd-guide on doc-only tasks**: each task's "Test File" row states explicitly — "Doc-only task: validator pass is the GREEN signal; tdd-guide returns the diff + validator stdout as evidence; no test file written." Prevents tdd-guide from stalling on missing test files.
2. **GitLab validator exists**: `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` confirmed via `ls`.
3. **glab CLI flag syntax**: `glab issue view N --json <fields>` confirmed by reading `plugins/kaola-workflow-gitlab/commands/kaola-workflow-phase1.md:213`. Architect's draft of `--output json` was wrong; corrected to `--json number,title,body,labels` for parity with `gh issue view`.

**Locked decisions (do not re-litigate)**:
- A1 + B1 (Path Intent + full subagent delegation).
- Scope = 6 files (user elected to include both SKILL.md mirrors).
- 6-phase routing for #104.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | invoked/N/A | N/A | advisor confirmed plan implementable on first pass; no revision needed |
