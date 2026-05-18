# Phase 2 - Ideation: issue-55

## Approaches Evaluated

### Option A: Minimal skeleton plus forge-aware installer

- Summary: Create `plugins/kaola-workflow-gitlab/` with manifest directories, update root marketplace manifests, add forge flags to install/uninstall, and add a no-op GitLab test placeholder.
- Pros: Matches #55 exactly; unblocks #56/#57/#58; avoids installing GitHub-flavored runtime into the GitLab edition; keeps write set small.
- Cons: `install.sh --forge=gitlab` is intentionally not functional yet beyond skeleton installation.
- Risk: Installer verification currently assumes all command/script/hook files exist.
- Complexity: Low to medium.
- What not to build: no `glab` script behavior, no command/skill prose port, no full validators.

### Option B: Skeleton plus copied placeholder commands/scripts

- Summary: Copy GitHub commands/scripts into GitLab directories now so the GitLab tree looks populated.
- Pros: Later issues have files to edit immediately; installer can copy concrete files.
- Cons: Creates a GitLab install that still says GitHub and may execute `gh`; increases risk of accidental cross-edition behavior.
- Risk: High because the core safety invariant is isolation from GitHub runtime paths.
- Complexity: Medium.
- What not to build: do not ship GitHub-flavored placeholders as GitLab runnable artifacts.

### Option C: Shared forge abstraction first

- Summary: Build generalized installer/manifest/runtime selection abstractions before adding GitLab skeleton.
- Pros: Could reduce duplication later.
- Cons: Directly conflicts with #54's no-shared-adapter decision; overbuilds the skeleton issue.
- Risk: High scope creep and merge conflict surface.
- Complexity: High.
- What not to build: no shared forge abstraction in #55.

## Advisor Findings

The advisor gate recommends Option A. It checked the main hidden risks: installer verification with empty directories, manual command-name collision, manifest metadata allowlisting, and premature GitHub runtime copies. The guidance is to keep #55 as an unblocker and leave `glab` behavior to #56/#57.

## Selected Approach

Option A: Minimal skeleton plus forge-aware installer.

Rationale: It is the narrowest approach that satisfies #55 and preserves the dependency graph. It establishes correct layout and manifest plumbing without creating misleading GitLab runtime behavior.

## Out of Scope

- Production `glab` scripts.
- GitLab command/skill/hook prose.
- Full GitLab simulator and contract validator.
- Public README/release docs beyond installer messages.
- Shared forge abstractions.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | `.cache/planner.md` | |
| advisor ideation gate | invoked | `.cache/advisor-ideation.md` | |
