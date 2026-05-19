# Code Architect: issue-114

## Design Decisions

- **Agent filename correction**: Actual source agent files use short names: `build-error-resolver.toml`, `code-architect.toml`, `code-explorer.toml`, `code-reviewer.toml`, `doc-updater.toml`, `docs-lookup.toml`, `planner.toml`, `security-reviewer.toml`, `tdd-guide.toml` (9 files). Phase 1 research listed wrong names. Verbatim count remains 20.
- **Pre-condition grep confirmed**: All 12 non-agent verbatim files contain zero matches for `glab|gitlab|GitLab|merge request|sink-mr|mr_url|issue_iid`. Agent `.toml` files are role descriptions with no forge-specific tokens.
- **No `.gitkeep`**: Source dirs have `.gitkeep`; target dirs will have real files — no `.gitkeep` created.
- **No new JS scripts**: `scripts/` already has `kaola-gitea-forge.js` and test file from #111. Zero additions to `scripts/`.
- **BSD grep `\b` workaround**: Validation uses `(^|[^A-Za-z0-9])MR([^A-Za-z0-9]|$)` instead of `\bMR\b`.
- **brandColor**: Only `.codex-plugin/plugin.json` has this field. `.claude-plugin/plugin.json` does not — do not add it.

## Directories to Create (mkdir -p)

```
plugins/kaola-workflow-gitea/.claude-plugin/
plugins/kaola-workflow-gitea/.codex-plugin/
plugins/kaola-workflow-gitea/agents/
plugins/kaola-workflow-gitea/commands/
plugins/kaola-workflow-gitea/config/
plugins/kaola-workflow-gitea/hooks/
plugins/kaola-workflow-gitea/skills/kaola-workflow-execute/
plugins/kaola-workflow-gitea/skills/kaola-workflow-fast/
plugins/kaola-workflow-gitea/skills/kaola-workflow-finalize/
plugins/kaola-workflow-gitea/skills/kaola-workflow-ideation/
plugins/kaola-workflow-gitea/skills/kaola-workflow-init/
plugins/kaola-workflow-gitea/skills/kaola-workflow-next/
plugins/kaola-workflow-gitea/skills/kaola-workflow-plan/
plugins/kaola-workflow-gitea/skills/kaola-workflow-research/
plugins/kaola-workflow-gitea/skills/kaola-workflow-review/
```

## Task A — Verbatim Files (20 files)

Copy byte-for-byte from gitlab source. Verify with `diff -q` after write.

| Target (under plugins/kaola-workflow-gitea/) | Source (under plugins/kaola-workflow-gitlab/) |
|------|------|
| commands/kaola-workflow-phase2.md | commands/kaola-workflow-phase2.md |
| commands/kaola-workflow-phase3.md | commands/kaola-workflow-phase3.md |
| commands/kaola-workflow-phase4.md | commands/kaola-workflow-phase4.md |
| commands/kaola-workflow-phase5.md | commands/kaola-workflow-phase5.md |
| skills/kaola-workflow-execute/SKILL.md | skills/kaola-workflow-execute/SKILL.md |
| skills/kaola-workflow-ideation/SKILL.md | skills/kaola-workflow-ideation/SKILL.md |
| skills/kaola-workflow-plan/SKILL.md | skills/kaola-workflow-plan/SKILL.md |
| skills/kaola-workflow-review/SKILL.md | skills/kaola-workflow-review/SKILL.md |
| hooks/kaola-workflow-phantom-advisor.sh | hooks/kaola-workflow-phantom-advisor.sh |
| hooks/kaola-workflow-pre-commit.sh | hooks/kaola-workflow-pre-commit.sh |
| config/agents.toml | config/agents.toml |
| agents/build-error-resolver.toml | agents/build-error-resolver.toml |
| agents/code-architect.toml | agents/code-architect.toml |
| agents/code-explorer.toml | agents/code-explorer.toml |
| agents/code-reviewer.toml | agents/code-reviewer.toml |
| agents/doc-updater.toml | agents/doc-updater.toml |
| agents/docs-lookup.toml | agents/docs-lookup.toml |
| agents/planner.toml | agents/planner.toml |
| agents/security-reviewer.toml | agents/security-reviewer.toml |
| agents/tdd-guide.toml | agents/tdd-guide.toml |

**Verbatim verification command:**
```bash
SRC=plugins/kaola-workflow-gitlab
TGT=plugins/kaola-workflow-gitea
for f in \
  commands/kaola-workflow-phase2.md \
  commands/kaola-workflow-phase3.md \
  commands/kaola-workflow-phase4.md \
  commands/kaola-workflow-phase5.md \
  skills/kaola-workflow-execute/SKILL.md \
  skills/kaola-workflow-ideation/SKILL.md \
  skills/kaola-workflow-plan/SKILL.md \
  skills/kaola-workflow-review/SKILL.md \
  hooks/kaola-workflow-phantom-advisor.sh \
  hooks/kaola-workflow-pre-commit.sh \
  config/agents.toml \
  agents/build-error-resolver.toml \
  agents/code-architect.toml \
  agents/code-explorer.toml \
  agents/code-reviewer.toml \
  agents/doc-updater.toml \
  agents/docs-lookup.toml \
  agents/planner.toml \
  agents/security-reviewer.toml \
  agents/tdd-guide.toml; do
  diff -q "$SRC/$f" "$TGT/$f" || echo "MISMATCH: $f"
done
```
Expected: no output.

## Task B — Substitution Files (13 files)

Read source, apply 23-step map in order, write to gitea target.

| Target (under plugins/kaola-workflow-gitea/) | Source | Intensity |
|------|------|------|
| commands/kaola-workflow-fast.md | commands/kaola-workflow-fast.md | 1 line |
| commands/kaola-workflow-phase1.md | commands/kaola-workflow-phase1.md | medium |
| commands/kaola-workflow-phase6.md | commands/kaola-workflow-phase6.md | heavy |
| commands/workflow-init.md | commands/workflow-init.md | medium |
| commands/workflow-next.md | commands/workflow-next.md | heavy |
| skills/kaola-workflow-fast/SKILL.md | skills/kaola-workflow-fast/SKILL.md | 1 line |
| skills/kaola-workflow-finalize/SKILL.md | skills/kaola-workflow-finalize/SKILL.md | heavy |
| skills/kaola-workflow-init/SKILL.md | skills/kaola-workflow-init/SKILL.md | 4 lines |
| skills/kaola-workflow-next/SKILL.md | skills/kaola-workflow-next/SKILL.md | heavy |
| skills/kaola-workflow-research/SKILL.md | skills/kaola-workflow-research/SKILL.md | medium |
| hooks/hooks.json | hooks/hooks.json | 1 value |
| .claude-plugin/plugin.json | .claude-plugin/plugin.json | name/desc/keywords |
| .codex-plugin/plugin.json | .codex-plugin/plugin.json | name/desc/keywords/brandColor |

**23-step substitution map (apply in this exact order):**
1. `kaola-gitlab-workflow-sink-merge.js` → `kaola-gitea-workflow-sink-merge.js`
2. `kaola-gitlab-workflow-sink-mr.js` → `kaola-gitea-workflow-sink-pr.js`
3. `kaola-gitlab-workflow-` → `kaola-gitea-workflow-`
4. `kaola-gitlab-` → `kaola-gitea-`
5. `kaola-workflow-gitlab` → `kaola-workflow-gitea`
6. `glab issue view` → `tea issues view`
7. `glab issue list` → `tea issues list`
8. `glab issue note` → re-author contextually: `tea api -X POST .../comments` or forge.js `addIssueComment()`
9. `glab mr merge` → re-author contextually: `tea api -X POST .../pulls/N/merge` or forge.js `mergePullRequest()`
10. `glab mr view` → `tea pr view`
11. `glab mr create` → `tea pr create`
12. `glab mr list` → `tea pr list`
13. `glab` (catch-all) → `tea`
14. `merge request` / `Merge Request` → `pull request` / `Pull Request`
15. `sink-mr` → `sink-pr`
16. `watch-mr` → `watch-pr`
17. `mr_url` → `pr_url`
18. `issue_iid:` → `issue_number:`
19. `KAOLA_SINK=mr` → `KAOLA_SINK=pr`
20. `MR sink` → `PR sink`
21. Bare `MR` (word-boundary contextual) → `PR`
22. `GitLab` → `Gitea`
23. `gitlab` (remaining lowercase) → `gitea`

**Prerequisite before steps 8/9**: Read `plugins/kaola-workflow-gitea/scripts/kaola-gitea-forge.js` and list exported helpers to use as authoritative re-authoring targets.

**Forbidden-token validation command (POSIX-safe):**
```bash
grep -rEn \
  'glab|[Gg]it[Ll]ab|[Mm]erge [Rr]equest|sink-mr|sink_mr|mr_url|issue_iid|kaola-gitlab|(^|[^A-Za-z0-9])MR([^A-Za-z0-9]|$)|KAOLA_SINK=mr|watch-mr|#FC6D26' \
  plugins/kaola-workflow-gitea/ \
  --include="*.md" --include="*.json" --include="*.toml" --include="*.sh" \
  | grep -v "scripts/" || true
```
Expected: zero output lines.

## Build Sequence

1. Create directories (`mkdir -p`) — must complete before any file write
2. Task A (verbatim 20 files) — parallel-safe with Task B after step 1
3. Task B (substitution 13 files) — parallel-safe with Task A after step 1
4. Validation — after both A and B complete

## Parallelization

| Group | Tasks | Why Safe |
|-------|-------|---------|
| A | Verbatim 20 files | disjoint write set; no file depends on another |
| B | Substitution 13 files | disjoint write set; no file depends on another |
| A+B | Can run concurrently | completely disjoint sets (no overlap between verbatim and substitution targets) |

## Explicit Out of Scope

- `plugins/kaola-workflow-gitea/scripts/` — zero new files
- `plugins/kaola-workflow-gitlab/` — read-only, no modifications
- `kaola-gitea-workflow-claim.js` — issue #112
- `kaola-gitea-workflow-classifier.js` — issue #112
- `kaola-gitea-workflow-roadmap.js` — issue #112
- `kaola-gitea-workflow-compact-context.js` — issue #113
- Any simulate/test/validate scripts
- `.gitkeep` files in any directory
- Main repo `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `scripts/`, `kaola-workflow/`
