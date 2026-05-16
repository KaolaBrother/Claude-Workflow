# Phase 1 - Research / Discovery: issue-30

## Deliverable

Implement multi-session worktree-per-session isolation:
1. Move coordination state (locks, sessions, tickers) from `<worktree>/kaola-workflow/` to `<repo>/.git/kaola-workflow/` (coordRoot) so all linked worktrees of the same repo share the same lock state.
2. Auto-provision a per-session git worktree at `<repo>.kw/<project>/` as part of the claim transaction (after tiebreaker resolves).
3. Auto-lifecycle worktrees: remove on PR MERGED / sink-merge exit 0; rename to `.abandoned-<ts>` if dirty; defer removal when removing own cwd worktree.
4. Update the pre-commit hook to resolve locks from coordRoot (not worktree-local path).
5. Add `git worktree prune` to sweep.
6. Add an Epic Case 15 in `simulate-workflow-walkthrough.js` covering AC1–AC13.
7. Full Codex parity (plugins/kaola-workflow/scripts/ mirror + 9 SKILL.md files).
8. Backwards-compat fallback: `coordRoot()` reads `.git/kaola-workflow/` first, falls back to `<worktree>/kaola-workflow/` for one minor version; idempotent migrator runs on every startup.

## Why

Two sessions in the same git working tree each running `git checkout -b workflow/issue-N` corrupts the working tree for one of them. Additionally, Claude Code itself already creates agent worktrees under `.claude/worktrees/agent-*/`, so multi-worktree usage is already happening — the workflow hasn't caught up, leaving those sessions with zero cross-worktree coordination.

## Affected Area

| File | Change |
|---|---|
| `scripts/kaola-workflow-claim.js` | Primary: add `getCoordRoot()`, thread `coordRoot` through path helpers, add worktree provisioning in `cmdClaim`, add worktree removal in `releaseSession` + `cmdWatchPr`, add `worktree_path` to lock + receipt |
| `hooks/kaola-workflow-pre-commit.sh` | Replace `$GIT_ROOT/kaola-workflow/.locks/` with `$(git rev-parse --git-common-dir)/kaola-workflow/.locks/` |
| `scripts/kaola-workflow-repair-state.js` | `projectOwner()`:80 — add coordRoot parameter |
| `scripts/kaola-workflow-sink-merge.js` | `git worktree remove` before `git branch -D` |
| `scripts/validate-workflow-contracts.js:211–212` | `.gitignore` assertions obsolete (`.git/` is already gitignored) |
| `scripts/simulate-workflow-walkthrough.js` | Add Epic Case 15 at lines 3217–3219 boundary |
| `plugins/kaola-workflow/scripts/` | Byte-for-byte mirror of all above changes |
| `skills/*/SKILL.md` (9 files) | Add `cd "$KAOLA_WORKTREE_PATH"` shim |

## Key Patterns Found

1. **`getRoot()` at `scripts/kaola-workflow-claim.js:80`** — uses `git rev-parse --show-toplevel`; new `getCoordRoot()` must use `--git-common-dir` instead to return the shared `.git/` directory from any linked worktree.
2. **Root-as-parameter threading at `cmdClaim():930`** — every filesystem function takes `root` as first parameter, called once per cmd and threaded down. New `coordRoot` follows same pattern alongside `root`.
3. **`writeLockFile()` at line 492** — uses `fs.openSync(lp, 'wx', 0o600)` + `fsyncSync`; only O_EXCL write in codebase. Preserve unchanged.
4. **`OFFLINE` guard at line 8** — `process.env.KAOLA_WORKFLOW_OFFLINE === '1'` gates all `ghExec` + `git push`; `git worktree add` (local) doesn't need guarding, but any associated push does.
5. **Worktree cleanup order** — must `git worktree remove <path>` BEFORE `git branch -D <branch>`; `branch -D` fails if branch is checked out in a linked worktree (currently broken in `cmdWatchPr():1512`).
6. **`buildSinkBranchName()` at line 381** — canonical source for branch name; reuse for worktree provisioning, do not derive independently.
7. **Error exit pattern** — `process.exitCode = 2; return;` for conflict (never `process.exit(2)`); `process.exitCode = 1; return;` for no-work.
8. **Worktree path layout**: `<repo-parent>/<repo-name>.kw/<project>/` — sibling of repo, deterministic, keeps repo root clean.

## Test Patterns

- Framework: Hand-rolled `assert(condition, message)` at `simulate-workflow-walkthrough.js:10`
- Location: `scripts/simulate-workflow-walkthrough.js` (Epic Cases section near end)
- Insertion point for Epic Case 15: between lines 3217 and 3219 (after Epic Case 14's finally block, before LOW-3 corpus-grep)
- Structure: `fs.mkdtempSync` → `git init` → optional fake `gh` shim → `try { ... assert(...) } finally { fs.rmSync }`
- Sub-test naming: `'Epic Case 15A: ...'`, `'Epic Case 15B: ...'`, etc.
- AC1–AC13 all require two-worktree scenarios: use `git worktree add` to create a second linked worktree in the temp dir, run claim from each

## Config & Env

| Var | Purpose |
|---|---|
| `KAOLA_WORKFLOW_OFFLINE` | Gates all ghExec + git push calls — must be respected by new code |
| `KAOLA_SESSION_ID` | Session identity; fallbacks: `CODEX_THREAD_ID`, `CLAUDE_SESSION_ID` |
| `KAOLA_WORKTREE_PATH` | New env var to export after worktree provisioning (for SKILL.md shims) |
| `HOME` | Used by `claudeProjectDirForRoot()` for JSONL liveness |
| `KAOLA_WORKFLOW_FORCE_FF_FAIL` | Test-only FF failure injection (sink-merge.js) |

## External Docs

None required — all behavior specified in the issue (decisions locked) and confirmed by code exploration. Git plumbing commands (`git rev-parse --git-common-dir`, `git worktree add/remove/prune`) have stable well-known behavior.

## GitHub Issue

KaolaBrother/Kaola-Workflow#30

## Completeness Score

10/10

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | Internal patterns sufficient; no external library/API ambiguity |

## Notes / Future Considerations

- `coordRoot()` backwards-compat fallback: reads `.git/kaola-workflow/` first, falls back to `<worktree>/kaola-workflow/` for v3.2.x; idempotent migrator runs on every startup. Drop fallback in v3.3.x.
- AC13 (cwd-protection) requires writing `coordRoot/.pending-removal/{project}.json` and deferring worktree removal when the removal target is the current cwd — complex interaction with ticker lifecycle.
- `validate-workflow-contracts.js:211–212` `.gitignore` assertions will break if a test checks for those paths after migration; they should be removed (`.git/` is gitignored by default, making the assertions redundant).
- Codex parity scope: all changes must be mirrored byte-for-byte to `plugins/kaola-workflow/scripts/`; 9 SKILL.md files each get a `cd "$KAOLA_WORKTREE_PATH"` shim at startup.
- The `--recreate-worktree` flag mentioned in AC11/AC12 is a new subcommand to add to `kaola-workflow-claim.js`.
