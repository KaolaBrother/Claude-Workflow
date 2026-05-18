# Phase 2 - Ideation: issue-76

## Approaches Evaluated

### Option A: Remove ECC Prompt Only

Smallest change, but it leaves the user without the agents that phases expect. Rejected because it does not meet the goal.

### Option B: Vendor Agents With Marker-Only Overwrite

Meets the basic install goal, but marker-only overwrite can replace user-edited agent files. Rejected because the issue explicitly requires leaving user-owned files untouched.

### Option C: Vendor Agents With Attribution, Manifest-Backed Safety, Docs, And Validator

Adds the root `agents/` payload, installs it through `install.sh`, records managed install hashes, removes only marked files, updates package/docs, and adds validation.

## Advisor Findings

The advisor check flagged two important constraints: preserve YAML front matter as the first bytes of each agent file, and use checksum/manifest evidence rather than marker-only overwrite.

## Selected Approach

Option C. It is the only approach that satisfies the no-prerequisite install goal while avoiding user-file clobbering.

## Out of Scope

- Changing agent prompt behavior beyond attribution metadata.
- Automatic upstream refresh.
- Hook settings merge into Claude Code settings.
- Codex agent profile changes.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | `.cache/planner.md` | Performed in current Codex session |
| advisor ideation gate | invoked | `.cache/advisor-ideation.md` | Performed in current Codex session |
