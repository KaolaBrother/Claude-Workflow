# Code Architect: minimal-ecc-config

## Design Decisions

- Text-anchor edits, not line-number edits: both changes use surrounding text as anchors so neither shift invalidates the other. Order of edits is independent.
- Bare `>` (no trailing space) for blank blockquote separator lines: matches every existing blank separator in the file. Avoids trailing-whitespace lint.
- Inline backtick for `ECC_HOOK_PROFILE=minimal` in the new bullet: satisfies the "no second code block" constraint while keeping the `assertIncludes('README.md', 'ECC_HOOK_PROFILE=minimal')` contract test passing.
- `#ecc-hook-policy` anchor slug: correct per GitHub/CommonMark heading-to-slug rule (lowercase, spaces → hyphens).
- No new sections, no renames: `## ECC Hook Policy` heading text is untouched; `ECC_HOOK_PROFILE=minimal` code block is untouched.

## Files to Modify

| File | Specific Changes | Why |
|------|-----------------|-----|
| `README.md` | (1) Insert 7-line block between current line 46 and line 48. (2) Replace one lead-in sentence at current line 359. | Adds Minimal ECC configuration guidance inside the blockquote; resolves tonal mismatch in hook policy lead-in. |

## Files to Create

None.

## Build Sequence

1. Apply Edit A — Insert the four-bullet configuration block (text anchor: after closing code fence, before npm note)
2. Apply Edit B — Replace the hook policy lead-in sentence (text anchor: surrounding heading and code block)
3. Run contract validation: `node scripts/validate-workflow-contracts.js`
4. Run integration walkthrough: `node scripts/simulate-workflow-walkthrough.js`

Steps 1 and 2 are independent. Step 3 must follow both. Step 4 must follow step 3.

## Task List

### Task 1 — Insert Minimal ECC Configuration Block

- File: `README.md`
- Write Set: `README.md`
- Depends On: nothing
- Action: INSERT

Old text (lines 46–50, 5 lines):
```
> ```
>
> ECC's current npm package name is `ecc-universal`; the older `everything-claude-code`
> npm package name is not the active install surface.
>
```

New text (12 lines):
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

### Task 2 — Tweak Hook Policy Lead-In Sentence

- File: `README.md`
- Write Set: `README.md`
- Depends On: nothing (independent of Task 1)
- Action: MODIFY

Old text (lines 359–360):
```
For heavy Phase 4 implementation bursts or many subagents, use the lighter hook
profile:
```

New text:
```
Kaola-Workflow recommends this profile by default; it is particularly useful for
heavy Phase 4 implementation bursts or many subagents. Use the lighter hook
profile:
```

### Task 3 — Contract Validation

- Depends On: Tasks 1 and 2
- Command: `node scripts/validate-workflow-contracts.js`
- Expected: exits 0

### Task 4 — Integration Walkthrough

- Depends On: Task 3
- Command: `node scripts/simulate-workflow-walkthrough.js`
- Expected: exits 0, prints "Workflow walkthrough simulation passed"

## Explicit Out-of-Scope Items

- Do not rename `## ECC Hook Policy`
- Do not remove or relocate the `ECC_HOOK_PROFILE=minimal` code block
- Do not introduce a second `ECC_HOOK_PROFILE=minimal` code block
- Do not modify the 9-row agent table
- Do not modify `install.sh` or any Codex plugin files
- Do not enumerate specific language rule or common rule file names
- Do not soften "do not install ECC language rules" to "optional"
- Do not change "ECC subagents listed in the table above" to a hardcoded count
- Do not modify `scripts/validate-workflow-contracts.js` or `scripts/simulate-workflow-walkthrough.js`
