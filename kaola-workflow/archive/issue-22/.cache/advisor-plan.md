# Advisor Plan Gate - issue-22

## Findings

The plan is scoped correctly. The highest-risk edits are not the helper function itself but the old snippets and tests that still treat `session --project` as an adoption API. Those must change in the same patch or the implementation will look fixed while phase startup remains unsafe.

## Required Revisions

- Include a test where bootstrap sees an already-owned project and returns that project instead of claiming a second issue for the same session.
- Include a test where foreign-owned project validation exits occupied instead of printing the owner.
- Include state-only lease coverage, because issue #22 explicitly calls out Phase 1/Phase 4-6 active work.
- Preserve Sink/Lease blocks during repair, or repaired active states can lose the ownership data needed for future routing.

## Decision

Proceed after incorporating those coverage points into Phase 3.
