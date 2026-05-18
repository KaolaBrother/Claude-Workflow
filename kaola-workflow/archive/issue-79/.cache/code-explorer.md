# Code Explorer — Issue #79: Unify CLAUDE.md + AGENTS.md across workflow-init paths

## Summary

Four init paths exist (not three as the issue title states):

| Path | File | Runtime |
|------|------|---------|
| Claude Code GitHub/combined | `commands/workflow-init.md` | Claude Code |
| Claude Code GitLab-only | `plugins/kaola-workflow-gitlab/commands/workflow-init.md` | Claude Code |
| Codex GitHub | `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md` | Codex |
| Codex GitLab | `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md` | Codex |

NOTE: GitHub Codex plugin (`plugins/kaola-workflow/`) is NOT allowed to have a `commands/` dir — validator at `scripts/validate-kaola-workflow-contracts.js:58` hard-forbids it.

## What Each Path Currently Writes

### Claude commands (both GitHub + GitLab variants)
- Create/update `CLAUDE.md` only — full ~80-line Kaola-Workflow section template (lines 84–163)
- Non-Negotiable Rules template = 6 bullets (issue spec requires canonical 5)
- NO `AGENTS.md` created
- NO mention of `AGENTS.md`

### Codex skills (both GitHub + GitLab variants)
- Create/update `AGENTS.md` only — 13-bullet `## Kaola-Workflow` addendum (lines 59–78)
- Explicit rule at line 25: "Do not create or edit CLAUDE.md." (must be removed per issue #79)
- NO `CLAUDE.md` created

## AGENTS.md / CLAUDE.md in Repo Root
- `CLAUDE.md` exists (82 lines, well under 200-line limit)
- `AGENTS.md` does NOT exist in the repo root (no Codex-mode init has run on this repo)

## Differences between GitHub and GitLab Codex skills
Only forge-specific substitutions:
- "GitHub issues" → "GitLab issues" (line 66)
- `kaola-workflow-claim.js` + `watch-pr` → `kaola-gitlab-workflow-claim.js` + `watch-mr` (line 76)
- Roadmap footer (line 85)

## Validator Fixed Constraints

### `scripts/validate-workflow-contracts.js:139–146`
assertConcept on `commands/workflow-init.md` — must contain:
- `kaola-workflow/.roadmap/issue-*.md`
- `do not purge`
- `kaola-workflow/{project}/`
- `workflow-state.md`
- `fast-summary.md`
- `.cache/`
Already present in CLAUDE.md template in the command. Safe.

### `scripts/validate-kaola-workflow-contracts.js:89`
assertIncludes on GitHub Codex SKILL.md: 'Active folder lifecycle' — must keep.
Currently at SKILL line 76. After change: will remain in the CLAUDE.md template section.

### `scripts/validate-kaola-workflow-contracts.js:183–190`
assertConcept on GitHub Codex SKILL.md for the same 6 durable-state tokens.
Currently in the AGENTS.md addendum section. After change: will be in the CLAUDE.md template section.

### `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js:43–57`
assertNoForbidden on ALL GitLab skill/command files — must NOT contain:
- `$HOME/.claude/kaola-workflow/scripts`
- `./scripts`
- `plugins/kaola-workflow/scripts`
- `gh`, `github.com`, `api.github.com`, `GitHub`
- `PR URL`, `PR number`, `pull request`

### Shared-scripts mirror requirement
`scripts/validate-workflow-contracts.js` is in `sharedScripts` list — the root version and
`plugins/kaola-workflow/scripts/validate-workflow-contracts.js` must be identical.
Any changes to `scripts/validate-workflow-contracts.js` must be mirrored to `plugins/kaola-workflow/scripts/validate-workflow-contracts.js`.

### GitLab validator: NO durable-state assertions for GitLab init SKILL
This is a confirmed gap the issue asks us to close (add analogous assertions to
`validate-kaola-workflow-gitlab-contracts.js`).

## Tests
- `scripts/simulate-workflow-walkthrough.js` — primary test suite (hand-rolled, must exit 0)
- `scripts/validate-workflow-contracts.js` — root command/skill contract assertions
- `scripts/validate-kaola-workflow-contracts.js` — GitHub Codex plugin assertions
- `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` — GitLab assertions
- No tests execute the init markdown prose end-to-end; all assertions are assertIncludes/assertConcept on file content.

## Canonical 5-Bullet Non-Negotiable Rules (from issue #79)
1. Think before coding — state assumptions, surface ambiguity, stop and ask if unclear
2. Simplicity first — minimum code, no speculative abstractions, no impossible error handling
3. Surgical changes — touch only what task requires, match existing style
4. Goal-driven execution — define verifiable success criteria before starting, prefer failing-test-first, loop until pass
5. Read before writing — inspect target file and surrounding conventions immediately before editing

Current `commands/workflow-init.md` Non-Negotiable Rules template has 6 bullets using shorter forms — must be updated to canonical 5.
Current repo `CLAUDE.md` Non-Negotiable Rules has 6 bullets — must be updated to canonical 5.

## docs-lookup
N/A — internal patterns sufficient. No external library/API/framework behavior involved.
