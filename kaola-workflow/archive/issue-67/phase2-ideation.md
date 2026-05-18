# Phase 2 - Ideation: issue-67

## Approaches Evaluated

### Option A: Blind copy and text-replace GitHub scripts

- Pros: fastest way to match the existing command surface.
- Cons: high risk of carrying `gh`, remote claim comments, PR sink naming, and legacy references into the GitLab tree.
- Risk: medium-high.
- Complexity: low.
- What not to build: no direct fallback to root scripts or `plugins/kaola-workflow/`.

### Option B: Fresh GitLab-local scripts modeled on the simplified core

- Pros: keeps the two-source model explicit, avoids retired coordination behavior, and lets tests enforce GitLab semantics.
- Cons: more implementation work than text replacement.
- Risk: medium.
- Complexity: medium.
- What not to build: no MR merge implementation, commands, hooks, skills, or full simulator suite.

### Option C: Shared adapter layer between GitHub and GitLab

- Pros: could reduce duplication later.
- Cons: violates #72/#67 boundaries and risks destabilizing the GitHub edition.
- Risk: high.
- Complexity: high.
- What not to build: no shared forge abstraction in this phase.

## Advisor Findings

The main correctness risk is accidentally reviving a third source of truth through `workflow:in-progress`. The selected design must keep local workflow folders plus remote issue state as the activity model and treat labels as advisory decoration only.

## Selected Approach

Option B: write self-contained GitLab-local scripts modeled on the simplified core and backed by focused tests. The scripts may require `./kaola-gitlab-forge`, but must not import root scripts or `plugins/kaola-workflow/`.

## Out of Scope

- MR/merge sink implementation details.
- Commands, skills, hooks, agents, and prose.
- Full GitLab simulator suite.
- Legacy `.locks`, `.sessions`, `.tickers`, heartbeat, handoff, or startup receipt behavior.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | `kaola-workflow/issue-67/phase2-ideation.md` | Current session performed strategy analysis because the user is coordinating parallel issue ownership. |
| advisor ideation gate | invoked | `kaola-workflow/issue-67/.cache/advisor-ideation.md` | |

