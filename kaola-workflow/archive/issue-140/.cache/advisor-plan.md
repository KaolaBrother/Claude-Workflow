# advisor-plan output — issue-140

## Verdict: Plan implementable. Phase 4 ready.

## Resolution: source-sha256

Architect says keep base value; Phase 2 advisor said regenerate. **Architect wins.**
`validate-vendored-agents.js` only checks top-level `agents/*.md` — override files not validated. Install.sh manifest tracks dest hashes separately. Skipping recomputation is cheaper and nothing depends on the field for override files.

## Phase 4 Read-Before-Write Warnings

1. **README.md** — Phase 4 must read the current file before applying the 4-column table patch. Confirm column structure (currently 3 columns: Agent / Phase / Model). If table structure differs, adjust the patch.

2. **CHANGELOG.md** — Phase 4 must confirm `### Added` subsection exists under `[Unreleased]`. If missing, create it before inserting the entry.

## Round-trip Trace (confirmed)

- First-time `--profile=higher`: dest absent → cp from override, manifest=opus_hash ✓
- First-time common: dest absent → cp from base, manifest=sonnet_hash ✓
- higher→common: recorded(opus)==current(opus), marker present → managed-update overwrites sonnet, manifest=sonnet_hash ✓
- common→higher: symmetric ✓
- User-edit protection: recorded≠current → skip, independent of PROFILE ✓

## Two-line bash replacement at :241 (confirmed)

`source_file` is local on first line, reassigned inside `if` without `local` (correct — already in local scope). cmp -s sees post-resolution value. hash at line 281 records sha256 of actual dest, not source_file. Correct.

## Round-trip Validation Environment Note

Manual round-trip validation mutates real `~/.claude/agents/*.md`. Phase 4 should either:
(a) Use a temp AGENTS_DIR override: `AGENTS_DIR=/tmp/test-agents ./install.sh --profile=higher`
(b) Skip manual validation and rely on `npm test` + `bash -n install.sh`
**Choose option (a)** — temp dir is safer and provides actual behavioral proof without touching user's real install.

## No Gaps Found

Build sequence is parallel-safe, write sets are disjoint, validation commands are exact.
