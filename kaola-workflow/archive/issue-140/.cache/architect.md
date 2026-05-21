# code-architect output — issue-140

## Files to Create

| File | Purpose |
|------|---------|
| `agents/profiles/higher/code-architect.md` | Opus override; base file with `model: opus` on line 4 |
| `agents/profiles/higher/code-reviewer.md` | Opus override; base file with `model: opus` on line 5 |
| `agents/profiles/higher/security-reviewer.md` | Opus override; base file with `model: opus` on line 5 |

## Files to Modify

| File | Changes |
|------|---------|
| `install.sh` | (a) `PROFILE=common` default; (b) `--profile=*` flag case; (c) usage string; (d) PROFILE validator; (e) profile-aware source resolution |
| `README.md` | (a) 4th column in agent table; (b) `#### Agent profiles` section in Installation |
| `CHANGELOG.md` | `### Added` entry under `[Unreleased]` |

## Override File Construction

- Copy base verbatim
- Change ONLY `model: sonnet` → `model: opus`
- Keep `source-sha256` from base (documents upstream ECC provenance, not local derivative hash)
- All other lines verbatim: `source-commit`, `source-blob-sha`, `upstream`, `name`, `description`, `tools`

## install.sh Changes (exact)

**Change 1 — PROFILE default (after line 42)**
```bash
PROFILE=common
```

**Change 2 — usage() string (line 45)**
Replace:
```
echo "Usage: ./install.sh [--yes] [--forge=github|gitlab|gitea] [--no-settings-merge]"
```
with:
```
echo "Usage: ./install.sh [--yes] [--forge=github|gitlab|gitea] [--no-settings-merge] [--profile=common|higher]"
```

**Change 3 — flag-parsing loop (insert before `*)` catch-all at line 75)**
```bash
    --profile=*)
      PROFILE="${1#--profile=}"
      shift
      ;;
    --profile)
      if [[ -z "${2:-}" ]]; then
        echo "--profile requires common or higher" >&2
        usage >&2
        exit 2
      fi
      PROFILE="$2"
      shift 2
      ;;
```

**Change 4 — PROFILE validator (insert after line 81, after `done`)**
```bash
case "$PROFILE" in
  common|higher) ;;
  *)
    echo "Unknown profile: $PROFILE (must be common or higher)" >&2
    usage >&2
    exit 2
    ;;
esac
```

**Change 5 — profile-aware source resolution (replaces line 241)**
Current:
```bash
    local source_file="$SOURCE_AGENTS_DIR/$file_name"
```
Replace with:
```bash
    local source_file="$SOURCE_AGENTS_DIR/$file_name"
    if [[ "$PROFILE" == "higher" && -f "$SOURCE_AGENTS_DIR/profiles/higher/$file_name" ]]; then
      source_file="$SOURCE_AGENTS_DIR/profiles/higher/$file_name"
    fi
```

## README.md Changes

**Agent table** — add 4th column `Higher profile` with `yes` for code-architect, code-reviewer, security-reviewer.

**Installation section** — add `#### Agent profiles` subsection with usage examples:
```bash
./install.sh --profile=higher
./install.sh --forge=gitlab --profile=higher
./install.sh  # resets overridden agents back to Sonnet
```

## CHANGELOG.md Change

Under `## [Unreleased]` > `### Added`:
```
- **Agent profile system: `--profile=higher` flag for `install.sh`** (issue #140): ...
```

## sha256 Decision

Override files keep the BASE file's `source-sha256`. This field documents upstream ECC provenance; override files are derivatives. No recomputation needed.

## Build Sequence

1. Create 3 override files (parallel — disjoint write sets)
2. Modify install.sh (parallel with step 1)
3. Modify README.md, CHANGELOG.md (parallel with 1&2 and each other)
4. `bash -n install.sh` (depends on step 2)
5. `npm test` (depends on steps 1-3)
6. Round-trip validation: `./install.sh --profile=higher`, verify `model: opus`; `./install.sh`, verify `model: sonnet`; repeat

## Items NOT to Implement

- `lower` profile, per-agent flags, separate manifest, validator extension, uninstall.sh changes, Codex TOMLs, sha256 recomputation
