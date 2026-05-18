# Phase 3 - Plan: minimal-ecc-config

## Blueprint

### Files to Create
None.

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `README.md` | (1) Insert 7-line "Minimal Kaola-Workflow ECC configuration" block inside existing blockquote after install code block (~line 46). (2) Prepend one sentence to Hook Policy lead-in (~line 359). | Delivers the four-bullet minimal ECC guidance co-located with the agent table; resolves tonal mismatch between new "recommended default" framing and existing "heavy bursts" framing. |

### Build Sequence
1. Apply Edit A — insert minimal ECC configuration block (text-anchor: after closing ``` fence, before "ECC's current npm package name" line)
2. Apply Edit B — tweak Hook Policy lead-in (text-anchor: surrounding heading and code block, independent of Edit A)
3. Run `node scripts/validate-workflow-contracts.js` — must exit 0
4. Run `node scripts/simulate-workflow-walkthrough.js` — must exit 0

Steps 1 and 2 are independent (disjoint text regions). Step 3 must follow both. Step 4 must follow step 3.

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | Task 1, Task 2 | disjoint text regions in README.md |
| serial | Task 3, Task 4 | validation must follow edits |

### External Dependencies
None. Documentation-only change; no new packages or imports.

## Task List

### Task 1: Insert Minimal ECC Configuration Block
- File: `README.md`
- Test File: `scripts/validate-workflow-contracts.js` (existing)
- Write Set: `README.md`
- Depends On: none
- Parallel Group: A
- Action: MODIFY (insert)
- Implement:
  Replace this old text (5 lines, around current lines 46–50):
  ```
  > ```
  >
  > ECC's current npm package name is `ecc-universal`; the older `everything-claude-code`
  > npm package name is not the active install surface.
  >
  ```
  With this new text (12 lines):
  ```
  > ```
  >
  > **Minimal Kaola-Workflow ECC configuration**
  >
  > - **Hooks:** use `ECC_HOOK_PROFILE=minimal` (see [ECC Hook Policy](#ecc-hook-policy) below)
  > - **Subagents:** install only the ECC subagents listed in the table above
  > - **Language rules:** do not install ECC language rules as part of Kaola-Workflow setup
  > - **Common rules:** user choice based on your own project preferences
  >
  > ECC's current npm package name is `ecc-universal`; the older `everything-claude-code`
  > npm package name is not the active install surface.
  >
  ```
  All new blockquote lines use bare `>` (no trailing space) for blank separators — consistent with existing file convention.
- Mirror: existing blockquote formatting in `README.md:23–60` (bare `>` separators, `> ` prefix for content lines)
- Sanity: `grep -c 'Minimal Kaola-Workflow ECC configuration' README.md` → expect `1`
- Validate: `node scripts/validate-workflow-contracts.js`

### Task 2: Tweak Hook Policy Lead-In Sentence
- File: `README.md`
- Test File: `scripts/validate-workflow-contracts.js` (existing)
- Write Set: `README.md`
- Depends On: none
- Parallel Group: A
- Action: MODIFY (replace)
- Implement:
  Replace old text (2 lines, around current line 359):
  ```
  For heavy Phase 4 implementation bursts or many subagents, use the lighter hook
  profile:
  ```
  With new text (3 lines):
  ```
  Kaola-Workflow recommends this profile by default; it is particularly useful for
  heavy Phase 4 implementation bursts or many subagents. Use the lighter hook
  profile:
  ```
  The `## ECC Hook Policy` heading and `ECC_HOOK_PROFILE=minimal` code block must remain unchanged.
- Mirror: existing prose style in `README.md:351–369`
- Sanity: `grep -c 'recommends this profile by default' README.md` → expect `1`; `grep -c '^## ECC Hook Policy' README.md` → expect `1`
- Validate: `node scripts/validate-workflow-contracts.js`

### Task 3: Contract Validation
- Depends On: Tasks 1, 2
- Parallel Group: serial
- Command: `node scripts/validate-workflow-contracts.js`
- Expected: exits 0; `ECC_HOOK_PROFILE=minimal` now appears twice in README (`grep -c 'ECC_HOOK_PROFILE=minimal' README.md` → expect `2`) — both occurrences satisfy the `assertIncludes` contract test

### Task 4: Integration Walkthrough
- Depends On: Task 3
- Parallel Group: serial
- Command: `node scripts/simulate-workflow-walkthrough.js`
- Expected: exits 0, prints "Workflow walkthrough simulation passed"

## Advisor Notes

Advisor approves the blueprint. Key notes:
- Both edits are text-anchor based (not line-number based) — robust to earlier insertions
- Inline backtick for `ECC_HOOK_PROFILE=minimal` in the new bullet avoids a second code block while keeping the `assertIncludes` contract test passing (substring still present)
- `#ecc-hook-policy` anchor slug is correct per GitHub/CommonMark rules; verify visually during Phase 4
- No architect revision needed

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | .cache/advisor-plan.md — no gaps found | blueprint approved on first review |
