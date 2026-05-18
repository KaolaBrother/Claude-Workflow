# Planner Notes: issue-71

## Options Considered

1. Documentation-only launch pass.
   - Lowest risk, but misses the discovered `install.sh --forge=gitlab` support-script gap and would leave manual GitLab installation broken.

2. Launch readiness pass.
   - Update docs, changelog, release-version prose, GitLab terminology, and the GitLab installer script list, then validate with full suites and isolated install/uninstall smoke tests.
   - Covers all #71 acceptance criteria without changing GitLab runtime behavior.

3. New tagged release pass.
   - Bump versions, update changelog, create/push tags, and publish release metadata.
   - Overbuilt for #71 because no user explicitly requested tag publication, and current manifests already share consistent release versions.

## Recommendation

Use option 2. It fixes the only functional launch gap found in research and keeps the rest of the work documentation/metadata focused.
