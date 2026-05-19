# Code Explorer: Issue #111 — Gitea Forge Adapter

## GitLab Forge Adapter Structure (mirror target)

**File:** `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-forge.js`

### Exported functions
| Export | Signature | Notes |
|--------|-----------|-------|
| `CLAIM_LABEL` | `'workflow:in-progress'` | constant |
| `QUEUED_LABEL` | `'workflow:queued'` | constant |
| `glabExec` | `(args, opts?)` | CLI wrapper |
| `normalizeState` | `(raw)` | open/closed/merged/unknown |
| `normalizeProject` | `(raw)` | → {project_id, id, path_with_namespace, web_url} |
| `normalizeIssue` | `(raw)` | → {number, issue_iid, id, title, body, description, state, labels, updated_at, web_url, url} |
| `normalizeMergeRequest` | `(raw)` | → {number, mr_iid, id, title, state, web_url, mr_url, source_branch, target_branch} |
| `projectApiRef` | `(project)` | numeric id or encodeURIComponent(path_with_namespace) |
| `discoverProject` | `(opts?)` | `glab repo view --output json` |
| `listIssues` | `(opts?)` | `glab issue list --output json --per-page N [--state S]` |
| `viewIssue` | `(issueIid, opts?)` | `glab issue view N --output json` |
| `updateIssue` | `(issueIid, opts?)` | `glab issue update N ...labels...assignees` |
| `closeIssue` | `(issueIid)` | `glab issue close N` |
| `createIssueNote` | `(project, issueIid, body, opts?)` | `glab api --method POST .../issues/N/notes` |
| `listIssueNotes` | `(project, issueIid, opts?)` | `glab api .../issues/N/notes` |
| `updateIssueNote` | `(project, issueIid, noteId, body, opts?)` | `glab api --method PUT ...` |
| `createMergeRequest` | `(opts?)` | `glab mr create --output json ...` |
| `viewMergeRequest` | `(mrIid, opts?)` | `glab mr view N --output json` |
| `listMergeRequests` | `(opts?)` | `glab mr list --output json` |
| `mergeMergeRequest` | `(mrIid, opts?)` | `glab mr merge N --yes [--auto-merge] [--squash] [--remove-source-branch]` |
| `labelsOf` | `(raw)` | string-or-object array → string array |
| `uniqueLabels` | `(raw)` | dedup via Set |
| `preserveWorkflowLabels` | `(currentLabels, nextLabels)` | ensures QUEUED/CLAIM labels not dropped |

### CLI wrapping pattern
```js
function glabExec(args, opts) {
  if (OFFLINE || opts?.offline) return opts?.offlineStdout || '';
  const fn = opts?.execFileSync || execFileSync;
  return fn('glab', args, { encoding: 'utf8', ...opts?.execOptions }).trim();
}
```
- `execFileSync` from `child_process` only (no execSync/spawnSync)
- Injectable `opts.execFileSync` for test mocking
- Offline via env `KAOLA_WORKFLOW_OFFLINE=1` or `opts.offline`

### parseJson / firstNumber / labelsOf / uniqueLabels
- `parseJson(raw, fallback)` — silent fallback on parse error
- `firstNumber(v)` — returns null if no valid positive finite number
- `labelsOf(raw)` — handles string/object labels
- `uniqueLabels(raw)` — dedup
- `preserveWorkflowLabels(currentLabels, nextLabels)` — ensures workflow labels not dropped

### normalizeState
- `'opened'`/`'open'` → `'open'`; `'closed'` → `'closed'`; `'merged'` → `'merged'`; else lowercase or `'unknown'`

### Error handling
- No try/catch in forge functions; errors propagate to callers
- `parseJson` silently returns fallback

### REST approach (GitLab)
- No HTTP client; all API calls via `glab api [--method M] PATH [-f k=v]`

---

## GitLab Test File Structure (mirror target)

**File:** `plugins/kaola-workflow-gitlab/scripts/test-gitlab-forge-helpers.js` (134 lines)

### Framework
- Node built-in `assert` only; hand-rolled, no Jest/Mocha
- Passes if no assertion throws; prints success message

### Offline shim
- `{ offline: true, offlineStdout: '[]' }` passed as opts
- Env var `KAOLA_WORKFLOW_OFFLINE=1` also works

### CLI mock
```js
function runner(calls, responses) {
  return function executable(bin, args) {
    calls.push([bin, args]);
    const key = args.join(' ');
    return responses.hasOwnProperty(key) ? responses[key] : '';
  };
}
// used as opts.execFileSync
```
- Responses keyed by `args.join(' ')` (no binary name)
- `calls` collects all invocations for final assertion

### Test organization
1. Pure normalization tests (no CLI): normalizeIssue, normalizeMergeRequest, normalizeProject, projectApiRef, preserveWorkflowLabels, glabExec offline
2. `runner` setup with one `calls` array and `responses` map
3. Live-mock tests for all CLI-calling exports
4. Final assertion: all `calls[n][0] === 'glab'`
5. `console.log('GitLab forge helper tests passed')`

---

## GitLab Plugin Layout

```
plugins/kaola-workflow-gitlab/
  .claude-plugin/plugin.json
  .codex-plugin/plugin.json
  agents/ (9 .toml files + .gitkeep)
  commands/ (phase1-6, fast, workflow-init, workflow-next .md)
  config/agents.toml
  hooks/hooks.json, *.sh
  scripts/
    kaola-gitlab-forge.js
    kaola-gitlab-workflow-active-folders.js
    kaola-gitlab-workflow-claim.js
    kaola-gitlab-workflow-classifier.js
    kaola-gitlab-workflow-compact-context.js
    kaola-gitlab-workflow-repair-state.js
    kaola-gitlab-workflow-roadmap.js
    kaola-gitlab-workflow-sink-merge.js
    kaola-gitlab-workflow-sink-mr.js
    simulate-gitlab-codex-workflow-walkthrough.js
    simulate-gitlab-workflow-walkthrough.js
    test-gitlab-forge-helpers.js
    test-gitlab-sinks.js
    test-gitlab-workflow-scripts.js
    validate-kaola-workflow-gitlab-contracts.js
  skills/ (kaola-workflow-fast, finalize, init, execute, ideation, next, plan, research, review SKILL.md)
```

No `package.json`. Node built-ins only.

---

## install.sh Forge Sections

- `--forge=github` (default): uses root `scripts/`, `$HOME/.claude/kaola-workflow`
- `--forge=gitlab`: uses `plugins/kaola-workflow-gitlab/scripts/`, `$HOME/.claude/kaola-workflow-gitlab`
- GitLab `SUPPORT_SCRIPT_NAMES`: kaola-gitlab-forge.js, active-folders, claim, classifier, compact-context, repair-state, roadmap, sink-merge, sink-mr
- No `--forge=gitea` case exists yet
- Installation: copies scripts → `$SUPPORT_SCRIPTS_DIR`, chmod +x; hooks.json with CLAUDE_PLUGIN_ROOT replacement

---

## GitHub Claim Pattern (reference only)
- `kaola-workflow-claim.js` uses inline `ghExec(args, opts)` — no forge module
- GitLab claim imports: `const forge = require('./kaola-gitlab-forge')`
- Gitea claim will need: `const forge = require('./kaola-gitea-forge')`

---

## Key Differences: Gitea vs GitLab

| Concern | GitLab | Gitea |
|---------|--------|-------|
| CLI binary | `glab` | `tea` |
| Issue API | `glab issue list/view/update/close` | `tea issues ls/view`; REST for comments |
| PR API | `glab mr create/view/list/merge` | `tea pr create/view/ls`; REST for merge |
| REST helper | `glab api --method M path -f k=v` | needs real HTTP client (https/fetch or Node http) |
| Comments | `glab api ...notes` | REST: `/api/v1/repos/{owner}/{repo}/issues/{index}/comments` |
| Auto-merge | `glab mr merge --auto-merge` | REST: `/api/v1/repos/{owner}/{repo}/pulls/{index}/merge` with `Do: "squash"` |
| Auth | glab session | tea login context + GITEA_TOKEN env |
| Version check | none in GitLab | needed: tea ≥ 0.9.2, Gitea server ≥ 1.17 |

---

## Naming Conventions
- Adapter: `plugins/kaola-workflow-gitea/scripts/kaola-gitea-forge.js`
- Tests: `plugins/kaola-workflow-gitea/scripts/test-gitea-forge-helpers.js`
- CLI binary constant: `'tea'`
