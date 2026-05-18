# Planner: minimal-ecc-config

## Recommendation: Option A — Augment "Dependency — Everything Claude Code (ECC)"

Add a four-bullet "Minimal Kaola-Workflow ECC configuration" labeled block inside the existing blockquote, immediately after the `/plugin install` code block (current line ~46), before the npm-package-name note (line 48).

## Options Evaluated

### Option A — Augment "Dependency — ECC" (RECOMMENDED)
- Summary: Insert new labeled subsection inside the existing blockquote, after install commands
- Pros: Co-located with the 9-agent table (the canonical "install only these" inventory); one-pass read for new users; no restructuring
- Cons: Dependency section grows slightly; hook bullet cross-references "ECC Hook Policy" rather than duplicating code block
- Risk: Low
- Complexity: Small

### Option B — Augment "ECC Hook Policy"
- Summary: Broaden the existing hook-policy section to cover subagents and rule categories
- Pros: ECC_HOOK_PROFILE=minimal already lives there
- Cons: Section heading is contract-locked to "Hook Policy"; subagent/rule guidance reads off-topic; far from install commands
- Risk: Medium
- Complexity: Small

### Option C — New top-level "ECC Minimal Configuration" section
- Summary: Standalone section between Dependency and Installation
- Pros: Clean heading; no growth to either existing section
- Cons: Three ECC-related top-level headings; readers must consult three places; duplicates context near the agent table
- Risk: Low
- Complexity: Small–Medium

## Implementation Steps (Option A)

1. Insert subsection inside `## Dependency — Everything Claude Code (ECC)` blockquote after line 46:
   - Bold lead-in: `> **Minimal Kaola-Workflow ECC configuration**`
   - Four bullets:
     1. Hooks → use `ECC_HOOK_PROFILE=minimal`; cross-reference to `## ECC Hook Policy` (no duplication)
     2. Subagents → install only the 9 listed in the table above
     3. Language rules → do not install as part of Kaola-Workflow setup
     4. Common rules → user choice based on own project preferences
   - Every line (including blank separators) must keep `> ` prefix

2. Verify: `node scripts/validate-workflow-contracts.js` — must pass (confirms ECC Hook Policy and ECC_HOOK_PROFILE=minimal strings preserved)

3. Verify: `node scripts/simulate-workflow-walkthrough.js` — must exit 0

4. Visual skim: blockquote rendering, anchor `#ecc-hook-policy` resolves, table/install flow intact

## NOT To Build
- Do not rename `## ECC Hook Policy`
- Do not remove/relocate `ECC_HOOK_PROFILE=minimal` code block
- Do not modify the 9-agent table or install.sh REQUIRED_AGENTS
- Do not modify Codex plugin files
- Do not introduce a second ECC_HOOK_PROFILE=minimal code block
- Do not enumerate specific language/common rule file names
- Do not soften "do not install ECC language rules" to "optional"
