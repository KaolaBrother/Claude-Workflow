# planner output — issue-140

## Key Codebase Fact Refinements

1. **Manifest is rebuilt from scratch on every install**, not patched. `install_agent_files` writes a fresh `manifest_tmp`, records `sha256_file "$dest"` (hash of what ended up on disk), and `mv`s it over. This resolves the round-trip concern: the manifest always reflects "what we last installed."

2. **Two verification touchpoints**: in-loop marker check (line 275 hard-fail) and post-install existence-only pass (lines 457-502). The post-install pass checks existence only — profile-agnostic, must not be touched.

3. `validate-vendored-agents.js` reads `agents/` non-recursively, excludes `profiles/` subdir — confirmed safe.

## Approach A (RECOMMENDED): Profile-aware source resolution inside the loop

**Summary:** Resolve `source_file` per-agent inside `install_agent_files`, between the `for agent` line and the `local source_file=` assignment. If `PROFILE=higher` AND `$SOURCE_AGENTS_DIR/profiles/higher/$file_name` exists, use override path; else use base. Everything downstream (cmp -s, managed-update detection, manifest write) is unchanged.

**Pros:**
- Round-trip (`common→higher→common`) works for free — manifest records override hash after higher install; on common re-install, cmp -s fails, recorded_hash matches, managed marker present → overwrites with base
- User-edit protection preserved unchanged
- Single manifest, single source of truth
- Filesystem discovery (test `-f`) means future overrides are drop-in with no install.sh edit

**Cons/Risk:** Low — requires managed marker in override files (line 275 hard-fails otherwise)

**Complexity:** Low (~6 lines in install.sh + flag parsing)

## Approach B (REJECTED): After-loop override copy pass

**Why rejected:** Breaks round-trip. After override cp, manifest holds base hashes but dest has override content. On `higher→common`, base install sees recorded_hash (base) ≠ current dest (override) → classifies as user-owned → skips → stuck on higher.

## Approach C (REJECTED): Two `install_agent_files` calls

**Why rejected:** Second call overwrites manifest with only 3 entries, losing other 6. Requires manifest refactoring — larger blast radius.

## Implementation Requirements

1. **Flag parsing** — `PROFILE=common` default + `--profile=*)` case mirroring `--forge=*` idiom
2. **Source resolution** — inside loop before `local source_file=` assignment (between lines 239-241)
3. **Override files MUST carry `kaola-workflow-managed-agent: true`** — line 275 hard-fails otherwise
4. **Override `source-sha256`** — override files record their own sha256 (self-referential); validator checks shape only (`[0-9a-f]{64}`)
5. **Extend `validate-vendored-agents.js`** — add loop over `agents/profiles/*/` asserting frontmatter, managed marker, name, model=opus
6. **UX confirmation** — emit "Installed higher-profile override: X (opus)" when override applied

## Planner Open Fact (confirmed from Phase 1)

planner.md already has `model: opus` in base — correctly excluded from `higher` directory. `--profile=higher` yields 4 opus agents total (planner + 3 overrides: code-architect, code-reviewer, security-reviewer). Matches AC "installs four opus agents."

## Items NOT to Build

- No `lower` profile
- No per-agent override flag
- No separate manifest for overrides
- No "current profile" state file
- No migration shim for existing installs
- No uninstall.sh change
