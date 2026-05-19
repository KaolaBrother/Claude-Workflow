# Advisor Ideation Gate: issue-114

## Verdict
Approach is sound. Single-agent two-phase (verbatim → substitute → validate) is correct. Proceed.

## Risks Named by Planner
Confirmed accurate: bare-MR contextual hits, `glab issue note` / `glab mr merge` needing re-authoring, dangling forward script references.

## Three Blind Spots to Address in Phase 3

### 1. BSD grep `\b` under `-E` does not work on macOS
`grep -E "\bMR\b"` silently misses bare MR on macOS BSD grep. The validation command must be rewritten.
Fix: use `(^|[^A-Za-z0-9])MR([^A-Za-z0-9]|$)` or `grep -P` if available.
Include a pre-flight test in Phase 3 plan.

### 2. Verbatim copy needs byte-identity verification
Forbidden-token grep alone does not prove a file is verbatim. Add `diff -q` for each of the 20 verbatim files against its gitlab source. Cheap and conclusive.

### 3. brandColor scope inconsistency
code-explorer.md says only `.codex-plugin/plugin.json` gets brandColor; planner.md applies it to both. Before Phase 3: read both plugin.json files and verify only fields that actually exist in each are modified. Only change brandColor if it exists in the source file and the acceptance criteria require it.

## Phase 4 Prerequisite
Before translating `glab issue note` and `glab mr merge` callsites, read `plugins/kaola-workflow-gitea/scripts/kaola-gitea-forge.js` and list the exported helpers. Re-author against those shapes, not invented `tea` sub-commands.

## Spot-Check Selection
- 1 verbatim: `commands/kaola-workflow-phase4.md` — must be `diff -q` clean
- 1 substitution-heavy: `commands/kaola-workflow-phase6.md` — MR→PR contextual review
- 1 manifest: `.codex-plugin/plugin.json`

## Recommendation
Proceed to write `phase2-ideation.md` selecting the planner's recommended approach. Fold the three sharpenings into Phase 3 blueprint asks. Do not loop back to planner.
