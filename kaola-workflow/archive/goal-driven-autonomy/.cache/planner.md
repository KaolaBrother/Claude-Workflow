# Planner Notes

## Approaches Evaluated

### Option A: Patch only Phase 1 naming

- Summary: Remove the generated folder-name prompt from Phase 1 command and Codex research skill.
- Pros: Smallest diff.
- Cons: Does not satisfy goal-driven continuation, advisor/expert decision policy, or documentation acceptance criteria.
- Risk: High because it would leave later user-confirmation stops intact.
- Complexity: Small.

### Option B: Add a shared autonomy contract across workflow docs, commands, skills, and tests

- Summary: Add a durable decision policy and goal contract to router/phase surfaces, update Phase 1 naming to deterministic collision-safe creation, make Phase 2/3 internal advisor decisions autonomous, and enforce with contract tests.
- Pros: Directly maps to every issue acceptance criterion and keeps behavior visible in both Claude and Codex runtimes.
- Cons: Larger documentation patch across multiple files.
- Risk: Medium due to many instruction surfaces, but mitigated by existing contract validators.
- Complexity: Medium.

### Option C: Implement a new runtime helper script for naming and policy

- Summary: Add a JS helper for deterministic project names and have docs/commands reference it.
- Pros: Stronger executable behavior for name generation.
- Cons: The workflow surfaces are mostly instruction files; adding a helper does not by itself change Claude/Codex behavior and increases maintenance surface.
- Risk: Medium.
- Complexity: Medium.

## Recommendation

Choose Option B. The issue is about guidance and workflow behavior across Claude Code and Codex, and the existing repo validates this kind of behavior through text contracts.

## Out Of Scope

- Replacing the six-phase workflow.
- Adding a new command runtime.
- Changing package metadata or release version.
- Making final pushes, destructive Git operations, or issue closure automatic when external authorization is not already present.
