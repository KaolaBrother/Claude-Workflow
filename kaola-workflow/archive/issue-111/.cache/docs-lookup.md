# Docs Lookup: Issue #111 — Gitea REST API + tea CLI

## Gitea REST API

### Auth
```
Authorization: token <TOKEN>
```
Lowercase `token`, all `/api/v1/` endpoints. Token via `GITEA_TOKEN` env or `tea login` context.

### Issue Comments
- Create: `POST /api/v1/repos/{owner}/{repo}/issues/{index}/comments` — body: `{"body": "..."}` → 201
- List: `GET /api/v1/repos/{owner}/{repo}/issues/{index}/comments`
- Update: `PATCH /api/v1/repos/{owner}/{repo}/issues/comments/{id}` — body: `{"body": "..."}` → 200
  - Note: update path uses `/issues/comments/{id}` — no `{index}` segment

### PR Merge
- `POST /api/v1/repos/{owner}/{repo}/pulls/{index}/merge`
- Body field `Do` (required): `"merge"`, `"rebase"`, `"rebase-merge"`, `"squash"`, `"fast-forward-only"`
- Optional: `merge_message_field`, `head_commit_sha`, `force_merge`
- **`auto_merge` body field**: NOT confirmed in docs; Gitea comparison page lists merge queues as unsupported.
  Issue #111 claims Gitea 1.17+ supports it — treat as unverified; add as optional best-effort field.

### Server Version
- `GET /api/v1/version` (no auth required on most instances)
- Response: `{"version": "1.21.0"}`

### Label Creation
- `POST /api/v1/repos/{owner}/{repo}/labels`
- Required: `name` (string), `color` (string, hex with `#`)
- Optional: `description`, `exclusive`
- Response 201: `{"id": 1, "name": "bug", "color": "#d73a4a"}`

## tea CLI

### Version
- `tea --version` output: `Version: 0.10.1+15-g8876fe3  golang: 1.25.0  go-sdk: v0.21.0`
- Current stable: 0.10.1; minimum for basic ops claimed ≥ 0.9.2

### Confirmed Commands
| Command | Notes |
|---------|-------|
| `tea issues ls [--limit N] [--state S] [--output json]` | list issues |
| `tea issues view <N>` | view issue |
| `tea issues create` | `--title`, `--description`, `--assignees`, `--labels` |
| `tea issues edit <N>` | `--add-labels`, `--remove-labels` |
| `tea issues close <N>` | close issue |
| `tea pulls ls` | list PRs |
| `tea pulls create` | `--title`, `--description`, `--base`, `--head` |
| `tea pulls view <N>` | view PR |
| `tea comment` | add comment (not suitable for programmatic use) |

### tea api (raw API access — confirmed)
```sh
tea api '/repos/{owner}/{repo}/issues?state=open'
tea api repos/{owner}/{repo}/labels -f name=bug -f color='#d73a4a'
tea api -X POST '/repos/{owner}/{repo}/pulls/{index}/merge' -d '{"Do":"squash"}'
tea api -X PATCH '/repos/{owner}/{repo}/issues/comments/{id}' -d '{"body":"..."}'
```
- Supports `-X METHOD`, `-f key=val` (string), `-F key=val` (typed), `-d JSON` (raw body)
- Like `glab api` — same pattern usable in the adapter

## Design implication
Since `tea api` exists, we can use the same pattern as GitLab:
- `teaExec(args, opts)` for tea CLI commands
- `tea api` sub-command for REST calls that tea CLI lacks natively (issue comments, PR merge body)
- No separate HTTP client needed — `tea api` handles auth automatically via `tea login` context
- Fallback: if `GITEA_TOKEN` is set but `tea login` not configured, pass `Authorization` header via `tea api --header`

## Sources
- docs.gitea.com/development/api-usage
- pkg.go.dev/code.gitea.io/sdk/gitea
- gitea.com/gitea/tea (CLI docs)
