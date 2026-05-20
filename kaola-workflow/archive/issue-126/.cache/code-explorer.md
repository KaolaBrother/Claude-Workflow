# Code Explorer Output — Issue #126

## All 7 Cited Locations — Current State

### 1. README.md:356-360 — Release Version Block
Current text (lines 354-360):
```
Current official release versions:

- Claude Code command install, GitHub edition: `3.10.0`
- Claude Code command install, GitLab edition: `3.10.0`
- Codex `kaola-workflow` plugin manifest: `1.4.1`
- Codex `kaola-workflow-gitlab` plugin manifest: `1.4.1`
- Codex `kaola-workflow-gitea` plugin manifest: `1.5.0`
```
Status: Lines 356-357 already fixed (3.10.0) by issue #125.
**Lines 358-359 STALE**: README shows `1.4.1` but actual plugin.json files show `1.5.0` for both `kaola-workflow` and `kaola-workflow-gitlab`.
Also missing: no "Claude Code command install, Gitea edition" line (issue does not explicitly require it).

### 2. README.md:424-426 — Automation Scripts Install Locations
Current text:
```
The workflow includes automation scripts installed by `install.sh` to
`~/.claude/kaola-workflow/scripts/` for the GitHub edition or
`~/.claude/kaola-workflow-gitlab/scripts/` for the GitLab edition.
```
**STALE**: `~/.claude/kaola-workflow-gitea/scripts/` omitted.

### 3. README.md:465-468 — Environment Variable Table
Current text (relevant rows):
- `KAOLA_WORKFLOW_OFFLINE`: "Skip GitHub/GitLab calls for local tests or air-gapped usage"
- `KAOLA_WORKFLOW_FORCE_FF_FAIL`: "(GitHub and GitLab)"
- `KAOLA_WORKFLOW_FORCE_MERGE_IMPOSSIBLE`: "(GitHub and GitLab)"
**STALE**: All three omit Gitea. `docs/api.md:57` already says OFFLINE applies to all three.

### 4. README.md:627-628 — Hooks Re-run Instruction
Current text:
```
- If hooks are missing, re-run `./install.sh --forge=github` (or
  `--forge=gitlab`). Do not edit `~/.claude/settings.json` directly —
```
**STALE**: `--forge=gitea` omitted.

### 5. docs/workflow-state-contract.md:9
Current text:
```
- GitHub issues are the canonical backlog and closure source when online.
```
**STALE**: GitHub-specific; should be forge-neutral.

### 6. docs/api.md:7
Current text:
```
The Phase 6 sink is responsible for delivering completed work to the repository and updating GitHub/GitLab metadata.
```
**STALE**: "GitHub/GitLab" should include Gitea. Rest of docs/api.md is well-updated.

### 7. docs/api.md:51-53
Current text:
```
- **`KAOLA_WORKFLOW_FORCE_FF_FAIL=N`** — ... Applies to both GitHub and GitLab editions.
- **`KAOLA_WORKFLOW_FORCE_MERGE_IMPOSSIBLE=token`** — ... Applies to both GitHub and GitLab editions.
- **`KAOLA_WORKFLOW_DEBUG_CWD=path`** — ... Applies to both editions.
```
**STALE**: All three say "both editions"; Gitea omitted.

## Actual Codex Plugin Manifest Versions
| Plugin | Manifest version |
|--------|-----------------|
| `kaola-workflow` (GitHub) | `1.5.0` |
| `kaola-workflow-gitlab` | `1.5.0` |
| `kaola-workflow-gitea` | `1.5.0` |

## Additional README.md Omissions Found (Beyond Issue Scope)
- Line 442: "open a GitHub PR via `gh pr create`" — GitLab/Gitea equivalents exist
- Line 457: "GitHub issue/PR state as the durable coordination contract" — forge-specific
- Line 533: "Fetch open GitHub issues" in agent-directed selection step — forge-neutral behavior
- Lines 585+: `## GitHub roadmap cycle` section header/text — entire section GitHub-branded
- Line 674: "GitHub issue state used to reject closed issues" — GitHub-specific

## Validation Contracts
No validator script checks forge-consistency in docs or version strings in README.md's release block. No test contracts will break due to doc changes.

## Prior Doc-Update Patterns
- Bundle doc changes with CHANGELOG entry in the same commit
- Reference issue number in CHANGELOG bullet
- Name specific files and line regions changed
- See issue #122 (docs/api.md update) as recent example

## Test Framework
No integration test or validate-*.js script asserts on the specific strings being updated for issue #126. Safe to edit without validator impact.
