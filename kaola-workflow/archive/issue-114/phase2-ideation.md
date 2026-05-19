# Phase 2 - Ideation: issue-114

## Approaches Evaluated

### Option A: Single-agent two-phase (verbatim then substitute)
- Summary: One agent handles all file creation. Phase A copies 20 forge-agnostic files verbatim. Phase B applies the 23-step canonical substitution map to 13 forge-specific files. Phase C validates with forbidden-token grep.
- Pros: No coordination overhead; substitution order is deterministic (longest-first prevents prefix collisions); single context holds the full substitution state
- Cons: Agent must handle ~30 files; contextual MR/note/merge judgment must be inline
- Risk: Low (content-only task; no JS logic)
- Complexity: Medium

### Option B: Parallel sub-agents per file group
- Summary: Split verbatim copies and substitution files across 2-3 parallel sub-agents
- Pros: Faster wall-clock for large file sets
- Cons: Coordination cost exceeds benefit at 13 files; each agent needs the full substitution map; risk of inconsistent substitution across agents
- Risk: Medium
- Complexity: Medium

### Option C: Bulk sed pipeline
- Summary: Shell sed pipeline across all files at once
- Pros: Fast
- Cons: Cannot handle bare-MR contextual judgment; `glab issue note` / `glab mr merge` re-authoring requires contextual reasoning, not text replacement
- Risk: High (silent mis-substitutions)
- Complexity: Small but fragile

## Advisor Findings
(from .cache/advisor-ideation.md)

Approach is sound. Three blind spots to fold into Phase 3:

1. **BSD grep `\b` fails on macOS** — validation command must use `(^|[^A-Za-z0-9])MR([^A-Za-z0-9]|$)` instead of `\bMR\b`
2. **Verbatim copy needs `diff -q` verification** — forbidden-token grep alone does not prove byte identity
3. **brandColor scope** — confirm which plugin.json files have the field before substituting; change only fields that exist in the source

Phase 4 prerequisite: read `kaola-gitea-forge.js` exports before translating `glab issue note` / `glab mr merge` callsites.

## Selected Approach
**Option A: Single-agent two-phase**

Rationale: This is a content-mirroring task with deterministic substitutions and contextual judgment points. A single agent with the full substitution map and access to `kaola-gitea-forge.js` is the correct scope. Parallel agents add coordination cost without benefit.

The three advisor sharpenings are folded into Phase 3 blueprint asks:
- Phase C validation uses POSIX-safe pattern instead of `\b`
- Blueprint specifies `diff -q` for all 20 verbatim files
- Phase 4 agent reads forge.js exports before re-authoring note/merge callsites

## Out of Scope (explicit)
- No new JS files in `plugins/kaola-workflow-gitea/scripts/`
- No simulate/validate/test scripts
- No kaola-gitea-workflow-claim.js, classifier.js, roadmap.js, compact-context.js (those are issues #112, #113)
- No edits to `plugins/kaola-workflow-gitlab/`
- No `.gitkeep` files in directories that contain real files
- No top-level README.md for the gitea plugin
- No changes to `plugins/kaola-workflow-gitea/scripts/` (issue #111 already delivered those)

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
