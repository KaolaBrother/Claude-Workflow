# Phase 1 - Research / Discovery: issue-140

## Deliverable
Introduce `common` (default) and `higher` profiles for Claude Code agents:
- `agents/profiles/higher/` directory with 3 override files (`code-architect.md`, `code-reviewer.md`, `security-reviewer.md`) setting `model: opus`
- `install.sh` gains `--profile=common|higher` flag (default `common`); on `higher`, the 3 override files copy over their base counterparts after base install
- README documents both profiles and cost/coverage tradeoff
- CHANGELOG `[Unreleased]` entry under Added

## Why
Align Claude Code agent model assignments with Codex effort tiering. The three heavy reasoning agents (code-architect, code-reviewer, security-reviewer) use `model_reasoning_effort: high` in the Codex side, but `model: sonnet` on the Claude Code side — one tier behind. The `higher` profile closes this asymmetry for users who want deeper coverage and can absorb ~3× cost increase for those three agents.

## Affected Area
- `agents/profiles/higher/code-architect.md` (new)
- `agents/profiles/higher/code-reviewer.md` (new)
- `agents/profiles/higher/security-reviewer.md` (new)
- `install.sh` — add `--profile=` flag and override install logic (~15-25 lines)
- `README.md` — agent table update + Installation section profile docs
- `CHANGELOG.md` — Added entry

No changes to: Codex TOMLs (`plugins/`), `REQUIRED_AGENTS` array, `validate-vendored-agents.js`, `validate-workflow-contracts.js`.

## Key Patterns Found

1. **Flag pattern** — `install.sh:54`: `--forge=*` uses `FORGE="${1#--forge=}"` and `shift`; `--profile=common|higher` uses same idiom → `PROFILE="${1#--profile=}"` with `PROFILE=common` default at init
2. **install_agent_files** — `install.sh:226-297`: iterates `REQUIRED_AGENTS[@]`, copies source → dest, tracks sha256 in `.kaola-workflow-agent-manifest`. Override step runs AFTER this function and must update manifest entries for the 3 overridden agents to keep re-install and profile switching correct.
3. **Manifest update for overrides** — must remove old entries for the 3 agents (`grep -v`) and append new entries (`printf '%s\t%s\n' "$file_name" "$(sha256_file "$dest")"`) so that `common` → `higher` → `common` round-trip restores sonnet agents (base install sees matching hash, treats as managed, overwrites).
4. **validate-vendored-agents.js:39-47** — `readdirSync('agents/')` filtered to `.md` only; `profiles/` subdirectory not a `.md` file → safe. Validator only iterates the 9 base `expectedAgents`, not recursively → override files not checked by this validator.
5. **Attribution block** — `agents/code-architect.md:7-15`: override files should preserve full attribution block (upstream URL, source-commit, source-blob-sha, source-sha256, license, copyright) and change only `model: sonnet` → `model: opus`.
6. **Verification loop** — `install.sh:476-498`: verifies all `REQUIRED_AGENTS` present in dest after install; no extra verification needed for overrides since they overwrite same paths.

## Test Patterns
- Framework: hand-rolled assert (Node.js), `npm test` chain
- Location: `scripts/simulate-workflow-walkthrough.js` (primary integration), `scripts/validate-vendored-agents.js`, `scripts/validate-workflow-contracts.js`
- Structure: `npm test` = validate-script-sync.js → validate-vendored-agents.js → `bash -n install.sh uninstall.sh` → validate-workflow-contracts.js → simulate-workflow-walkthrough.js
- **No behavioral test for install.sh profile logic** — only `bash -n` syntax check. This AC is verified manually via the install process.

## Config & Env
- No new env vars introduced (profile is a flag, not an env var)
- `PROFILE=common` as new bash variable in install.sh (default)
- `AGENTS_DIR=$HOME/.claude/agents`, `SOURCE_AGENTS_DIR=$SCRIPT_DIR/agents` (existing, reused)

## External Docs
None needed — all patterns are internal.

## GitHub Issue
KaolaBrother/Kaola-Workflow#140

## Completeness Score
10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | no external API/framework behavior needed |

## Notes / Future Considerations
- A `lower` profile (all haiku) is explicitly out of scope per issue — can be added later
- Per-agent overrides beyond predefined profiles are out of scope — keep surface small
- Profile flag is orthogonal to forge flag; both can coexist freely
- `--profile` short form not added (no `-p` shortcut) to avoid collision with potential future flags
