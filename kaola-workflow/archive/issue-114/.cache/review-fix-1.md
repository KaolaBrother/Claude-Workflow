# Review Fix 1: HIGH findings from code-reviewer — issue-114

## Fixes Applied

### HIGH-1: Replace --json with --output json (5 occurrences in 3 files)
- commands/kaola-workflow-phase1.md line 213: `tea issues view N --json title -q .title` → `tea issues view N --output json`
- commands/workflow-next.md line 53: `--json number,title,state,labels` → `--output json`
- commands/workflow-next.md line 94: `--json number,title,body,labels` → `--output json`
- commands/workflow-next.md line 206: `--json number,title,state,labels,assignees,updatedAt,url` → `--output json`
- skills/kaola-workflow-next/SKILL.md line 63: `--json number,title,state,labels` → `--output json`
- skills/kaola-workflow-next/SKILL.md line 171: `--json number,title,state,labels,assignees,updatedAt,url` → `--output json`

### HIGH-2: Fix plugin_root path in skills/kaola-workflow-init/SKILL.md
- line 116: `plugin_root="plugins/kaola-workflow"` → `plugin_root="plugins/kaola-workflow-gitea"`
- line 118: find glob `'*/kaola-workflow/*/scripts/...'` → `'*/kaola-workflow-gitea/*/scripts/...'`

### LOW: Replace merge-requests keyword with pull-requests
- .claude-plugin/plugin.json: `"merge-requests"` → `"pull-requests"`
- .codex-plugin/plugin.json: `"merge-requests"` → `"pull-requests"`

## Targeted Validation (confirmed by fix agent)
1. No `--json` flag remaining in gitea files (grep returned empty)
2. plugin_root shows `plugins/kaola-workflow-gitea` on line 116
3. No `merge-requests` keyword remaining (grep returned empty)
4. Forbidden-token check: 0 hits

## Status
ALL HIGH FINDINGS RESOLVED
