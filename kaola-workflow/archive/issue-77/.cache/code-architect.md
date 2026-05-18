# Architecture: Issue #77 — Typed-Acknowledgement Delegation Gate (Approach A)

## Design Decisions

- **Typed-acknowledgement pattern over ungated fallback**: Replace all prose that implies silent local fallback with explicit vocab requiring the agent to record one of four typed statuses: `subagent-invoked`, `local-fallback-explicit`, `local-fallback-tool-unavailable`, or `N/A`.
- **Compliance ledger templates updated selectively**: The `## Required Agent Compliance` tables in phase files are updated for delegation-gated rows only. Procedural rows that are not subagent-delegated (`archive completed folder`, `final commit and push`, `roadmap refresh`, `final validation`) retain neutral status. This avoids semantic nonsense where a git archive operation records `subagent-invoked`.
- **`invoked` is NOT blanket-retired**: The word "invoked" appears naturally in non-status contexts. We add positive assertions for the new vocab strings; we do not add a global `assertNotIncludes(file, 'invoked')`. The validator enforces presence of new vocab, not absence of the old neutral word.
- **Delegation Contract placed before Startup with explicit write-order**: The typed-acknowledgement gate runs before the startup transaction. The policy is held in-session until startup creates `workflow-state.md`, then patched in. This avoids a race where `writeState()` (which writes from a fixed template) overwrites any pre-written `delegation_policy:` field.
- **`writeState` does not preserve unknown fields — `delegation_policy` must be written after startup**: Confirmed by reading `kaola-workflow-claim.js` lines 194-237. The `writeState` function writes `workflow-state.md` from an explicit template; it does not carry through arbitrary fields. `updateState` (lines 239-244) does a text-level update and preserves content. Patching `delegation_policy:` via a follow-up `updateState` call (or agent text append to `workflow-state.md`) after startup is the only safe path.
- **kaola-workflow-fast is out of scope**: Verified by grep — neither the GitHub nor GitLab edition of `kaola-workflow-fast/SKILL.md` contains any of the target fallback phrases. No changes required.
- **GitLab validator style**: The GitLab validator uses inline `assert(read(file).includes(...))` / `assert(!read(file).includes(...))` rather than named helper functions. New assertions follow that existing style.
- **docs-lookup N/A gate preserved**: The applicability gate in `research/SKILL.md` line 38 (`only when current external behavior matters`) is kept. The new vocab is layered on top: when the step applies, record one of the three delegation statuses; when it does not apply, record `N/A` with reason.

---

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md` | Replace step 3 fallback prose; update code-explorer compliance table row | P1 |
| `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md` | Replace step 1 fallback prose; update planner compliance table row | P1 |
| `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md` | Replace fallback prose in Blueprint Requirements; update code-architect table row | P1 |
| `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md` | Replace both coupled sentences in opening paragraph; update tdd-guide compliance row | P1 |
| `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md` | Replace two fallback clauses (steps 2 and 4); update quality review and security review rows | P1 |
| `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` | Replace fallback clause in step 3; update documentation docking row only | P1 |
| `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` | Add new "Delegation Contract" section with write-order | P2 |
| `scripts/validate-kaola-workflow-contracts.js` | Add negative + positive validator assertions | P3 |
| `plugins/kaola-workflow-gitlab/skills/kaola-workflow-research/SKILL.md` | Mirror of GitHub research edits | P4 |
| `plugins/kaola-workflow-gitlab/skills/kaola-workflow-ideation/SKILL.md` | Mirror of GitHub ideation edits | P4 |
| `plugins/kaola-workflow-gitlab/skills/kaola-workflow-plan/SKILL.md` | Mirror of GitHub plan edits | P4 |
| `plugins/kaola-workflow-gitlab/skills/kaola-workflow-execute/SKILL.md` | Mirror of GitHub execute edits | P4 |
| `plugins/kaola-workflow-gitlab/skills/kaola-workflow-review/SKILL.md` | Mirror of GitHub review edits | P4 |
| `plugins/kaola-workflow-gitlab/skills/kaola-workflow-finalize/SKILL.md` | Mirror of GitHub finalize edits | P4 |
| `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md` | Mirror of Delegation Contract section (no PR/pull-request language) | P4 |
| `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` | Add inline negative + positive assertions | P5 |

---

## 1. Per-File Edit Table

### 1a. `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md`

**Step 3 (line 37) — code-explorer delegation gate**

OLD (exact):
```
3. Inspect relevant files, tests, config, docs, and issues. Use the `code-explorer` Codex agent role when subagents are available; otherwise perform the same read-only research in the current session.
```

NEW:
```
3. Inspect relevant files, tests, config, docs, and issues. Use the `code-explorer` Codex agent role for this step. Record status as `subagent-invoked` in the compliance ledger if delegation occurred, `local-fallback-explicit` if the user explicitly authorized local execution, or `local-fallback-tool-unavailable` if the subagent tooling was unavailable.
```

Negative needle: `'when subagents are available; otherwise perform the same read-only research'`

**Step 4 (line 38) — docs-lookup line**

NO CHANGE. The step-applicability gate (`only when current external behavior matters; otherwise record why docs lookup is N/A`) is preserved. `N/A` means "step did not apply" and is already in the compliance table. No new negative needle needed.

**Compliance table in Phase File template — code-explorer row only**

OLD:
```
| code-explorer | invoked | .cache/code-explorer.md | |
```

NEW:
```
| code-explorer | subagent-invoked/local-fallback-explicit/local-fallback-tool-unavailable | .cache/code-explorer.md | |
```

Leave the `docs-lookup` row as-is; the `/N/A` suffix already covers the applicability gate.

---

### 1b. `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md`

**Step 1 (line 32) — planner delegation gate**

OLD (exact):
```
1. Use the `planner` Codex agent role when subagents are available; otherwise perform the same strategy analysis in the current session.
```

NEW:
```
1. Use the `planner` Codex agent role for this step. Record status as `subagent-invoked` in the compliance ledger if delegation occurred, `local-fallback-explicit` if the user explicitly authorized local execution, or `local-fallback-tool-unavailable` if the subagent tooling was unavailable.
```

Negative needle: `'when subagents are available; otherwise perform the same strategy analysis'`

**Compliance table — planner row**

OLD:
```
| planner | invoked | .cache/planner.md | |
```

NEW:
```
| planner | subagent-invoked/local-fallback-explicit/local-fallback-tool-unavailable | .cache/planner.md | |
```

The `advisor ideation gate` row is NOT delegation-gated (it's a self-review step, not a subagent role). Leave it as `invoked`.

---

### 1c. `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md`

**Blueprint Requirements paragraph (line 37) — code-architect delegation gate**

OLD (exact):
```
Use the `code-architect` Codex agent role when subagents are available; otherwise produce the same blueprint in the current session. Consult the strongest available expert model/profile for the session or perform the same plan self-review locally, then save it to `.cache/advisor-plan.md`. If gaps are found, revise the blueprint before execution.
```

NEW:
```
Use the `code-architect` Codex agent role for the blueprint step. Record status as `subagent-invoked` in the compliance ledger if delegation occurred, `local-fallback-explicit` if the user explicitly authorized local execution, or `local-fallback-tool-unavailable` if the subagent tooling was unavailable. Consult the strongest available expert model/profile for the session or perform the same plan self-review locally, then save it to `.cache/advisor-plan.md`. If gaps are found, revise the blueprint before execution.
```

Negative needle: `'when subagents are available; otherwise produce the same blueprint'`

**Compliance table — code-architect row**

OLD:
```
| code-architect | invoked | .cache/architect.md | |
```

NEW:
```
| code-architect | subagent-invoked/local-fallback-explicit/local-fallback-tool-unavailable | .cache/architect.md | |
```

The `advisor plan gate` and `blueprint revisions` rows are not delegation-gated. Leave them as `invoked/N/A`.

---

### 1d. `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md`

**Opening paragraph (line 8) — two coupled sentences, both must be replaced**

Note: Confirmed that line 8 contains BOTH target phrases: `"when subagents are available"` (in the first sentence) AND `"Use the current Codex session as the fallback executor"` (in the second sentence). Both are in the same paragraph and are replaced together.

OLD (exact — the entire last two sentences of the opening paragraph):
```
Phase 4 implements the plan. Prefer the `tdd-guide` Codex agent role for assigned implementation tasks when subagents are available. Use the current Codex session as the fallback executor when session policy, availability, or user direction prevents delegation.
```

NEW:
```
Phase 4 implements the plan. Use the `tdd-guide` Codex agent role for assigned implementation tasks. Record status as `subagent-invoked` in the compliance ledger if delegation occurred, `local-fallback-explicit` if the user explicitly authorized local execution, or `local-fallback-tool-unavailable` if the subagent tooling was unavailable.
```

Negative needles (two separate assertions):
1. `'when subagents are available'` (covers execute)
2. `'Use the current Codex session as the fallback executor'`

**Compliance table — tdd-guide executor rows**

OLD example row:
```
| tdd-guide executor task 1 | pending | | |
```

NEW (update the `pending` placeholder to teach the delegation vocab; runtime fill replaces it per task):
```
| tdd-guide executor task 1 | subagent-invoked/local-fallback-explicit/local-fallback-tool-unavailable | | |
```

---

### 1e. `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md`

Note: This file does NOT contain `"when subagents are available"`. It has two distinct fallback clauses.

**Review step 2 (line 33) — code-reviewer delegation gate**

OLD (exact):
```
2. Use the `code-reviewer` Codex agent role or `codex review` when useful for a detached review pass; otherwise perform a review stance locally.
```

NEW:
```
2. Use the `code-reviewer` Codex agent role or `codex review` for a detached review pass. Record status as `subagent-invoked` in the compliance ledger if delegation occurred, `local-fallback-explicit` if the user explicitly authorized local execution, or `local-fallback-tool-unavailable` if the subagent tooling was unavailable.
```

Negative needle: `'otherwise perform a review stance locally'`

**Review step 4 (line 35) — security-reviewer delegation gate**

OLD (exact):
```
4. Run a security-sensitive file scan. If auth, payments, user data, filesystem access, external APIs, or secrets changed, use the `security-reviewer` Codex agent role or perform the same security review locally.
```

NEW:
```
4. Run a security-sensitive file scan. If auth, payments, user data, filesystem access, external APIs, or secrets changed, use the `security-reviewer` Codex agent role. Record status as `subagent-invoked` in the compliance ledger if delegation occurred, `local-fallback-explicit` if the user explicitly authorized local execution, or `local-fallback-tool-unavailable` if the subagent tooling was unavailable.
```

Negative needle: `'or perform the same security review locally'`

**Compliance table — quality review and security review rows**

OLD:
```
| quality review | invoked | .cache/code-reviewer.md | |
| security review | invoked/N/A | .cache/security-reviewer.md or file-risk scan | reason if N/A |
```

NEW:
```
| quality review | subagent-invoked/local-fallback-explicit/local-fallback-tool-unavailable | .cache/code-reviewer.md | |
| security review | subagent-invoked/local-fallback-explicit/local-fallback-tool-unavailable/N/A | .cache/security-reviewer.md or file-risk scan | reason if N/A |
```

The `review-fix executors` row is also delegation-gated. Update it:

OLD:
```
| review-fix executors | invoked/N/A | .cache/review-fix-*.md | reason if N/A |
```

NEW:
```
| review-fix executors | subagent-invoked/local-fallback-explicit/local-fallback-tool-unavailable/N/A | .cache/review-fix-*.md | reason if N/A |
```

---

### 1f. `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md`

Note: The phrase here is `"and subagents are available"` (variant of `"when subagents are available"`).

**Step 3 (line 37) — doc-updater delegation gate**

OLD (exact):
```
3. Documentation update: use the `doc-updater` Codex agent role when documentation changes are needed and subagents are available; otherwise update docs in the current session. Pass `Working directory: ${ACTIVE_WORKTREE_PATH}` to the doc-updater agent. Update docs only when behavior, API, setup, architecture, env, roadmap, or user-facing workflow changed. Save output to `.cache/doc-updater.md` or write a no-impact reason.
```

NEW:
```
3. Documentation update: use the `doc-updater` Codex agent role when documentation changes are needed. Record status as `subagent-invoked` in the compliance ledger if delegation occurred, `local-fallback-explicit` if the user explicitly authorized local execution, or `local-fallback-tool-unavailable` if the subagent tooling was unavailable. Pass `Working directory: ${ACTIVE_WORKTREE_PATH}` to the doc-updater agent. Update docs only when behavior, API, setup, architecture, env, roadmap, or user-facing workflow changed. Save output to `.cache/doc-updater.md` or write a no-impact reason.
```

Negative needle: `'subagents are available; otherwise update docs'`
(This covers both the "and" variant and "otherwise update docs" in one substring. The leading portion `'and subagents are available'` alone is also usable as a needle.)

**Compliance table in Summary File — selective update**

Only update the `doc-updater`-related row. The procedural rows (`final validation`, `documentation docking`, `roadmap refresh`, `archive completed folder`, `final commit and push`) are not subagent-delegated and must NOT be updated to the new delegation vocab.

The current compliance table contains no explicit `doc-updater` row — `documentation docking` in the table refers to the docking check step (step 4), not the doc-updater agent (step 3). The implementer should add a `doc-updater` row to the finalize compliance table:

ADD row to the compliance table:
```
| doc-updater | subagent-invoked/local-fallback-explicit/local-fallback-tool-unavailable/N/A | .cache/doc-updater.md | reason if N/A |
```

This should be inserted before or after the `documentation docking` row. Leave all other rows as `invoked`.

---

### 1g. `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md`

**New "Delegation Contract" section to INSERT** (between "## Autonomy Policy" and "## Agent Issue Selection (Required Before Startup)")

```markdown
## Delegation Contract

Before proceeding, the agent must establish a session delegation policy with the user. Subagent delegation is not assumed; it requires explicit authorization.

**Skip this step if `delegation_policy:` is already set in `workflow-state.md`.**

Ask the user once at startup:

> "This workflow uses Codex subagent roles (code-explorer, planner, code-architect, tdd-guide, code-reviewer, security-reviewer, doc-updater) for delegated work. How should delegation be handled?
>
> - **delegate** — invoke subagent roles when available (records `subagent-invoked` in each compliance ledger)
> - **local-authorized** — execute locally with your explicit authorization (records `local-fallback-explicit`)
> - **tool-unavailable** — subagent tooling is unavailable; execute locally (records `local-fallback-tool-unavailable`)
>
> Please confirm your delegation policy."

**Write order** — three steps, in order:

1. Ask the user and receive their confirmation (hold policy in-session).
2. Call the startup script (this creates `workflow-state.md`; see Startup section below).
3. After startup succeeds and `workflow-state.md` exists, patch the delegation policy into the file:

```bash
printf '\ndelegation_policy: %s\n' "$KAOLA_DELEGATION_POLICY" >> "kaola-workflow/${PICK_NEXT_PROJECT}/workflow-state.md"
```

Where `KAOLA_DELEGATION_POLICY` is `delegate`, `local-authorized`, or `tool-unavailable` based on the user's response.

Do not re-ask during the session unless the user explicitly changes policy or `workflow-state.md` is absent.
```

---

## 2. Compliance Ledger Template Update

The tables in each phase's `## Required Agent Compliance` section are updated for delegation-gated rows only:

| Phase | Rows Updated | Rows Left as-is |
|-------|-------------|-----------------|
| research | `code-explorer` | `docs-lookup` (already has N/A) |
| ideation | `planner` | `advisor ideation gate` (self-review, not subagent) |
| plan | `code-architect` | `advisor plan gate`, `blueprint revisions` |
| execute | `tdd-guide executor task N` | (none left) |
| review | `quality review`, `security review`, `review-fix executors` | (none) |
| finalize | add `doc-updater` row | `final validation`, `documentation docking`, `roadmap refresh`, `archive completed folder`, `final commit and push` |

The validator enforces presence of the new vocab strings. The updated template rows satisfy the positive assertions incidentally.

---

## 3. Validator Assertion List

File: `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow/scripts/validate-kaola-workflow-contracts.js`

**Insert point**: After line 95 (`assertIncludes ... 'metadata captured before archive'`), before the `const sharedScripts = [...]` block.

### Negative assertions (old prose removal)

```javascript
// Issue #77: typed-acknowledgement delegation gate — remove ungated fallback language
assertNotIncludes(`${pluginRoot}/skills/kaola-workflow-research/SKILL.md`, 'when subagents are available; otherwise perform the same read-only research');
assertNotIncludes(`${pluginRoot}/skills/kaola-workflow-ideation/SKILL.md`, 'when subagents are available; otherwise perform the same strategy analysis');
assertNotIncludes(`${pluginRoot}/skills/kaola-workflow-plan/SKILL.md`, 'when subagents are available; otherwise produce the same blueprint');
assertNotIncludes(`${pluginRoot}/skills/kaola-workflow-execute/SKILL.md`, 'when subagents are available');
assertNotIncludes(`${pluginRoot}/skills/kaola-workflow-execute/SKILL.md`, 'Use the current Codex session as the fallback executor');
assertNotIncludes(`${pluginRoot}/skills/kaola-workflow-review/SKILL.md`, 'otherwise perform a review stance locally');
assertNotIncludes(`${pluginRoot}/skills/kaola-workflow-review/SKILL.md`, 'or perform the same security review locally');
assertNotIncludes(`${pluginRoot}/skills/kaola-workflow-finalize/SKILL.md`, 'subagents are available; otherwise update docs');
```

### Positive assertions (new vocab presence)

```javascript
// Issue #77: typed-acknowledgement delegation gate — require new status vocabulary in all phase skills + next
const delegationSkills = [
  'kaola-workflow-research',
  'kaola-workflow-ideation',
  'kaola-workflow-plan',
  'kaola-workflow-execute',
  'kaola-workflow-review',
  'kaola-workflow-finalize',
  'kaola-workflow-next',
];
for (const skill of delegationSkills) {
  assertIncludes(`${pluginRoot}/skills/${skill}/SKILL.md`, 'subagent-invoked');
  assertIncludes(`${pluginRoot}/skills/${skill}/SKILL.md`, 'local-fallback-explicit');
  assertIncludes(`${pluginRoot}/skills/${skill}/SKILL.md`, 'local-fallback-tool-unavailable');
}
```

Note: `kaola-workflow-fast` is excluded — confirmed zero fallback phrases in that file.

---

## 4. GitLab Mirror Checklist

### GitLab skill files confirmed to exist (9 total):

- `plugins/kaola-workflow-gitlab/skills/kaola-workflow-research/SKILL.md`
- `plugins/kaola-workflow-gitlab/skills/kaola-workflow-ideation/SKILL.md`
- `plugins/kaola-workflow-gitlab/skills/kaola-workflow-plan/SKILL.md`
- `plugins/kaola-workflow-gitlab/skills/kaola-workflow-execute/SKILL.md`
- `plugins/kaola-workflow-gitlab/skills/kaola-workflow-review/SKILL.md`
- `plugins/kaola-workflow-gitlab/skills/kaola-workflow-finalize/SKILL.md`
- `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md`
- `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md` (not affected)
- `plugins/kaola-workflow-gitlab/skills/kaola-workflow-fast/SKILL.md` (confirmed clean, not affected)

### Verification

The GitLab phase skill files (research, ideation, plan, execute, review, finalize) are byte-equivalent in the affected paragraphs to their GitHub counterparts. The same OLD text appears verbatim in each.

The GitLab `kaola-workflow-next/SKILL.md` does not have a Delegation Contract section (same gap as GitHub edition).

### GitLab-specific constraint

The GitLab validator enforces `assertNoForbidden` which rejects `pull request` (case-insensitive) in any skill file. The Delegation Contract section must NOT use "pull request" — use "merge request" or forge-agnostic language ("Codex subagent roles") instead.

The draft Delegation Contract text in section 1g uses `"Codex subagent roles"` with no forge-specific forge terms. It is safe. For the GitLab edition of `kaola-workflow-next/SKILL.md`, the Delegation Contract text is identical to the GitHub edition.

### Identical edits apply to each GitLab skill file

Apply sections 1a through 1g verbatim to the GitLab counterparts. No structural differences in the affected paragraphs.

### GitLab validator additions

File: `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`

**Insert point**: After line 144 (`for (const skill of listFiles...) { assert(!read(skill).includes("*/kaola-workflow/*/scripts/kaola-gitlab"), ...); }`), before `for (const file of listFiles(pluginRoot + '/scripts', ...))`.

```javascript
// Issue #77: typed-acknowledgement delegation gate — GitLab skills
const gitlabSkillsBase = `${pluginRoot}/skills`;
const delegationNegativeChecks = [
  [`${gitlabSkillsBase}/kaola-workflow-research/SKILL.md`, 'when subagents are available; otherwise perform the same read-only research'],
  [`${gitlabSkillsBase}/kaola-workflow-ideation/SKILL.md`, 'when subagents are available; otherwise perform the same strategy analysis'],
  [`${gitlabSkillsBase}/kaola-workflow-plan/SKILL.md`, 'when subagents are available; otherwise produce the same blueprint'],
  [`${gitlabSkillsBase}/kaola-workflow-execute/SKILL.md`, 'when subagents are available'],
  [`${gitlabSkillsBase}/kaola-workflow-execute/SKILL.md`, 'Use the current Codex session as the fallback executor'],
  [`${gitlabSkillsBase}/kaola-workflow-review/SKILL.md`, 'otherwise perform a review stance locally'],
  [`${gitlabSkillsBase}/kaola-workflow-review/SKILL.md`, 'or perform the same security review locally'],
  [`${gitlabSkillsBase}/kaola-workflow-finalize/SKILL.md`, 'subagents are available; otherwise update docs'],
];
for (const [file, needle] of delegationNegativeChecks) {
  assert(!read(file).includes(needle), file + ' must not include: ' + needle);
}

const gitlabDelegationSkills = [
  'kaola-workflow-research',
  'kaola-workflow-ideation',
  'kaola-workflow-plan',
  'kaola-workflow-execute',
  'kaola-workflow-review',
  'kaola-workflow-finalize',
  'kaola-workflow-next',
];
for (const skill of gitlabDelegationSkills) {
  const skillFile = `${gitlabSkillsBase}/${skill}/SKILL.md`;
  assert(read(skillFile).includes('subagent-invoked'), skillFile + ' must include: subagent-invoked');
  assert(read(skillFile).includes('local-fallback-explicit'), skillFile + ' must include: local-fallback-explicit');
  assert(read(skillFile).includes('local-fallback-tool-unavailable'), skillFile + ' must include: local-fallback-tool-unavailable');
}
```

---

## 5. Build Sequence

### Group 1 — GitHub SKILL.md edits (6 phase skills)

Steps 1-6 are independent of each other and can be executed in any order or in parallel.

1. Edit `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md` — step 3 prose + code-explorer compliance table row
2. Edit `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md` — step 1 prose + planner compliance table row
3. Edit `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md` — blueprint paragraph prose + code-architect table row
4. Edit `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md` — opening paragraph (two coupled sentences replaced together) + tdd-guide compliance row
5. Edit `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md` — step 2 and step 4 fallback clauses + quality review, security review, review-fix rows
6. Edit `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` — step 3 fallback clause + add doc-updater compliance row

### Group 2 — kaola-workflow-next Delegation Contract

7. Edit `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` — add "Delegation Contract" section between "Autonomy Policy" and "Agent Issue Selection"

Depends on: vocabulary being finalized in Group 1 (the section must use the same four vocab terms).

### Group 3 — Compliance Ledger Vocab Notes

No separate file changes required; the table updates are part of the SKILL.md edits in Groups 1 and 2.

### Group 4 — GitHub Validator Assertions

8. Edit `scripts/validate-kaola-workflow-contracts.js` — add negative and positive assertions after line 95

Depends on: Groups 1 and 2 (assertions must match final prose).

### Group 5 — GitLab SKILL.md edits (6 phase skills + next)

9. Edit `plugins/kaola-workflow-gitlab/skills/kaola-workflow-research/SKILL.md` — mirror of step 1
10. Edit `plugins/kaola-workflow-gitlab/skills/kaola-workflow-ideation/SKILL.md` — mirror of step 2
11. Edit `plugins/kaola-workflow-gitlab/skills/kaola-workflow-plan/SKILL.md` — mirror of step 3
12. Edit `plugins/kaola-workflow-gitlab/skills/kaola-workflow-execute/SKILL.md` — mirror of step 4
13. Edit `plugins/kaola-workflow-gitlab/skills/kaola-workflow-review/SKILL.md` — mirror of step 5
14. Edit `plugins/kaola-workflow-gitlab/skills/kaola-workflow-finalize/SKILL.md` — mirror of step 6
15. Edit `plugins/kaola-workflow-gitlab/skills/kaola-workflow-next/SKILL.md` — mirror of step 7 (no PR/pull-request language)

Steps 9-15 depend on Groups 1-2 being finalized (mirror must match GitHub edition).

### Group 6 — GitLab Validator Assertions

16. Edit `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` — add inline assertions after line 144

Depends on: Group 5.

---

## 6. Completeness Check

**C1. RESOLVED — kaola-workflow-fast scope.**
Confirmed by grep: neither `plugins/kaola-workflow/skills/kaola-workflow-fast/SKILL.md` nor `plugins/kaola-workflow-gitlab/skills/kaola-workflow-fast/SKILL.md` contains `subagents`, `fallback`, or `otherwise`. No changes required. Excluded from validator `delegationSkills` array.

**C2. RESOLVED — writeState field preservation.**
Confirmed by reading `scripts/kaola-workflow-claim.js` lines 194-237: `writeState()` writes from an explicit template and does NOT preserve unknown fields. `updateState()` does a text-level update and preserves content. The Delegation Contract section specifies the correct write order: (1) ask user, (2) call startup (creates `workflow-state.md` via `writeState`), (3) append `delegation_policy:` via a follow-up append/patch. The blueprint's "Write order" in section 1g reflects this.

**C3. RESOLVED — GitLab assertNoForbidden fence.**
The Delegation Contract text uses "Codex subagent roles" and contains no "pull request", "PR", "GitHub", or other forbidden terms. Both the GitHub and GitLab editions of `kaola-workflow-next/SKILL.md` can receive the identical Delegation Contract section.

**C4. execute/SKILL.md compliance table `tdd-guide executor task N` rows.**
The template shows one row (`task 1`) as a placeholder; runtime adds N rows for N tasks. After replacing `pending` with the delegation vocab, agents recording per-task status must write one of the four vocab values after task completion. This is behavioral guidance (agents learn from the template), not a structural blocker. No separate fix needed.

**C5. `advisor ideation gate` and `advisor plan gate` rows in compliance tables.**
These rows represent the expert-advisor consultation gate (strongest-model self-review), not a delegated subagent invocation. They are correctly left as `invoked` rather than updated to delegation vocab. Phase 4 implementer should not update these rows.

**C6. Test suite must pass after all edits.**
The implementer must run both validators after completing all 16 steps:
- `node scripts/validate-kaola-workflow-contracts.js` (or `npm run test:kaola-workflow:codex`)
- `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` (or `npm run test:kaola-workflow:gitlab`)

Both must exit with success messages before the implementation phase is complete.
