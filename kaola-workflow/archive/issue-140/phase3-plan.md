# Phase 3 - Plan: issue-140

## Blueprint

### Files to Create
| File | Purpose | Key Interfaces |
|------|---------|----------------|
| `agents/profiles/higher/code-architect.md` | Opus override for code-architect | Base file verbatim; `model: sonnet` → `model: opus` on line 4 only |
| `agents/profiles/higher/code-reviewer.md` | Opus override for code-reviewer | Base file verbatim; `model: sonnet` → `model: opus` on line 5 only |
| `agents/profiles/higher/security-reviewer.md` | Opus override for security-reviewer | Base file verbatim; `model: sonnet` → `model: opus` on line 5 only |

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `install.sh` | Add `PROFILE=common` default; `--profile=*` flag case (with two-value form); PROFILE validator; 2-line profile-aware source resolution replacing line 241; update usage string | Enable `--profile=common|higher` flag |
| `README.md` | Add `Higher profile` column to agent table; add `#### Agent profiles` subsection in Installation | Document profiles and cost/coverage tradeoff |
| `CHANGELOG.md` | Add `### Added` entry under `[Unreleased]` | Record user-visible change |

### Build Sequence
1. Create `agents/profiles/higher/` directory and 3 override files (dependency: none; all 3 parallel)
2. Modify `install.sh` — add PROFILE support (dependency: none; parallel with step 1)
3. Modify `README.md` and `CHANGELOG.md` (dependency: none; parallel with 1 & 2; parallel with each other)
4. `bash -n install.sh` syntax check (depends: step 2)
5. `npm test` (depends: steps 1-3)
6. Round-trip validation with temp AGENTS_DIR (depends: steps 1-2)

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | Create all 3 override files | Disjoint write sets (different files) |
| B | Modify install.sh | Disjoint from override files and docs |
| B | Modify README.md, CHANGELOG.md | Disjoint from each other and from groups A/B |
| C | `bash -n`, `npm test`, round-trip | Read-only or isolated temp dir |

### External Dependencies
None — no new packages or imports.

---

## Task List

### Task 1a: Create agents/profiles/higher/code-architect.md
- **File:** `agents/profiles/higher/code-architect.md`
- **Test File:** N/A (not a code file; validated by npm test / install.sh:275)
- **Write Set:** `agents/profiles/higher/code-architect.md`
- **Depends On:** none
- **Parallel Group:** A
- **Action:** CREATE
- **Implement:** Copy `agents/code-architect.md` verbatim. Change ONLY line 4 `model: sonnet` → `model: opus`. Keep all other lines identical including `source-sha256`, `source-commit`, `source-blob-sha`, `upstream`, `name`, `description`, `tools`. Attribution block (with `kaola-workflow-managed-agent: true`) must be present — required by `install.sh:275`.
- **Mirror:** `agents/code-architect.md` lines 1-15 (frontmatter + attribution template)
- **Validate:** `grep '^model:' agents/profiles/higher/code-architect.md` → `model: opus`; `grep 'kaola-workflow-managed-agent: true' agents/profiles/higher/code-architect.md` → present

### Task 1b: Create agents/profiles/higher/code-reviewer.md
- **File:** `agents/profiles/higher/code-reviewer.md`
- **Write Set:** `agents/profiles/higher/code-reviewer.md`
- **Depends On:** none
- **Parallel Group:** A
- **Action:** CREATE
- **Implement:** Same as Task 1a for `agents/code-reviewer.md`. Change line 5 only (`model: sonnet` → `model: opus`).
- **Mirror:** `agents/code-reviewer.md`
- **Validate:** `grep '^model:' agents/profiles/higher/code-reviewer.md` → `model: opus`

### Task 1c: Create agents/profiles/higher/security-reviewer.md
- **File:** `agents/profiles/higher/security-reviewer.md`
- **Write Set:** `agents/profiles/higher/security-reviewer.md`
- **Depends On:** none
- **Parallel Group:** A
- **Action:** CREATE
- **Implement:** Same as Task 1a for `agents/security-reviewer.md`. Change line 5 only.
- **Mirror:** `agents/security-reviewer.md`
- **Validate:** `grep '^model:' agents/profiles/higher/security-reviewer.md` → `model: opus`

### Task 2: Modify install.sh
- **File:** `install.sh`
- **Write Set:** `install.sh`
- **Depends On:** none
- **Parallel Group:** B
- **Action:** MODIFY
- **Implement (5 targeted changes):**

  **2a** — After line 42 (`MERGE_SETTINGS=1`), insert:
  ```bash
  PROFILE=common
  ```

  **2b** — Replace usage string (line 45):
  ```bash
  echo "Usage: ./install.sh [--yes] [--forge=github|gitlab|gitea] [--no-settings-merge] [--profile=common|higher]"
  ```

  **2c** — In flag-parsing while loop, insert before the `*)` catch-all at line 75:
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

  **2d** — After `done` (end of flag loop, line 81), insert PROFILE validator:
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

  **2e** — Inside `install_agent_files`, replace line 241 (`local source_file="$SOURCE_AGENTS_DIR/$file_name"`) with two lines:
  ```bash
      local source_file="$SOURCE_AGENTS_DIR/$file_name"
      if [[ "$PROFILE" == "higher" && -f "$SOURCE_AGENTS_DIR/profiles/higher/$file_name" ]]; then
        source_file="$SOURCE_AGENTS_DIR/profiles/higher/$file_name"
      fi
  ```
  Note: `source_file` is reassigned without `local` (already in local scope from the first line). The `cmp -s` at line 251 sees the resolved value.

- **Mirror:** `--forge=*` idiom at install.sh:54-66
- **Validate:** `bash -n install.sh` (syntax check must pass)

### Task 3a: Modify README.md
- **File:** `README.md`
- **Write Set:** `README.md`
- **Depends On:** none
- **Parallel Group:** B
- **Action:** MODIFY
- **Implement:**
  - READ README.md first to confirm current table structure (expected 3 columns: Agent / Phase / Model)
  - Add `Higher profile` column to agent table (add `| yes |` for code-architect, code-reviewer, security-reviewer; empty for others)
  - Add `#### Agent profiles` subsection under `## Installation > ### Claude Code`:
    ```markdown
    #### Agent profiles

    Pass `--profile=higher` to install `code-architect`, `code-reviewer`, and
    `security-reviewer` on Opus instead of Sonnet (roughly 3× cost for those three
    agents; deeper threat modeling and architecture analysis). All other agents are
    unaffected. Omit the flag (or pass `--profile=common`) for default Sonnet assignments.

    ```bash
    ./install.sh --profile=higher             # GitHub edition, Opus overrides
    ./install.sh --forge=gitlab --profile=higher
    ```

    To revert to Sonnet, re-run without the flag:

    ```bash
    ./install.sh                              # resets overridden agents to Sonnet
    ```
    ```
- **Mirror:** `## Installation > ### Claude Code` section pattern; `--forge` documentation style
- **Validate:** `grep -c 'Higher profile' README.md` → 1; `grep 'profile=higher' README.md` → present; `grep 'docs/agents-source.md' README.md` → still present (validate-workflow-contracts.js:77)

### Task 3b: Modify CHANGELOG.md
- **File:** `CHANGELOG.md`
- **Write Set:** `CHANGELOG.md`
- **Depends On:** none
- **Parallel Group:** B
- **Action:** MODIFY
- **Implement:**
  - READ CHANGELOG.md first to confirm `[Unreleased]` section and `### Added` subsection presence
  - If `### Added` under `[Unreleased]` exists, insert as new first entry; if missing, create `### Added` subsection
  - Entry text:
    ```markdown
    - **Agent profile system: `--profile=higher` flag for `install.sh`** (issue #140): `install.sh` now accepts `--profile=common|higher` (default `common`). The `higher` profile installs `code-architect`, `code-reviewer`, and `security-reviewer` on Opus instead of Sonnet. Switching profiles in either direction re-installs the correct agent variants.
    ```
- **Mirror:** Existing `### Added` entries in CHANGELOG.md
- **Validate:** `grep 'issue #140' CHANGELOG.md` → present

### Task 4: Run validation
- **File:** none (read-only)
- **Depends On:** Tasks 1a, 1b, 1c, 2, 3a, 3b
- **Action:** VALIDATE
- **Commands:**
  ```bash
  # Syntax check
  bash -n install.sh

  # Full test suite
  npm test

  # Round-trip behavioral validation (temp dir — does NOT touch real ~/.claude/agents)
  TEST_AGENTS_DIR="$(mktemp -d)"
  AGENTS_DIR="$TEST_AGENTS_DIR" bash install.sh --profile=higher --no-settings-merge
  grep '^model:' "$TEST_AGENTS_DIR/code-architect.md"    # expect: model: opus
  grep '^model:' "$TEST_AGENTS_DIR/doc-updater.md"       # expect: model: haiku (unchanged)

  AGENTS_DIR="$TEST_AGENTS_DIR" bash install.sh --no-settings-merge
  grep '^model:' "$TEST_AGENTS_DIR/code-architect.md"    # expect: model: sonnet (reverted)

  AGENTS_DIR="$TEST_AGENTS_DIR" bash install.sh --profile=higher --no-settings-merge
  grep '^model:' "$TEST_AGENTS_DIR/code-architect.md"    # expect: model: opus (round-trip)

  rm -rf "$TEST_AGENTS_DIR"
  ```

---

## Advisor Notes

- **source-sha256 in override files:** Keep base value. Documents upstream ECC provenance; override files are derivatives. Install.sh manifest tracks real dest hashes separately. Nothing depends on this field for override files.
- **Phase 4 must read README.md and CHANGELOG.md before patching** — confirm column structure and section presence.
- **Round-trip validation uses temp AGENTS_DIR** — never touches real `~/.claude/agents/`.
- No architect revisions needed. Plan is complete as designed.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | — | No gaps found by advisor; plan complete without revision |
