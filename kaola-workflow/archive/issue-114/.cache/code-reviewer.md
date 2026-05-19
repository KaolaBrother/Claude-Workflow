# Code Review: issue-114

## Summary
| Severity | Count | Blocking Phase 6? |
|----------|-------|-------------------|
| HIGH     | 2     | Yes |
| MEDIUM   | 1     | No |
| LOW      | 1     | No |

## HIGH-1: Incorrect `tea` CLI flag `--json` on 5 occurrences

Tea does not accept `--json field1,field2,...` syntax; that's glab/gh convention. Tea uses `--output json`.

### commands/kaola-workflow-phase1.md, line 213
```
- ONLINE: `tea issues view N --json title -q .title`
```
Fix: `tea issues view N --output json` (parse title from JSON output; remove `-q .title` jq syntax)

### commands/workflow-next.md, lines 53, 94, 206
- Line 53: `tea issues list --limit 100 --json number,title,state,labels`
- Line 94: `tea issues view "$KAOLA_TARGET_ISSUE" --json number,title,body,labels`
- Line 206: `tea issues list --limit 100 --json number,title,state,labels,assignees,updatedAt,url`
Fix: Replace `--json ...` with `--output json` (drop field list — tea returns all fields)

### skills/kaola-workflow-next/SKILL.md, lines 63, 171
- Line 63: `tea issues list --limit 100 --json number,title,state,labels`
- Line 171: `tea issues list --limit 100 --json number,title,state,labels,assignees,updatedAt,url`
Fix: Replace `--json ...` with `--output json`

## HIGH-2: `plugin_root` path missing `-gitea` suffix in skills/kaola-workflow-init/SKILL.md

Lines 116-118:
```bash
plugin_root="plugins/kaola-workflow"
if [ ! -f "$plugin_root/scripts/install-codex-agent-profiles.js" ]; then
  script_path="$(find "$HOME/.codex/plugins/cache" -path '*/kaola-workflow/*/scripts/install-codex-agent-profiles.js' -print -quit 2>/dev/null)"
```
The substitution missed the plugin root path. Step 5 (install Codex agent profiles) will silently fail.
Fix:
- `plugin_root="plugins/kaola-workflow-gitea"`
- glob pattern: `'*/kaola-workflow-gitea/*/scripts/install-codex-agent-profiles.js'`

## MEDIUM: `mr_auto_merge` field name in commands/kaola-workflow-phase6.md, line 615

Doc line says `mr_auto_merge: true`. When `sink-pr.js` is implemented, the field may be `pr_auto_merge`. Speculative — defer to issue #112 when sink-pr.js is written.

## LOW: `merge-requests` keyword in both plugin.json files

`.claude-plugin/plugin.json` line 17 and `.codex-plugin/plugin.json` line 18 still have `"merge-requests"`. Should be `"pull-requests"` for Gitea terminology.

## Non-findings (confirmed correct)
- JSON syntax valid in all 3 JSON files
- `brandColor: "#609926"` present in `.codex-plugin/plugin.json`
- No remaining `glab|gitlab|GitLab|sink-mr.js|watch-mr|mr_url|issue_iid|KAOLA_SINK=mr|kaola-gitlab-` tokens
- `tea issues` (plural) used correctly
- `sink: mr` compatibility alias retention is intentional
- Structural consistency across all 13 files confirmed
- Script forward references are documented known gaps (issues #112/#113)
