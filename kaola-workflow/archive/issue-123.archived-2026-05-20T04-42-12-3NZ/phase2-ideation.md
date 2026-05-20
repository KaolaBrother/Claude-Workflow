# Phase 2 - Ideation: issue-123

## Approaches Evaluated

### Option A: Shape B thin wrapper (mirror GitLab exactly)
- Summary: ~22-line execFileSync wrapper runs three subscripts identically to the GitLab Codex sim
- Pros: Proven pattern, zero new surface, coverage parity with GitLab, trivially reviewable
- Cons: None
- Risk: Low
- Complexity: Small

### Option B: Shape A (GitHub-style, include test-gitea-forge-helpers.js)
- Summary: Add an extra subscript mirroring the GitHub Codex sim's forge-helpers test
- Pros: Slightly more coverage
- Cons: test-gitea-forge-helpers.js does not exist in the Gitea plugin; would require creating it — out of scope
- Risk: Medium (scope creep)
- Complexity: Medium

### Option C: Add install-codex-agent-profiles.js
- Summary: Create the missing install script and include it in the sim
- Pros: Closes a pre-existing gap
- Cons: install-codex-agent-profiles.js does not exist; creating it is a separate issue; referenced in SKILL.md line 118 as a known gap
- Risk: High (unrelated scope)
- Complexity: Large

## Advisor Findings
Option A is correct. The Gitea Codex plugin surface is identical in shape to GitLab's — no install-codex-agent-profiles.js, same three test subscripts. The planner output is a complete blueprint; no architect re-invocation is needed. Trailing-comma handling on scriptFiles[130] must be done in a single Edit (convert the last entry to include a trailing comma and add the new entry together).

## Selected Approach
**Option A — Shape B thin wrapper.** Mirrors GitLab Codex sim exactly with gitea substitutions. Three subscripts: validate-kaola-workflow-gitea-contracts.js, test-gitea-workflow-scripts.js, test-gitea-sinks.js.

## Out of Scope (explicit)
- Do NOT create install-codex-agent-profiles.js
- Do NOT add test-gitea-forge-helpers.js
- Do NOT modify installSupportScripts in contracts validator
- Do NOT modify install.sh or uninstall.sh

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
