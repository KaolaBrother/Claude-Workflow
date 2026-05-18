# Code Architect — Issue #79 Blueprint

## Design Decisions

- **No new scripts**: All changes are prose markdown edits plus validator JS additions. Zero new shared-scripts mirror entries.
- **Redirect block extraction anchor**: Each init file contains a fenced ` ```markdown ` block under a heading `## Step N — Create \`AGENTS.md\`` that opens with `# AGENTS.md`. Validators extract the redirect block by reading from the first ` ```markdown ` fence under that heading to the closing ` ``` ` fence.
- **Byte-equality check owner**: `scripts/validate-kaola-workflow-contracts.js` (root) owns the cross-forge AGENTS.md redirect byte-equality check.
- **CLAUDE.md template expansion in Codex SKILL**: The GitHub Codex SKILL.md AGENTS.md addendum (~20 lines) is replaced by the full ~80-line CLAUDE.md template embedded in Required Behavior, plus the redirect block.
- **Non-Negotiable Rules merge policy for existing repos**: Step 2 prose instructs: "If a `## Non-Negotiable Rules` section already exists, replace it in-place with the canonical 5 bullets."
- **Forge substitution table is locked**.

---

## Locked Forge Substitution Table

| Token in GitHub version | Token in GitLab version |
|-------------------------|------------------------|
| `gh` (standalone) | `glab` |
| `GitHub` | `GitLab` |
| `GitHub issues` | `GitLab issues` |
| `pull request` / `PR` | `merge request` / `MR` |
| `watch-pr` | `watch-mr` |
| `kaola-workflow-claim.js` | `kaola-gitlab-workflow-claim.js` |
| `kaola-workflow-roadmap.js` | `kaola-gitlab-workflow-roadmap.js` |

AGENTS.md redirect block: zero forge tokens — passes `assertNoForbidden` as-is.

---

## Files to Create

| File | Purpose | Key Interfaces |
|------|---------|----------------|
| `AGENTS.md` | Repo root dogfood AGENTS.md, pure forced redirect to CLAUDE.md | Verbatim canonical redirect block; second non-blank line = `> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**` |

---

## Files to Modify

| File | Specific Changes | Why |
|------|-----------------|-----|
| `CLAUDE.md` | Non-Negotiable Rules: drop 2 bullets, add 1 (Goal-driven execution). Result: exactly 5 bullets. | Dogfood the canonical 5-bullet contract in this repo. |
| `commands/workflow-init.md` | (a) Replace 6-bullet Non-Negotiable Rules in CLAUDE.md template with canonical 5 bullets. (b) Insert new Step 3 for AGENTS.md. (c) Renumber old Step 3 → Step 4, old Step 4 → Step 5. | GitHub Claude command must produce correct AGENTS.md. |
| `plugins/kaola-workflow-gitlab/commands/workflow-init.md` | Same as above but with GitLab forge tokens. AGENTS.md redirect block byte-identical to GitHub version. | GitLab Claude command must produce correct AGENTS.md. |
| `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md` | (a) Remove Required Behavior item 4 ("Do not create or edit CLAUDE.md."). (b) Add new Required Behavior item 4: create/update CLAUDE.md with full embedded template (GitHub tokens). (c) Replace 13-bullet AGENTS.md Addendum with canonical redirect block. (d) Ensure `Active folder lifecycle` phrase and all 6 durable-state tokens appear in the CLAUDE.md template section. (e) Ensure `.codex/agents/kaola-workflow/` bullet appears in CLAUDE.md template. | Codex GitHub skill must produce correct CLAUDE.md + AGENTS.md. |
| `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md` | Same as above but with GitLab forge tokens. AGENTS.md redirect block byte-identical. | Codex GitLab skill must produce correct CLAUDE.md + AGENTS.md. |
| `scripts/validate-workflow-contracts.js` | Add: (1) `assert(exists('AGENTS.md'))`. (2) `assertIncludes('AGENTS.md', '> **MANDATORY...')`. (3) `assertIncludes('commands/workflow-init.md', '> **MANDATORY...')`. | Validate dogfood AGENTS.md and that the GitHub command embeds the redirect. Must be byte-synced to mirror. |
| `plugins/kaola-workflow/scripts/validate-workflow-contracts.js` | Byte-identical mirror of root copy above. | Shared-scripts contract requires identity. |
| `scripts/validate-kaola-workflow-contracts.js` | Add: (1) `assertIncludes(SKILL.md, '> **MANDATORY...')`. (2) `assertNotIncludes(SKILL.md, 'Do not create or edit CLAUDE.md')`. (3) Existing `assertConcept` for 6 durable-state tokens already covers new location. (4) Cross-forge byte-equality check. | Enforce new Codex SKILL contracts and cross-forge redirect identity. |
| `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` | Add: (1) `assertNotIncludes(GitLab SKILL.md, 'Do not create or edit CLAUDE.md')`. (2) `assertIncludes(GitLab SKILL.md, '> **MANDATORY...')`. (3) `assertConcept(GitLab SKILL.md, 'durable state contract', [6 tokens])`. (4) Add `assertConcept` helper function. | Close durable-state gap in GitLab SKILL, enforce redirect. |

---

## Build Sequence

1. **Lock canonical text** — confirm 5-bullet Non-Negotiable Rules and AGENTS.md redirect block verbatim. No files written.
2. **Dogfood: update `CLAUDE.md`** — surgical edit to replace 6-bullet Non-Negotiable Rules with 5-bullet canonical set. Verify < 200 lines.
3. **Dogfood: create `AGENTS.md`** — write verbatim canonical redirect block to repo root.
4. **Update `commands/workflow-init.md`** — (a) update template Non-Negotiable Rules; (b) insert Step 3 with idempotency prose + worked migration example + redirect block; (c) renumber Steps 3→4, 4→5.
5. **Update `plugins/kaola-workflow-gitlab/commands/workflow-init.md`** — same as step 4 with GitLab substitutions.
6. **Update GitHub Codex SKILL.md** — remove restriction, add CLAUDE.md template, replace addendum with redirect block.
7. **Update GitLab Codex SKILL.md** — same as step 6 with GitLab substitutions.
8. **Update `scripts/validate-workflow-contracts.js`** — add 3 assertions. Copy to mirror.
9. **Update `scripts/validate-kaola-workflow-contracts.js`** — add assertions + cross-forge byte-equality check.
10. **Update GitLab validator** — add `assertConcept` helper + 3 new assertions.
11. **Run all validators** — `node scripts/validate-workflow-contracts.js`, `node scripts/validate-kaola-workflow-contracts.js`, `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`.
12. **Run walkthrough** — `node scripts/simulate-workflow-walkthrough.js`.

---

## Parallelization Plan

| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | Tasks 1, 2 (CLAUDE.md + AGENTS.md dogfood) | Disjoint write sets |
| B | Task 3 then Task 5 (GitHub command → GitHub SKILL) | B2 depends on B1's template; B parallel with C |
| C | Task 4 then Task 6 (GitLab command → GitLab SKILL) | C2 depends on C1's template; C parallel with B |
| D | Task 7 (validators) — Tasks 8+9 run in parallel after A–C | Disjoint validator files |
| E | Tasks 10, 11 (run validators + walkthrough) | Sequential: validators first |

---

## Task List

### Task 1 — Dogfood: update `CLAUDE.md` Non-Negotiable Rules
- File: `CLAUDE.md`
- Write set: `CLAUDE.md` only
- Depends on: nothing
- Parallel group: A
- Action: MODIFY (surgical)
- Implement:
  - Remove bullet: `Preserve user changes; never revert unrelated work without explicit request.`
  - Remove bullet: `Verify with the relevant command before claiming completion.`
  - Add fifth bullet after "Make surgical changes": `Goal-driven execution: Define verifiable success criteria before starting. Prefer write-the-failing-test-first for bugs and features. Loop until criteria pass; don't declare done on weak signals.`
  - Final order: Think before coding / Read before writing / Keep it simple / Make surgical changes / Goal-driven execution.
  - Verify `wc -l CLAUDE.md` < 200.
- Validate: `node scripts/validate-workflow-contracts.js`

### Task 2 — Dogfood: create `AGENTS.md`
- File: `AGENTS.md` (new)
- Write set: `AGENTS.md` only
- Depends on: nothing
- Parallel group: A
- Action: CREATE
- Implement:
  - Write verbatim canonical redirect block (from issue spec Design Contract).
  - Verify second non-blank line = `> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**`
- Validate: `node scripts/validate-workflow-contracts.js` (after Task 7 adds the check)

### Task 3 — Update `commands/workflow-init.md` (GitHub Claude command)
- File: `commands/workflow-init.md`
- Write set: `commands/workflow-init.md` only
- Depends on: Task 1 (canonical bullet text locked)
- Parallel group: B (first)
- Action: MODIFY (three-part)
- Implement:
  - **Part A**: Replace 6-bullet Non-Negotiable Rules in CLAUDE.md template with canonical 5 bullets.
  - **Part B**: Insert new `## Step 3 — Create \`AGENTS.md\`` section:
    - Idempotency rule: check second non-blank line for conformance sentinel
    - If conforming → no-op; if missing → write; if non-conforming → prepend + `---` + original + note
    - Worked migration example (two-divider shape)
    - Canonical redirect block in ` ```markdown ` fence
  - **Part C**: Renumber old Step 3 → Step 4, old Step 4 → Step 5. Update Step 5 summary to mention AGENTS.md.
  - Verify 6 durable-state tokens still present in template body.
- Validate: `node scripts/validate-workflow-contracts.js`

### Task 4 — Update `plugins/kaola-workflow-gitlab/commands/workflow-init.md` (GitLab Claude command)
- File: `plugins/kaola-workflow-gitlab/commands/workflow-init.md`
- Write set: the file only
- Depends on: Task 3 (mirrors structure)
- Parallel group: C (first, parallel with B)
- Action: MODIFY (same three-part as Task 3)
- Implement:
  - Same as Task 3 with GitLab substitutions in CLAUDE.md template section only.
  - AGENTS.md redirect block byte-identical to GitHub version (zero forge tokens).
  - Verify zero `\bgh\b`, `GitHub`, `github.com`, `PR URL`, `PR number`, `pull request` in the redirect block, idempotency prose, Non-Negotiable Rules.
- Validate: `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`

### Task 5 — Update `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md` (Codex GitHub)
- File: `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md`
- Write set: the file only
- Depends on: Task 3 (CLAUDE.md template text must match after substitution)
- Parallel group: B (second, after Task 3)
- Action: MODIFY (structural replacement)
- Implement:
  - Remove Required Behavior item 4: `4. Do not create or edit CLAUDE.md.`
  - Renumber items 5→4, 6→5, 7→6.
  - Insert new item 4: "Create or update `CLAUDE.md`" with full embedded template matching `commands/workflow-init.md` (GitHub tokens, byte-identical after substitution).
    - Template must include: all 6 durable-state tokens, `Active folder lifecycle` phrase, `.codex/agents/kaola-workflow/` path.
  - Replace `## AGENTS.md Addendum` (13 bullets) with `## Create \`AGENTS.md\`` section:
    - Same idempotency prose as Task 3 Step 3
    - Canonical redirect block in ` ```markdown ` fence (byte-identical to all other init files)
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 6 — Update `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md` (Codex GitLab)
- File: `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md`
- Write set: the file only
- Depends on: Tasks 4 and 5 (GitLab template from Task 4, structure from Task 5)
- Parallel group: C (second, parallel with B's Task 5)
- Action: MODIFY (same structural replacement as Task 5)
- Implement:
  - Same as Task 5 with GitLab forge substitutions in CLAUDE.md template.
  - AGENTS.md redirect block byte-identical.
  - Verify zero GitHub-specific tokens in redirect block, idempotency prose, Non-Negotiable Rules.
- Validate: `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`

### Task 7 — Update `scripts/validate-workflow-contracts.js` + mirror
- File: `scripts/validate-workflow-contracts.js`
- Mirror: `plugins/kaola-workflow/scripts/validate-workflow-contracts.js`
- Write set: both files
- Depends on: Tasks 2 and 3
- Parallel group: D
- Action: MODIFY (add 3 assertions)
- Implement:
  - Add after existing `assertIncludes('CLAUDE.md', ...)` assertions:
    ```javascript
    assert(exists('AGENTS.md'), 'AGENTS.md must exist at repo root (dogfood redirect)');
    assertIncludes('AGENTS.md', '> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**');
    assertIncludes('commands/workflow-init.md', '> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**');
    ```
  - Copy entire file byte-for-byte to `plugins/kaola-workflow/scripts/validate-workflow-contracts.js`.
- Validate: `node scripts/validate-workflow-contracts.js && node scripts/validate-kaola-workflow-contracts.js`

### Task 8 — Update `scripts/validate-kaola-workflow-contracts.js`
- File: `scripts/validate-kaola-workflow-contracts.js`
- Write set: this file only (no mirror for this validator)
- Depends on: Tasks 5 and 6
- Parallel group: D (parallel with Task 9)
- Action: MODIFY (add assertions + cross-forge byte-equality check)
- Implement:
  - After `assertIncludes(...'Active folder lifecycle')` (line 89), add:
    ```javascript
    assertIncludes(`${pluginRoot}/skills/kaola-workflow-init/SKILL.md`, '> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**');
    assertNotIncludes(`${pluginRoot}/skills/kaola-workflow-init/SKILL.md`, 'Do not create or edit CLAUDE.md');
    ```
  - Existing `assertConcept` for 6 durable-state tokens at lines 183-190 already checks the SKILL.md file globally — no path change needed; tokens now in CLAUDE.md template section.
  - Add cross-forge byte-equality extraction function + check (see `extractRedirectBlock` implementation above) before the final `console.log`.
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 9 — Update `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`
- File: `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`
- Write set: this file only
- Depends on: Task 6
- Parallel group: D (parallel with Task 8)
- Action: MODIFY (add helper + 3 assertions)
- Implement:
  - Add `assertConcept` helper function (copy pattern from `scripts/validate-kaola-workflow-contracts.js`) after `assertNoForbidden` definition.
  - Add near the end (before assertNoForbidden results loop or final console.log):
    ```javascript
    assertNotIncludes(`${gitlabSkillsBase}/kaola-workflow-init/SKILL.md`, 'Do not create or edit CLAUDE.md');
    assertIncludes(`${gitlabSkillsBase}/kaola-workflow-init/SKILL.md`, '> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**');
    assertConcept(`${gitlabSkillsBase}/kaola-workflow-init/SKILL.md`, 'GitLab init durable state contract', [
      'kaola-workflow/.roadmap/issue-*.md',
      'do not purge',
      'kaola-workflow/{project}/',
      'workflow-state.md',
      'fast-summary.md',
      '.cache/'
    ]);
    ```
  - Verify `assertNoForbidden` at lines 43-57 runs on GitLab SKILL.md — the redirect block will be covered automatically.
- Validate: `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`

### Task 10 — Run all validators
- Depends on: Tasks 7, 8, 9
- Parallel group: E (sequential)
- Commands:
  ```
  node scripts/validate-workflow-contracts.js
  node scripts/validate-kaola-workflow-contracts.js
  node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js
  ```

### Task 11 — Run walkthrough simulation
- Depends on: Task 10
- Parallel group: E (sequential after Task 10)
- Command: `node scripts/simulate-workflow-walkthrough.js`

---

## Out of Scope

- `scripts/kaola-workflow-claim.js` — no changes
- `scripts/kaola-workflow-classifier.js` — no changes
- `scripts/kaola-workflow-roadmap.js` — no changes
- `scripts/simulate-workflow-walkthrough.js` — no changes
- `kaola-workflow/config.json` — no changes
- No changes to phase command files, hooks, agents TOML, install.sh
- No new shared-scripts mirror entries
- No `plugins/kaola-workflow/scripts/validate-kaola-workflow-contracts.js` (doesn't exist; not created)
- No template inheritance, partials, or shared redirect.md
- The GitHub Codex plugin's no-commands/ constraint is not altered
