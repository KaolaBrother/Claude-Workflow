# Phase 2 - Ideation: issue-140

## Approaches Evaluated

### Option A: Profile-aware source resolution inside the install loop (SELECTED)
- **Summary:** Resolve `source_file` per-agent inside `install_agent_files`, before the `local source_file=` assignment (between install.sh lines 239-241). If `PROFILE=higher` AND `$SOURCE_AGENTS_DIR/profiles/higher/$file_name` exists, use override path; otherwise use base. All downstream logic (cmp -s check, managed-update detection, manifest write at line 281) operates unchanged.
- **Pros:** Round-trip (`common→higher→common`) works for free. Manifest always records `sha256_file "$dest"` (hash of actual on-disk content), so both directions traverse the managed-update branch correctly. User-edit protection preserved unchanged. Single manifest remains source of truth. Filesystem discovery (`-f` test) means future overrides are drop-in.
- **Cons:** Override files must carry `kaola-workflow-managed-agent: true` marker (line 275 hard-fails otherwise) — documented as implementation constraint, not a risk.
- **Risk:** Low
- **Complexity:** Small (~6 lines in install.sh + flag parsing)
- **Architectural fit:** Excellent — extends existing manifest mechanism, no parallel state

### Option B: After-loop override copy pass
- **Summary:** Run base install unchanged, then `cp` the 3 override files over their destinations after the loop completes.
- **Cons:** Breaks `higher→common` round-trip. After override `cp`, manifest holds base hashes but dests have override content. On switch back to `common`, base install sees recorded_hash(base) ≠ current(override) → classifies as user-owned → skips → user stuck on `higher`. Requires duplicating manifest-write logic outside the function.
- **Risk:** High (correctness break)
- **Complexity:** Small code, large correctness debt
- **Verdict:** Rejected

### Option C: Two `install_agent_files` calls with different source dir
- **Summary:** Call the function twice — once for base, once for higher overrides.
- **Cons:** Second call rebuilds manifest with only 3 entries (fresh `manifest_tmp`), overwriting the full 9-agent manifest. Requires manifest-append refactoring. Larger blast radius.
- **Risk:** Medium (manifest corruption)
- **Complexity:** Medium (requires refactor)
- **Verdict:** Rejected

## Advisor Findings

Approach A round-trip confirmed by tracing `install.sh:234-286`. Both directions work via the managed-update branch (lines 259-263): `cmp -s` fails (source ≠ dest), recorded_hash == current_hash, marker present → overwrites, manifest records new hash. User-edit detection unchanged (keys off recorded != current).

Advisor explicitly rejected the planner's `validate-vendored-agents.js` extension as beyond AC — `install.sh:275` catches missing-marker at install time and is sufficient. Skip.

Skip planner's UX confirmation lines and naming-collision README note — not in AC.

## Selected Approach

**Approach A — profile-aware source resolution inside the loop.**

Rationale: Only approach where `common→higher→common` round-trip is correct without new state. Minimal diff, no new manifest mechanism, extends existing managed-update detection.

## Implementation Constraints

1. Override files MUST contain `kaola-workflow-managed-agent: true` — copy base attribution block verbatim, change only `model: sonnet` → `model: opus`, regenerate `source-sha256` to match override file's own content. Keep `upstream:`, `source-commit:`, `source-blob-sha:` from base (upstream attribution for a derivative).
2. `name`, `description`, `tools` in override frontmatter stay identical to base.
3. `PROFILE=common` default in install.sh; `--profile=common|higher` flag mirrors `--forge=*` idiom.
4. Override source resolution: inside `install_agent_files` loop, before `local source_file=` assignment.
5. Do NOT touch post-install verification loop (lines 457-502) — existence-only check, profile-agnostic.

## Out of Scope (explicit)
- `lower` profile
- Per-agent override flag beyond predefined profiles
- Separate manifest for overrides
- "Current profile" state file
- Migration shim for existing installs
- `uninstall.sh` changes
- `validate-vendored-agents.js` extension for override files
- Per-agent console confirmation lines
- Codex TOML changes

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
