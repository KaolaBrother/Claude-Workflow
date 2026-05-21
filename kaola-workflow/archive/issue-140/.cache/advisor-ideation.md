# advisor-ideation output — issue-140

## Verdict: Approach A confirmed. Phase 3 ready after phase2 file written.

## Round-trip trace (confirmed against install.sh)

- `manifest_tmp` fresh per install (line 235), mv'd over old (line 286)
- Line 281 records `sha256_file "$dest"` — hash of what's on disk after any override
- `common→higher`: source(opus) ≠ dest(sonnet), recorded(sonnet) == current(sonnet), marker present → overwrite, manifest→opus_hash
- `higher→common`: source(sonnet) ≠ dest(opus), recorded(opus) == current(opus) → overwrite, manifest→sonnet_hash
- User-edit protection survives (keys off recorded != current)

## Override file construction (required)

Override files MUST contain `kaola-workflow-managed-agent: true` in attribution comment — `install.sh:275-279` hard-fails otherwise.

Construction: copy base attribution block verbatim, change only `model: sonnet` → `model: opus`, regenerate `source-sha256` to match override's own content. Keep `upstream:`, `source-commit:`, `source-blob-sha:` from base (correct upstream attribution for a derivative).

## Reject planner's validator extension

`validate-vendored-agents.js` extension is beyond AC. `install.sh:275` catches missing-marker at install time. Adding a recursive `profiles/*/` validator is new maintenance surface not worth it for #140. Skip.

## Skip planner's UX floats

Per-agent confirmation lines and "naming collision" README note are not in AC. Skip.

## Override file constraints

- `model: opus` is the only frontmatter change
- `name`, `description`, `tools` stay identical to base
- `source-sha256` is self-referential to override file content (correct, necessary)
