# Phase 5 - Review: issue-114

## Code Review Findings

### CRITICAL
none

### HIGH
1. **`--json` CLI flag (5 occurrences, 3 files)** — `tea` uses `--output json`, not `--json field,list`. All 5 occurrences used the glab flag syntax verbatim. Affected files: `commands/kaola-workflow-phase1.md`, `commands/workflow-next.md`, `skills/kaola-workflow-next/SKILL.md`. **FIXED** via review-fix-1.md.

2. **`plugin_root` missing `-gitea` suffix** — `skills/kaola-workflow-init/SKILL.md` had `plugin_root="plugins/kaola-workflow"` instead of `plugins/kaola-workflow-gitea`. Step 5 (install Codex agent profiles) would have silently failed. **FIXED** via review-fix-1.md.

### MEDIUM/LOW
- **MEDIUM**: `mr_auto_merge` field name in `commands/kaola-workflow-phase6.md` line 615 — speculative; the field in `sink-pr.js` (issue #112) may be `pr_auto_merge`. Deferred to issue #112 implementation.
- **LOW**: `"merge-requests"` keyword in both plugin.json manifests — Gitea uses `pull-requests` terminology. **FIXED** via review-fix-1.md (batched with HIGH fixes).

## Security Review
ran: no (N/A)

File-risk scan: all 33 files are markdown, JSON, TOML, and verbatim shell hooks. No auth, payments, user data, external API calls, or secrets. Verbatim .sh files are pre-existing gitlab hooks already in production.

### Findings
none

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-reviewer | invoked | .cache/code-reviewer.md | |
| security-reviewer | N/A | .cache/security-reviewer.md | no security-sensitive files touched |
| review-fix executors | invoked | .cache/review-fix-1.md | HIGH-1 (--json flag), HIGH-2 (plugin_root), LOW (merge-requests keyword) |
| advisor critical gate | N/A | — | no CRITICAL findings |

## Fixes Applied
1. `--json field,list` → `--output json` in 5 occurrences (commands/kaola-workflow-phase1.md, commands/workflow-next.md, skills/kaola-workflow-next/SKILL.md)
2. `plugin_root="plugins/kaola-workflow"` → `plugin_root="plugins/kaola-workflow-gitea"` + find glob in skills/kaola-workflow-init/SKILL.md
3. `"merge-requests"` → `"pull-requests"` in .claude-plugin/plugin.json and .codex-plugin/plugin.json

## Validation Evidence
- Targeted check: `grep -rn '\-\-json'` → empty (no --json remaining)
- Targeted check: `grep -n 'plugin_root'` → shows `plugins/kaola-workflow-gitea` 
- Targeted check: `grep -n 'merge-requests'` → empty
- Forbidden-token check: 0 hits (cited from Phase 4 + re-confirmed post-fix)
- Evidence path: .cache/review-fix-1.md

## Follow-Up Items
- MEDIUM: `mr_auto_merge` field name in phase6.md line 615 — verify against `sink-pr.js` config schema when issue #112 lands; update `plugins/kaola-workflow-gitea/commands/kaola-workflow-phase6.md` accordingly

## Review Status
PASSED WITH FOLLOW-UPS
