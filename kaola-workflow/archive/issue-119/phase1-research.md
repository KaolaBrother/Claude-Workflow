# Phase 1 - Research / Discovery: issue-119

## Deliverable
Add `KAOLA_WORKFLOW_OFFLINE` env var check to the Gitea PR sink (`kaola-gitea-workflow-sink-pr.js`) and GitLab MR sink (`kaola-gitlab-workflow-sink-mr.js`). When `KAOLA_WORKFLOW_OFFLINE=1`, both sinks must skip git push and forge API calls, record deterministic placeholder metadata (`OFFLINE_PLACEHOLDER`, `0`), and return without error. Add subprocess tests covering the offline path for each sink.

## Why
`KAOLA_WORKFLOW_OFFLINE=1` is documented for local tests and air-gapped usage. The GitHub sink honors it (early-return at line 115), but the Gitea and GitLab sinks ignore it — they always push and call forge APIs unless the test-only `skipPush` injection is used. This breaks forge parity and makes offline Phase 6 behavior unreliable.

## Affected Area
- `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-pr.js` — `ensurePullRequest()`, around lines 93-158
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js` — `ensureMergeRequest()`, around lines 90-153
- `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js` — add offline subprocess test (after line 444)
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js` — add offline subprocess test (after line 479)

## Key Patterns Found
1. **GitHub offline early-return**: `scripts/kaola-workflow-sink-pr.js:7` — `const OFFLINE = process.env.KAOLA_WORKFLOW_OFFLINE === '1';` at module load; `lines 115-134` — early-return block before push; records `prUrl='OFFLINE_PLACEHOLDER'`, `prNumber=0`; soft-logs metadata commit failures
2. **Forge exec guards**: `plugins/kaola-workflow-gitea/scripts/kaola-gitea-forge.js:6` / `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-forge.js:6` — `teaExec`/`glabExec` already return `''` when `OFFLINE=1`, but plugin sinks don't have their own early-return so the assert on `pr_number`/`mr_iid` crashes them
3. **Gitea `discoverProject` fallback**: `plugins/kaola-workflow-gitea/scripts/kaola-gitea-forge.js:104` — falls back to `git remote get-url origin` even when `teaExec` returns `''`; the offline early-return must come BEFORE `forge.discoverProject()` call (line 112 in sink)

## Test Patterns
- Framework: hand-rolled `assert` (Node built-in), no runner
- Location: `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js`, `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`
- Offline test structure: `setupRealRepo()` + `spawnSync(process.execPath, [sinkScript, '--branch', ..., '--project', ...], { env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1', ... } })` — must use subprocess because `OFFLINE` is a module-load-time constant and cannot be toggled in-process
- Existing examples: Gitea tests 15-18 (lines 376-444), GitLab tests blocks 2-5 (lines 406-479) — both cover `sink-merge.js`, not `sink-pr.js`/`sink-mr.js`

## Config & Env
- `KAOLA_WORKFLOW_OFFLINE=1` — triggers offline mode
- No config files needed; plugin sinks do not read `~/.config/kaola-workflow/config.json`

## External Docs
None — implementation mirrors existing codebase patterns only.

## GitHub Issue
KaolaBrother/Kaola-Workflow#119

## Completeness Score
10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | internal patterns sufficient; no external API/framework behavior needed |

## Notes / Future Considerations
- `skipPush` injection tests remain valid for in-process unit testing of other behaviors; they complement (not replace) the new subprocess offline tests
- The Gitea sink returns `{ pr, project }`; the offline branch must return the same shape with placeholder values so callers do not break
- The GitLab sink returns `mr` directly; the offline branch must return a shape with `mr_iid: 0`, `mr_url: 'OFFLINE_PLACEHOLDER'`
- Both sinks commit metadata locally (soft-failure on error) before returning, consistent with GitHub sink behavior
