# Planner Notes - issue-24

## Option A: Prompt-only hardening

- Summary: strengthen `/workflow-next` and phase prompts to say startup is mandatory.
- Pros: small change, low implementation risk.
- Cons: does not solve the observed failure because an agent can still skip the prompt block.
- Risk: false sense of safety.
- Complexity: low.
- What not to build: no script-level receipt, no issue sync.

## Option B: Extend existing bootstrap

- Summary: add issue-roadmap sync and receipt writing to `bootstrap`.
- Pros: reuses the current public command.
- Cons: current bootstrap name does not express the stronger invariant; harder to distinguish legacy behavior in tests and prompts.
- Risk: compatibility ambiguity.
- Complexity: medium.
- What not to build: separate startup command.

## Option C: New startup transaction wrapping bootstrap behavior

- Summary: add `startup` as a single runtime entrypoint that syncs issues, refreshes roadmap, sweeps leases, watches PRs, detects owned work, classifies candidates, claims the first actionable issue, writes a receipt, and returns structured JSON.
- Pros: directly models the locked design in issue #24; keeps bootstrap available while moving routers to the stronger command; gives tests a concrete invariant.
- Cons: larger change; must keep root and packaged Codex scripts in sync.
- Risk: receipt freshness and online/offline sync behavior need focused tests.
- Complexity: medium-high.
- What not to build: broad priority system beyond queued label and stable issue number order.

## Recommendation

Choose Option C. It is the only approach that changes startup from prompt convention into a testable runtime contract while preserving compatibility with current bootstrap tests.
