# Code Explorer — Issue #84: Config/Docs Alignment

## Implementation Ground Truth

`scripts/kaola-workflow-claim.js:62-70` — `readPriorityConfig(root)`:
```js
function readPriorityConfig(root) {
  const file = path.join(root, '.kaola-workflow.json');
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed.top_tier_labels) ? parsed.top_tier_labels : ['P0', 'P1'];
  } catch (_) {
    return ['P0', 'P1'];
  }
}
```
- File: `<repoRoot>/.kaola-workflow.json` (dot-prefixed, repo root)
- Key: `top_tier_labels`
- Default: `['P0', 'P1']`
- Single-layer; no `kaola-workflow/config.json` layer anywhere in live code
- Called at line 90 by `listOpenIssues(root)`

`plugins/kaola-workflow/scripts/kaola-workflow-claim.js:62-70` — identical vendored copy.

## All Config Key Hits

**`top_tier_labels` (actual key):**
- `scripts/kaola-workflow-claim.js:63,66,90`
- `plugins/kaola-workflow/scripts/kaola-workflow-claim.js:63,66,90`

**`priority_top_tier_labels` (documented key — NOT in live code):**
- `commands/workflow-init.md:136`
- `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md:83`
- `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md:83`
- `plugins/kaola-workflow-gitlab/commands/workflow-init.md:136`
- `CHANGELOG.md:306`
- Investigation docs and archive (stale)

**`.kaola-workflow.json` (actual file):**
- `scripts/kaola-workflow-claim.js:63`
- `plugins/kaola-workflow/scripts/kaola-workflow-claim.js:63`

**`kaola-workflow/config.json` (documented path — NOT in live code):**
- `commands/workflow-init.md:136`
- `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md:83`
- `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md:83`
- `plugins/kaola-workflow-gitlab/commands/workflow-init.md:136`
- `CHANGELOG.md:306`
- Investigation docs and archive (stale)

## Affected Docs Files (4 live, 1 CHANGELOG)

| File | Line | Wrong text |
|------|------|-----------|
| `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md` | 83 | `kaola-workflow/config.json` (`priority_top_tier_labels`) |
| `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md` | 83 | `kaola-workflow/config.json` (`priority_top_tier_labels`) |
| `commands/workflow-init.md` | 136 | `kaola-workflow/config.json` (`priority_top_tier_labels`) |
| `plugins/kaola-workflow-gitlab/commands/workflow-init.md` | 136 | `kaola-workflow/config.json` (`priority_top_tier_labels`) |
| `CHANGELOG.md` | 306 | describes two-layer design with wrong path+key |

## Classifier Pipeline

`scripts/kaola-workflow-classifier.js:58-69`: reads only `~/.config/kaola-workflow/config.json` for `parallel_mode`. No involvement with priority labels.

## Other Config Keys from `.kaola-workflow.json`

Only `top_tier_labels` is read from `.kaola-workflow.json`. No other keys.

## Test Patterns

- Main test: `scripts/simulate-workflow-walkthrough.js` — hand-rolled assert, spawns claim.js subcommands
- NO existing test exercises `readPriorityConfig` or `top_tier_labels`
- Test pattern: `spawnSync(process.execPath, [claimScript, 'subcommand', '--flag', 'value'], { cwd: tmpRoot, env: {...}, encoding: 'utf8' })`
- Tests use `assert.strictEqual`, `assert.ok`, `assert(!condition)`

## README/Docs Coverage

- `docs/api.md`: no mention of `.kaola-workflow.json` or priority label config
- `docs/architecture.md`: no mention
- `README.md`: only mentions `~/.config/kaola-workflow/config.json` for `parallel_mode`/`pr_auto_merge` — priority label sorting not documented at all

## Root Cause

Issue #35 planned a two-layer design (`kaola-workflow/config.json` + `priority_top_tier_labels`) but shipped a simpler single-layer (`.kaola-workflow.json` + `top_tier_labels`). Documentation was never updated to match the shipped code.
