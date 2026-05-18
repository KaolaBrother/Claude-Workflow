# Phase 2 - Ideation: minimal-ecc-config

## Approaches Evaluated

### Option A: Augment "Dependency — Everything Claude Code (ECC)"
- Summary: Insert a four-bullet "Minimal Kaola-Workflow ECC configuration" labeled block inside the existing blockquote, immediately after the `/plugin install` code block (~line 46), before the npm-package-name note (~line 48)
- Pros: Co-located with the 9-agent table (canonical "install only these" inventory); one-pass read for new users; no restructuring; cross-reference to ECC Hook Policy avoids duplication
- Cons: Dependency section grows slightly; hook bullet cross-references rather than duplicates code block
- Risk: Low
- Complexity: Small

### Option B: Augment "ECC Hook Policy"
- Summary: Broaden the existing hook-policy section to cover subagents and rule categories
- Pros: `ECC_HOOK_PROFILE=minimal` already lives there
- Cons: Section heading is contract-locked to "Hook Policy"; subagent/rule guidance reads off-topic; far from install commands
- Risk: Medium
- Complexity: Small

### Option C: New top-level "ECC Minimal Configuration" section
- Summary: Standalone section between Dependency and Installation
- Pros: Clean heading; no growth to either existing section
- Cons: Three ECC-related top-level headings; readers must consult three places; duplicates context near the agent table
- Risk: Low
- Complexity: Small–Medium

## Advisor Findings

Advisor endorses Option A. Placement is correct: the 9-agent table is the canonical "install only these" inventory, and the four recommendations are install-time decisions that belong next to it.

**Key finding — tonal mismatch**: The existing `## ECC Hook Policy` section (lines 351–369) frames `ECC_HOOK_PROFILE=minimal` as a tip for "heavy Phase 4 implementation bursts". The new bullet will frame the same flag as the recommended setup default — a contradiction a reader will notice.

Advisor recommends the **tighter resolution**: in the same edit, add one sentence to the Hook Policy lead-in (e.g., "Kaola-Workflow recommends this profile by default; it is particularly useful for heavy Phase 4 bursts"). This preserves the `## ECC Hook Policy` heading and the `ECC_HOOK_PROFILE=minimal` code block — contract-safe. Phase 3 blueprint must make this an explicit decision.

**Wording precision**: "do not install ECC language rules" must stay direct (not softened to "optional"). Phrase the subagents bullet as "install only the ECC subagents listed in the table above" for robustness if the table count ever changes.

## Selected Approach

**Option A** — Augment "Dependency — Everything Claude Code (ECC)" blockquote.

Rationale: The Dependency section already contains the 9-agent table that serves as the install inventory. Adding the minimal-configuration guidance immediately after the install commands creates a single-pass read for new users without restructuring. The advisor endorses this placement. The tonal mismatch in ECC Hook Policy will be resolved by a one-sentence lead-in tweak (tighter resolution), to be made an explicit named edit point in Phase 3.

## Out of Scope (explicit)

- Do not rename `## ECC Hook Policy`
- Do not remove or relocate the `ECC_HOOK_PROFILE=minimal` code block
- Do not introduce a second `ECC_HOOK_PROFILE=minimal` code block
- Do not modify the 9-agent table or `install.sh` REQUIRED_AGENTS
- Do not modify Codex plugin files
- Do not enumerate specific language or common rule file names
- Do not soften "do not install ECC language rules" to "optional"

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
