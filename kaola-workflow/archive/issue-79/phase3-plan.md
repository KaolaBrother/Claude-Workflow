# Phase 3 - Plan: issue-79

## Blueprint

### Files to Create
| File | Purpose | Key Interfaces |
|------|---------|----------------|
| `AGENTS.md` | Repo root dogfood — pure forced redirect to CLAUDE.md | Verbatim canonical redirect block; second non-blank line = `> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**` |

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `CLAUDE.md` | Drop 2 Non-Negotiable Rules bullets, add Goal-driven execution; result: exactly 5 bullets | Dogfood the canonical 5-bullet contract |
| `commands/workflow-init.md` | Update template NNR to 5 bullets; insert Step 3 AGENTS.md (with markers + idempotency + worked example in ```text fence); renumber Steps 3→4, 4→5; add KW markers around template | GitHub Claude command produces correct AGENTS.md |
| `plugins/kaola-workflow-gitlab/commands/workflow-init.md` | Same as above with GitLab forge tokens; AGENTS.md redirect block byte-identical | GitLab Claude command produces correct AGENTS.md |
| `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md` | Remove item 4 restriction; add new item 4 with full CLAUDE.md template (KW markers) including all 6 durable-state tokens + Active folder lifecycle + .codex/agents/ path; replace 13-bullet addendum with redirect block | Codex GitHub skill produces correct CLAUDE.md + AGENTS.md |
| `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md` | Same as above with GitLab forge tokens; redirect block byte-identical | Codex GitLab skill produces correct CLAUDE.md + AGENTS.md |
| `scripts/validate-workflow-contracts.js` | Add 3 assertions: AGENTS.md exists, AGENTS.md contains sentinel, commands/workflow-init.md contains sentinel | Validate dogfood and GitHub command |
| `plugins/kaola-workflow/scripts/validate-workflow-contracts.js` | Byte-identical mirror of above | Shared-scripts contract |
| `scripts/validate-kaola-workflow-contracts.js` | Add SKILL.md redirect inclusion + assertNotIncludes + cross-forge redirect byte-equality + CLAUDE.md template GitHub pair byte-equality | Enforce new Codex SKILL contracts |
| `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` | Add assertConcept helper; add GitLab SKILL assertNotIncludes + redirect inclusion + assertConcept for 6 tokens + GitLab template pair byte-equality | Close GitLab durable-state gap; enforce redirect |

### Build Sequence
1. Read current state of all affected files before writing anything (Non-Negotiable: Read before writing)
2. Dogfood `CLAUDE.md` — update Non-Negotiable Rules to canonical 5 bullets (parallel with step 3)
3. Dogfood `AGENTS.md` — create with verbatim canonical redirect block (parallel with step 2)
4. Update `commands/workflow-init.md` — 5-bullet NNR, Step 3 insertion, KW markers, renumber (depends on step 2 for canonical text)
5. Update GitLab command (`plugins/kaola-workflow-gitlab/commands/workflow-init.md`) — same as step 4, GitLab tokens (parallel with step 4 after step 2; uses AGENTS block from step 4 as reference)
6. Update GitHub Codex SKILL — full CLAUDE.md template with KW markers, replace addendum (depends on step 4 for template byte-identity)
7. Update GitLab Codex SKILL — same as step 6 with GitLab tokens (depends on step 5; parallel with step 6 after step 5)
8. Update `scripts/validate-workflow-contracts.js` + mirror (after steps 3 and 4)
9. Update `scripts/validate-kaola-workflow-contracts.js` — add assertions + both byte-equality checks (after steps 6 and 7)
10. Update `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` — add assertConcept helper + assertions + GitLab template pair check (after step 7; parallel with step 9)
11. Run `node scripts/validate-workflow-contracts.js`
12. Run `node scripts/validate-kaola-workflow-contracts.js`
13. Run `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`
14. Run `node scripts/simulate-workflow-walkthrough.js`

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | Tasks 1+2 (dogfood CLAUDE.md + AGENTS.md) | Disjoint write sets |
| B | Tasks 3+4 (GitHub cmd then GitHub SKILL) | B2 depends on B1 template; B parallel with C |
| C | Tasks 5+6 (GitLab cmd then GitLab SKILL) | C2 depends on C1; C parallel with B |
| D | Tasks 7, 8+9 (validators) | 7 serial (root then mirror); 8+9 parallel with each other |
| E | Tasks 10+11+12+13 (run validators + walkthrough) | Sequential within E |

### External Dependencies
None — all changes are to existing files within the repo. No new npm packages.

---

## Canonical Content (locked)

### Canonical 5-bullet Non-Negotiable Rules
```
- Think before coding: state assumptions, surface ambiguity, and ask when unclear.
- Read before writing: inspect the target file and relevant surrounding conventions immediately before editing or creating files.
- Keep it simple: solve the requested problem without speculative abstractions.
- Make surgical changes: touch only what the task requires.
- Goal-driven execution: Define verifiable success criteria before starting. Prefer write-the-failing-test-first for bugs and features. Loop until criteria pass; don't declare done on weak signals.
```

### Canonical AGENTS.md redirect block (verbatim, forge-neutral)
```markdown
# AGENTS.md

> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**
>
> `CLAUDE.md` in this repository root is the **single canonical source** for all
> non-negotiable rules, project conventions, workflow constraints, and agent
> behavior. AGENTS.md exists **only** to direct you there.
>
> **Required at session start, before any tool call, edit, or response:**
>
> 1. Read `CLAUDE.md` in full.
> 2. Treat its `## Non-Negotiable Rules` section as binding for every action you take in this repo.
> 3. If `CLAUDE.md` is missing, **stop and ask the user** — do not proceed on assumptions.
>
> Do not skip this step because the task looks small. Do not rely on prior
> session memory. Re-read on every new session.

---

*All other guidance — workflow phases, scripts, conventions, gotchas — lives in `CLAUDE.md`. This file intentionally contains nothing else.*
```

### Idempotency detection sentinel
Second non-blank line of a conforming AGENTS.md: `> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**`

### Worked migration example (use ```text fence — NOT ```markdown)
```text
# AGENTS.md

> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**
... (full redirect block including --- divider and footer) ...

---
> Note: content below was the prior AGENTS.md before init unified the contract.
... (original content) ...
```
Two `---` dividers total: one from the canonical redirect block's own footer, one added by the migration step.

### KW marker convention
```
<!-- KW-CLAUDE-TEMPLATE-START -->
[full CLAUDE.md template prose here]
<!-- KW-CLAUDE-TEMPLATE-END -->
```
These wrap the embedded CLAUDE.md template in all four init files. Used by `extractClaudeTemplate` for byte-equality validation.

---

## Task List

### Task 1 — Dogfood: update `CLAUDE.md` Non-Negotiable Rules
- File: `CLAUDE.md`
- Write set: `CLAUDE.md` only
- Depends on: nothing
- Parallel group: A
- Action: MODIFY
- Implement:
  - Read `CLAUDE.md` fully before editing.
  - Remove from `## Non-Negotiable Rules`:
    - `- Preserve user changes; never revert unrelated work without explicit request.`
    - `- Verify with the relevant command before claiming completion.`
  - Add after `- Make surgical changes: touch only what the task requires.`:
    - `- Goal-driven execution: Define verifiable success criteria before starting. Prefer write-the-failing-test-first for bugs and features. Loop until criteria pass; don't declare done on weak signals.`
  - Verify final 5-bullet order: Think before coding / Read before writing / Keep it simple / Make surgical changes / Goal-driven execution.
  - Verify `wc -l CLAUDE.md` < 200.
- Validate: `node scripts/validate-workflow-contracts.js`

### Task 2 — Dogfood: create `AGENTS.md`
- File: `AGENTS.md` (new)
- Write set: `AGENTS.md` only
- Depends on: nothing
- Parallel group: A
- Action: CREATE
- Implement:
  - Write verbatim canonical redirect block from the "Canonical Content" section above.
  - Verify the file's second non-blank line equals `> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**`
- Validate: `node scripts/validate-workflow-contracts.js` (after Task 7 adds the check)

### Task 3 — Update `commands/workflow-init.md` (GitHub Claude command)
- File: `commands/workflow-init.md`
- Write set: the file only
- Depends on: Task 1 (canonical bullet text)
- Parallel group: B (first)
- Action: MODIFY (four-part edit)
- Implement:
  - Read the file fully before editing.
  - **Part A — KW markers**: Wrap the existing embedded CLAUDE.md template (the inline template already in the file) with `<!-- KW-CLAUDE-TEMPLATE-START -->` immediately before the template content and `<!-- KW-CLAUDE-TEMPLATE-END -->` immediately after. The markers are placed at their own lines.
  - **Part B — Non-Negotiable Rules template**: Within the KW-marked block, replace the 6-bullet Non-Negotiable Rules section with the canonical 5 bullets from the "Canonical Content" section above.
  - **Part C — Insert Step 3**: Between the end of Step 2 and the current Step 3, insert a new section:
    ```
    ## Step 3 — Create `AGENTS.md`

    Check whether `AGENTS.md` exists in the project root. Detect conformance by
    reading the second non-blank line: if it equals
    `> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**`,
    the file is conforming — no-op. If the file is missing, write the canonical
    redirect block below. If the file exists but is non-conforming (second
    non-blank line does not match), prepend the redirect block, add a `---`
    divider, then append the original content with the migration note line.

    Worked example of a migrated AGENTS.md (two `---` dividers total):

    ```text
    # AGENTS.md

    > **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**
    >
    > `CLAUDE.md` in this repository root is the **single canonical source** for all
    > non-negotiable rules, project conventions, workflow constraints, and agent
    > behavior. AGENTS.md exists **only** to direct you there.
    >
    > **Required at session start, before any tool call, edit, or response:**
    >
    > 1. Read `CLAUDE.md` in full.
    > 2. Treat its `## Non-Negotiable Rules` section as binding for every action you take in this repo.
    > 3. If `CLAUDE.md` is missing, **stop and ask the user** — do not proceed on assumptions.
    >
    > Do not skip this step because the task looks small. Do not rely on prior
    > session memory. Re-read on every new session.

    ---

    *All other guidance — workflow phases, scripts, conventions, gotchas — lives in `CLAUDE.md`. This file intentionally contains nothing else.*

    ---
    > Note: content below was the prior AGENTS.md before init unified the contract.
    [original content here]
    ` ``

    Canonical `AGENTS.md` redirect block to write:

    ` ``markdown
    # AGENTS.md

    > **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**
    >
    > `CLAUDE.md` in this repository root is the **single canonical source** for all
    > non-negotiable rules, project conventions, workflow constraints, and agent
    > behavior. AGENTS.md exists **only** to direct you there.
    >
    > **Required at session start, before any tool call, edit, or response:**
    >
    > 1. Read `CLAUDE.md` in full.
    > 2. Treat its `## Non-Negotiable Rules` section as binding for every action you take in this repo.
    > 3. If `CLAUDE.md` is missing, **stop and ask the user** — do not proceed on assumptions.
    >
    > Do not skip this step because the task looks small. Do not rely on prior
    > session memory. Re-read on every new session.

    ---

    *All other guidance — workflow phases, scripts, conventions, gotchas — lives in `CLAUDE.md`. This file intentionally contains nothing else.*
    ` ``
    ```
  - **Part D — Renumber**: old `## Step 3 — Create Missing Workflow Structure` → `## Step 4 — Create Missing Workflow Structure`; old `## Step 4 — Git And Roadmap Summary` → `## Step 5 — Git And Roadmap Summary`. In Step 5 summary bullets, add item for AGENTS.md: "whether AGENTS.md was created, was already conforming, or was migrated".
  - Verify 6 durable-state tokens still present in the KW-marked template section.
- Mirror pattern: existing forge-substitution pattern in the file
- Validate: `node scripts/validate-workflow-contracts.js`

### Task 4 — Update `plugins/kaola-workflow-gitlab/commands/workflow-init.md` (GitLab Claude command)
- File: `plugins/kaola-workflow-gitlab/commands/workflow-init.md`
- Write set: the file only
- Depends on: Task 3 (mirrors structure; AGENTS block must match byte-for-byte)
- Parallel group: C (first, parallel with B after B starts)
- Action: MODIFY (same four-part as Task 3)
- Implement:
  - Read the file fully before editing.
  - Same four-part edit as Task 3 with GitLab forge tokens in the CLAUDE.md template section.
  - The AGENTS.md redirect block (inside the ` ```markdown ` fence) is byte-identical to the GitHub command — zero forge tokens to substitute.
  - The idempotency prose and worked migration example are also forge-neutral — no substitutions needed.
  - Verify zero `\bgh\b`, `GitHub`, `github.com`, `api.github.com`, `PR URL`, `PR number`, `pull request` in: redirect block, idempotency prose, Non-Negotiable Rules, worked example.
- Validate: `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`

### Task 5 — Update `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md` (Codex GitHub)
- File: `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md`
- Write set: the file only
- Depends on: Task 3 (CLAUDE.md template must be byte-identical after forge-token substitution)
- Parallel group: B (second, after Task 3)
- Action: MODIFY (structural replacement)
- Implement:
  - Read the file fully before editing.
  - **Remove** Required Behavior item 4: `4. Do not create or edit CLAUDE.md.` (currently line ~25).
  - **Renumber** remaining items: old 5→4, old 6→5, old 7→6.
  - **Insert new item 4**: "Create or update `CLAUDE.md` with canonical workflow guidance." Body:
    - Explanation: "If `CLAUDE.md` already exists, update the `## Non-Negotiable Rules` section in-place with the canonical 5 bullets."
    - `<!-- KW-CLAUDE-TEMPLATE-START -->` marker
    - Full CLAUDE.md template matching `commands/workflow-init.md` byte-for-byte (same GitHub tokens, same 5-bullet NNR).
      - The template MUST include:
        - `Active folder lifecycle` phrase (required by validator line 89)
        - All 6 durable-state tokens: `kaola-workflow/.roadmap/issue-*.md`, `do not purge`, `kaola-workflow/{project}/`, `workflow-state.md`, `fast-summary.md`, `.cache/`
        - `.codex/agents/kaola-workflow/` path (moved from old AGENTS addendum)
    - `<!-- KW-CLAUDE-TEMPLATE-END -->` marker
  - **Replace** `## AGENTS.md Addendum` section (the 13-bullet section) entirely with:
    - New section heading: `## Create \`AGENTS.md\``
    - Same idempotency prose as Task 3 Step 3 (second non-blank line sentinel, three cases: conforming/missing/non-conforming)
    - Same worked migration example in ` ```text ` fence
    - Canonical redirect block in ` ```markdown ` fence (byte-identical to all other init files — copy verbatim from Canonical Content section above)
  - Verify byte-identity with `commands/workflow-init.md` template block manually before committing.
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 6 — Update `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md` (Codex GitLab)
- File: `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md`
- Write set: the file only
- Depends on: Tasks 4 and 5 (GitLab template from Task 4, structure from Task 5)
- Parallel group: C (second, after Task 4, parallel with B's Task 5)
- Action: MODIFY (same structural replacement as Task 5)
- Implement:
  - Read the file fully before editing.
  - Same structural changes as Task 5.
  - In the embedded CLAUDE.md template: apply forge substitution table (`gh`→`glab`, `GitHub`→`GitLab`, `pull request`→`merge request`, `PR`→`MR`, `watch-pr`→`watch-mr`, `kaola-workflow-claim.js`→`kaola-gitlab-workflow-claim.js`, `kaola-workflow-roadmap.js`→`kaola-gitlab-workflow-roadmap.js`).
  - Wrap GitLab template with `<!-- KW-CLAUDE-TEMPLATE-START -->` / `<!-- KW-CLAUDE-TEMPLATE-END -->`.
  - AGENTS.md redirect block is byte-identical (copy verbatim from Canonical Content section).
  - Verify zero GitHub-specific tokens in: redirect block, idempotency prose, Non-Negotiable Rules.
  - Verify all 6 durable-state tokens and `Active folder lifecycle` phrase appear in the KW-marked template section.
- Validate: `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`

### Task 7 — Update `scripts/validate-workflow-contracts.js` + mirror
- File: `scripts/validate-workflow-contracts.js`
- Mirror: `plugins/kaola-workflow/scripts/validate-workflow-contracts.js`
- Write set: both files (byte-identical)
- Depends on: Tasks 2 and 3
- Parallel group: D (first)
- Action: MODIFY (add 3 assertions)
- Implement:
  - Read both files before editing; confirm they are currently byte-identical.
  - In `scripts/validate-workflow-contracts.js`, after the existing CLAUDE.md `assertIncludes` calls, add:
    ```javascript
    assert(exists('AGENTS.md'), 'AGENTS.md must exist at repo root (dogfood redirect)');
    assertIncludes('AGENTS.md', '> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**');
    assertIncludes('commands/workflow-init.md', '> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**');
    ```
    Note: `—` is the em-dash character U+2014 (—). Use the literal em-dash character, matching the canonical redirect block exactly.
  - Copy entire updated file byte-for-byte to `plugins/kaola-workflow/scripts/validate-workflow-contracts.js`.
  - Confirm file sizes are identical after copy.
- Validate: `node scripts/validate-workflow-contracts.js && node scripts/validate-kaola-workflow-contracts.js`

### Task 8 — Update `scripts/validate-kaola-workflow-contracts.js`
- File: `scripts/validate-kaola-workflow-contracts.js`
- Write set: this file only (no mirror for this validator — `plugins/kaola-workflow/scripts/validate-kaola-workflow-contracts.js` does not exist)
- Depends on: Tasks 5 and 6 (files being asserted must exist first)
- Parallel group: D (after Task 7, parallel with Task 9)
- Action: MODIFY
- Implement:
  - Read the file fully before editing.
  - After `assertIncludes(...'Active folder lifecycle')` (currently line 89), add:
    ```javascript
    assertIncludes(`${pluginRoot}/skills/kaola-workflow-init/SKILL.md`, '> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**');
    assertNotIncludes(`${pluginRoot}/skills/kaola-workflow-init/SKILL.md`, 'Do not create or edit CLAUDE.md');
    ```
  - Existing `assertConcept` at lines 183-190 checks for 6 durable-state tokens in the SKILL.md — tokens moved to CLAUDE.md template section but are still in the SKILL.md file, so check still passes. No change needed.
  - Add `extractRedirectBlock` function and `extractClaudeTemplate` function (and `read` helper if not already present) before the final assertions:
    ```javascript
    function extractRedirectBlock(file) {
      const text = fs.readFileSync(path.resolve(repoRoot, file), 'utf8');
      const fenceOpen = '```markdown';
      const fenceClose = '\n```';
      let idx = 0;
      while (idx < text.length) {
        const fence = text.indexOf(fenceOpen, idx);
        if (fence === -1) break;
        const blockStart = fence + fenceOpen.length;
        const blockEnd = text.indexOf(fenceClose, blockStart);
        if (blockEnd === -1) break;
        const block = text.slice(blockStart, blockEnd + 1).trim();
        if (block.includes('# AGENTS.md') && block.includes('> **MANDATORY — READ CLAUDE.md')) {
          return block;
        }
        idx = blockEnd + fenceClose.length;
      }
      throw new Error(file + ': no AGENTS.md redirect block found (must contain # AGENTS.md and MANDATORY sentinel)');
    }

    function extractClaudeTemplate(file) {
      const text = fs.readFileSync(path.resolve(repoRoot, file), 'utf8');
      const START = '<!-- KW-CLAUDE-TEMPLATE-START -->';
      const END = '<!-- KW-CLAUDE-TEMPLATE-END -->';
      const startIdx = text.indexOf(START);
      const endIdx = text.indexOf(END);
      if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
        throw new Error(file + ': missing KW-CLAUDE-TEMPLATE-START/END markers');
      }
      return text.slice(startIdx + START.length, endIdx).trim();
    }
    ```
  - Add cross-forge byte-equality checks before the final `console.log`:
    ```javascript
    // AGENTS.md redirect block must be byte-identical in all four init files
    const initFiles = [
      'commands/workflow-init.md',
      'plugins/kaola-workflow-gitlab/commands/workflow-init.md',
      `${pluginRoot}/skills/kaola-workflow-init/SKILL.md`,
      'plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md'
    ];
    const redirectBlocks = initFiles.map(f => ({ file: f, block: extractRedirectBlock(f) }));
    const referenceBlock = redirectBlocks[0].block;
    for (const { file, block } of redirectBlocks.slice(1)) {
      assert(block === referenceBlock,
        'AGENTS.md redirect block must be byte-identical in ' + file + ' vs ' + redirectBlocks[0].file);
    }

    // CLAUDE.md template must be byte-identical within each forge pair
    const githubCmdTemplate = extractClaudeTemplate('commands/workflow-init.md');
    const githubSkillTemplate = extractClaudeTemplate(`${pluginRoot}/skills/kaola-workflow-init/SKILL.md`);
    assert(githubCmdTemplate === githubSkillTemplate,
      'CLAUDE.md template must be byte-identical within GitHub forge pair');

    const gitlabCmdTemplate = extractClaudeTemplate('plugins/kaola-workflow-gitlab/commands/workflow-init.md');
    const gitlabSkillTemplate = extractClaudeTemplate('plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md');
    assert(gitlabCmdTemplate === gitlabSkillTemplate,
      'CLAUDE.md template must be byte-identical within GitLab forge pair');
    ```
  - Verify `repoRoot`, `pluginRoot`, `fs`, `path` are already defined in the file; use the existing convention.
- Validate: `node scripts/validate-kaola-workflow-contracts.js`

### Task 9 — Update `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`
- File: `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`
- Write set: this file only
- Depends on: Task 6 (GitLab SKILL.md must exist)
- Parallel group: D (parallel with Task 8)
- Action: MODIFY
- Implement:
  - Read the file fully before editing.
  - Verify what variable names the file uses for skill paths (likely `__dirname + '/../skills'` or similar). Look for the skills directory definition and use the correct variable.
  - Add `assertConcept` helper function after the `assertNoForbidden` function definition (copy pattern from `scripts/validate-kaola-workflow-contracts.js`):
    ```javascript
    function assertConcept(file, concept, terms) {
      const content = fs.readFileSync(file, 'utf8').toLowerCase();
      const missing = terms.filter(term => !content.includes(term.toLowerCase()));
      assert(missing.length === 0,
        file + ' must document ' + concept + '; missing: ' + missing.join(', '));
    }
    ```
  - Add `extractClaudeTemplate` helper (same as Task 8, using absolute path):
    ```javascript
    function extractClaudeTemplate(filePath) {
      const text = fs.readFileSync(filePath, 'utf8');
      const START = '<!-- KW-CLAUDE-TEMPLATE-START -->';
      const END = '<!-- KW-CLAUDE-TEMPLATE-END -->';
      const startIdx = text.indexOf(START);
      const endIdx = text.indexOf(END);
      if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
        throw new Error(filePath + ': missing KW-CLAUDE-TEMPLATE-START/END markers');
      }
      return text.slice(startIdx + START.length, endIdx).trim();
    }
    ```
  - Add assertions before the `assertNoForbidden` results loop (or before the final console.log):
    ```javascript
    const gitlabInitSkill = path.resolve(__dirname, '../skills/kaola-workflow-init/SKILL.md');
    assertNotIncludes(gitlabInitSkill, 'Do not create or edit CLAUDE.md');
    assertIncludes(gitlabInitSkill, '> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**');
    assertConcept(gitlabInitSkill, 'GitLab init durable state contract', [
      'kaola-workflow/.roadmap/issue-*.md',
      'do not purge',
      'kaola-workflow/{project}/',
      'workflow-state.md',
      'fast-summary.md',
      '.cache/'
    ]);
    // GitLab forge pair CLAUDE.md template byte-equality
    const repoRoot = path.resolve(__dirname, '../../..');
    const gitlabCmdTemplate = extractClaudeTemplate(path.resolve(repoRoot, 'plugins/kaola-workflow-gitlab/commands/workflow-init.md'));
    const gitlabSkillTemplate = extractClaudeTemplate(gitlabInitSkill);
    assert(gitlabCmdTemplate === gitlabSkillTemplate,
      'CLAUDE.md template must be byte-identical within GitLab forge pair');
    ```
  - Note: `assertNotIncludes` and `assertIncludes` in this file currently take absolute paths (confirmed from Phase 1 code-explorer). Verify this against the file's existing helper signatures.
- Validate: `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`

### Task 10 — Run all three validators
- Depends on: Tasks 7, 8, 9
- Parallel group: E (sequential)
- Commands (all must exit 0):
  ```bash
  node scripts/validate-workflow-contracts.js
  node scripts/validate-kaola-workflow-contracts.js
  node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js
  ```
- If any validator fails: diagnose the specific assertion, fix the underlying content (do not suppress the assertion), re-run.

### Task 11 — Run walkthrough simulation
- Depends on: Task 10
- Parallel group: E (sequential after Task 10)
- Command: `node scripts/simulate-workflow-walkthrough.js`
- Must print "Workflow walkthrough simulation passed" and exit 0.

---

## Advisor Notes

Two gaps fixed in architect-revision-1.md:

1. **Redirect block extraction anchor**: `extractRedirectBlock` now requires BOTH `# AGENTS.md` AND `> **MANDATORY — READ CLAUDE.md` in the fenced block, preventing false match with the worked migration example. Worked migration examples use ` ```text ` fences.

2. **CLAUDE.md template byte-equality within forge pair**: Added `<!-- KW-CLAUDE-TEMPLATE-START -->` / `<!-- KW-CLAUDE-TEMPLATE-END -->` markers to all four init files. `extractClaudeTemplate` reads between markers. GitHub pair byte-equality check in Task 8; GitLab pair byte-equality check in Task 9.

Build sequence is dependency-safe. No files or integration points are missing. Edge cases covered: idempotency (three cases), migration (two-divider shape), `assertNoForbidden` for GitLab files (redirect block and worked example contain zero GitHub tokens).

---

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | invoked | .cache/architect-revision-1.md | 2 gaps fixed |
