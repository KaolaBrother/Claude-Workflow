# Planner Notes: issue-76

## Option A: Minimal prompt removal only

- Summary: Remove the missing ECC prompt and leave users to install agents separately.
- Pros: Smallest change.
- Cons: Does not satisfy the issue goal; workflows still lack agents after `curl | bash`.
- Risk: High user-facing gap remains.
- Do not build: partial installer bypass.

## Option B: Vendor agents with marker-only overwrite

- Summary: Add root agent files and copy them in install/uninstall using only an attribution marker.
- Pros: Simple implementation.
- Cons: Marker-only overwrite can clobber user edits to a previously installed file.
- Risk: Medium data-loss risk for user-modified agent files.
- Do not build: overwrite logic that trusts only a marker.

## Option C: Vendor agents with attribution, manifest-backed update safety, docs, and validator

- Summary: Add vendored agents, install them with a managed marker and manifest checksum, skip unknown/user-modified files, remove only marked files, and validate metadata/package docs.
- Pros: Satisfies issue acceptance and protects user files.
- Cons: More code than marker-only copy.
- Risk: Low; Bash manifest logic must stay portable.
- Do not build: automatic upstream refresh, behavior changes to agent prompts.

Selected: Option C.
