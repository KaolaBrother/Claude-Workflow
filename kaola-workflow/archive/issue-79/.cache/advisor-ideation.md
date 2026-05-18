# Advisor Gate — Issue #79 Ideation

## Verdict: Approach A confirmed

Inline prose templates in all four init files. No helper scripts. Byte-equality validator for redirect blocks.

## Key Additions to Planner's Analysis

### 1. AGENTS.md body is locked (not missing)
The full GitHub issue body embeds the verbatim `# AGENTS.md` block under "Design Contract". No user sign-off needed. The exact body is the one from the issue spec.

### 2. AC #1 requires byte-identical CLAUDE.md within a forge pair
"Running any of the three init paths in an empty repo produces identical CLAUDE.md + AGENTS.md shape (content differs only by GitHub-vs-GitLab terminology)" means:
- The CLAUDE.md template in `commands/workflow-init.md` (GitHub Claude command) must be byte-identical to the CLAUDE.md template in `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md` (GitHub Codex skill) — after forge-token substitution.
- Same for the GitLab pair.
This is a stronger requirement than the planner emphasized. Validator: add byte-equality check for the CLAUDE.md template block within each forge pair, using code-fence-delimited canonical blocks for extraction.

### 3. .codex/agents/ bullet stays in CLAUDE.md
The current GitHub Codex SKILL has "Kaola-Workflow agent profiles live in `.codex/agents/kaola-workflow/`..." in the AGENTS addendum. After the change, move it to the CLAUDE.md template unconditionally (option a). Claude-Code users seeing it is harmless; preserving "identical CLAUDE.md within a forge" requirement is trivially satisfied.

### 4. Migration shape has two `---` dividers
The canonical AGENTS.md body itself contains a `---` divider + italicized footer ("This file intentionally contains nothing else."). The migration rule adds another `---` divider + note. Final migrated file shape:
```
# AGENTS.md
<canonical redirect block, including its own --- divider and footer>

---
> Note: content below was the prior AGENTS.md before init unified the contract.
<original content>
```
Two `---` blocks is fine but must be spelled out with a worked example in each init file.

### 5. Idempotency detection signal
Planner proposed detecting "first non-blank line = `# AGENTS.md`" — too generic. Recommend testing the second non-blank line: `> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**` which is distinctive and cannot accidentally match. Or test full first 3 lines.

## Risks Confirmed Accurate

1. Drift across four redirect blocks → mitigated by byte-equality validator
2. Interpretive latitude in migration → mitigated by per-file worked example

## Scope Boundaries (locked)
- No new scripts or shared-scripts mirror entries
- No E2E execution of init markdown in test suite
- No changes to claim.js, classifier.js, or any runtime
- Don't touch kaola-workflow/config.json (#41)

## Task Ordering for Phase 3

1. Lock canonical CLAUDE.md text (GitHub version, GitLab version)
2. Lock canonical AGENTS.md redirect (forge-neutral)
3. Dogfood: update repo CLAUDE.md + create repo AGENTS.md
4. Update `commands/workflow-init.md`
5. Update `plugins/kaola-workflow-gitlab/commands/workflow-init.md`
6. Update `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md`
7. Update `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md`
8. Update validators (byte-equality, assertNotIncludes "Do not create or edit CLAUDE.md", GitLab durable-state gap)
9. Update shared-scripts mirror
10. Run simulate-workflow-walkthrough.js + all three validators
