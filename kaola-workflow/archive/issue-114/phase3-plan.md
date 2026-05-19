# Phase 3 - Plan: issue-114

## Blueprint

### Files to Create (33 total — 20 verbatim + 13 substitution)

| File (under plugins/kaola-workflow-gitea/) | Action | Notes |
|------|------|------|
| commands/kaola-workflow-phase2.md | COPY verbatim | forge-agnostic |
| commands/kaola-workflow-phase3.md | COPY verbatim | forge-agnostic |
| commands/kaola-workflow-phase4.md | COPY verbatim | forge-agnostic |
| commands/kaola-workflow-phase5.md | COPY verbatim | forge-agnostic |
| skills/kaola-workflow-execute/SKILL.md | COPY verbatim | forge-agnostic |
| skills/kaola-workflow-ideation/SKILL.md | COPY verbatim | forge-agnostic |
| skills/kaola-workflow-plan/SKILL.md | COPY verbatim | forge-agnostic |
| skills/kaola-workflow-review/SKILL.md | COPY verbatim | forge-agnostic |
| hooks/kaola-workflow-phantom-advisor.sh | COPY verbatim | forge-agnostic |
| hooks/kaola-workflow-pre-commit.sh | COPY verbatim | forge-agnostic |
| config/agents.toml | COPY verbatim | forge-agnostic |
| agents/build-error-resolver.toml | COPY verbatim | agent role; forge-agnostic |
| agents/code-architect.toml | COPY verbatim | agent role; forge-agnostic |
| agents/code-explorer.toml | COPY verbatim | agent role; forge-agnostic |
| agents/code-reviewer.toml | COPY verbatim | agent role; forge-agnostic |
| agents/doc-updater.toml | COPY verbatim | agent role; forge-agnostic |
| agents/docs-lookup.toml | COPY verbatim | agent role; forge-agnostic |
| agents/planner.toml | COPY verbatim | agent role; forge-agnostic |
| agents/security-reviewer.toml | COPY verbatim | agent role; forge-agnostic |
| agents/tdd-guide.toml | COPY verbatim | agent role; forge-agnostic |
| commands/kaola-workflow-fast.md | SUBSTITUTE | 1 line: "GitLab issue body" → "Gitea issue body" |
| commands/kaola-workflow-phase1.md | SUBSTITUTE | medium: glab→tea CLI, script names, GitLab→Gitea |
| commands/kaola-workflow-phase6.md | SUBSTITUTE | heavy: MR→PR, script names, issue_iid→issue_number |
| commands/workflow-init.md | SUBSTITUTE | medium: glab→tea, GitLab→Gitea, script names |
| commands/workflow-next.md | SUBSTITUTE | heavy: glab→tea, MR→PR, KAOLA_SINK=mr→pr |
| skills/kaola-workflow-fast/SKILL.md | SUBSTITUTE | 1 line: "GitLab issue body" → "Gitea issue body" |
| skills/kaola-workflow-finalize/SKILL.md | SUBSTITUTE | heavy: sink-mr→sink-pr, script names, MR→PR |
| skills/kaola-workflow-init/SKILL.md | SUBSTITUTE | 4 lines: GitLab→Gitea, watch-mr→watch-pr |
| skills/kaola-workflow-next/SKILL.md | SUBSTITUTE | heavy: glab→tea, MR→PR, script names |
| skills/kaola-workflow-research/SKILL.md | SUBSTITUTE | medium: script paths, GitLab→Gitea |
| hooks/hooks.json | SUBSTITUTE | 1 value: compact-context script name |
| .claude-plugin/plugin.json | SUBSTITUTE | name, description, keywords |
| .codex-plugin/plugin.json | SUBSTITUTE | name, desc, keywords, brandColor #FC6D26→#609926 |

### Files to Modify
None. No existing files are modified.

### Directories to Create
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

### Build Sequence
1. Create all directories (`mkdir -p`) — all file writes depend on this
2. Task 1 (verbatim) — after step 1
3. Task 2 (substitution) — after step 1, parallel-safe with Task 1
4. Validation — after both tasks complete

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| After mkdir | Task 1 + Task 2 | disjoint write sets (no overlap between 20 verbatim and 13 substitution targets) |

### External Dependencies
None. Pure file creation from internal content.

## Task List

### Task 1: Create directories and copy verbatim files

- File: `plugins/kaola-workflow-gitea/` (15 subdirectories + 20 files)
- Test File: N/A (validation is `diff -q` byte-identity check)
- Write Set:
  - `plugins/kaola-workflow-gitea/commands/kaola-workflow-phase2.md`
  - `plugins/kaola-workflow-gitea/commands/kaola-workflow-phase3.md`
  - `plugins/kaola-workflow-gitea/commands/kaola-workflow-phase4.md`
  - `plugins/kaola-workflow-gitea/commands/kaola-workflow-phase5.md`
  - `plugins/kaola-workflow-gitea/skills/kaola-workflow-execute/SKILL.md`
  - `plugins/kaola-workflow-gitea/skills/kaola-workflow-ideation/SKILL.md`
  - `plugins/kaola-workflow-gitea/skills/kaola-workflow-plan/SKILL.md`
  - `plugins/kaola-workflow-gitea/skills/kaola-workflow-review/SKILL.md`
  - `plugins/kaola-workflow-gitea/hooks/kaola-workflow-phantom-advisor.sh`
  - `plugins/kaola-workflow-gitea/hooks/kaola-workflow-pre-commit.sh`
  - `plugins/kaola-workflow-gitea/config/agents.toml`
  - `plugins/kaola-workflow-gitea/agents/build-error-resolver.toml`
  - `plugins/kaola-workflow-gitea/agents/code-architect.toml`
  - `plugins/kaola-workflow-gitea/agents/code-explorer.toml`
  - `plugins/kaola-workflow-gitea/agents/code-reviewer.toml`
  - `plugins/kaola-workflow-gitea/agents/doc-updater.toml`
  - `plugins/kaola-workflow-gitea/agents/docs-lookup.toml`
  - `plugins/kaola-workflow-gitea/agents/planner.toml`
  - `plugins/kaola-workflow-gitea/agents/security-reviewer.toml`
  - `plugins/kaola-workflow-gitea/agents/tdd-guide.toml`
- Depends On: none
- Parallel Group: A
- Action: CREATE
- Implement:
  1. Run `mkdir -p` for all 15 directories listed in build sequence
  2. For each of the 20 files: read source from `plugins/kaola-workflow-gitlab/<rel>`, write identical content to `plugins/kaola-workflow-gitea/<rel>`
  3. Do NOT copy `.gitkeep` from any gitlab subdirectory
- Mirror: `cp` pattern — byte-for-byte from gitlab source
- Validate:
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

---

### Task 2: Create substitution files

- File: 13 files in `plugins/kaola-workflow-gitea/` (see write set)
- Test File: N/A
- Write Set:
  - `plugins/kaola-workflow-gitea/commands/kaola-workflow-fast.md`
  - `plugins/kaola-workflow-gitea/commands/kaola-workflow-phase1.md`
  - `plugins/kaola-workflow-gitea/commands/kaola-workflow-phase6.md`
  - `plugins/kaola-workflow-gitea/commands/workflow-init.md`
  - `plugins/kaola-workflow-gitea/commands/workflow-next.md`
  - `plugins/kaola-workflow-gitea/skills/kaola-workflow-fast/SKILL.md`
  - `plugins/kaola-workflow-gitea/skills/kaola-workflow-finalize/SKILL.md`
  - `plugins/kaola-workflow-gitea/skills/kaola-workflow-init/SKILL.md`
  - `plugins/kaola-workflow-gitea/skills/kaola-workflow-next/SKILL.md`
  - `plugins/kaola-workflow-gitea/skills/kaola-workflow-research/SKILL.md`
  - `plugins/kaola-workflow-gitea/hooks/hooks.json`
  - `plugins/kaola-workflow-gitea/.claude-plugin/plugin.json`
  - `plugins/kaola-workflow-gitea/.codex-plugin/plugin.json`
- Depends On: Task 1 directory creation (directories must exist)
- Parallel Group: A (parallel-safe with Task 1 file writes; depends only on mkdir)
- Action: CREATE
- Implement: For each file, read source from `plugins/kaola-workflow-gitlab/<rel>`, apply the 24-step substitution map below in order, write to `plugins/kaola-workflow-gitea/<rel>`.

**24-step substitution map (apply in this order per file):**

1. `kaola-gitlab-workflow-sink-merge.js` → `kaola-gitea-workflow-sink-merge.js`
2. `kaola-gitlab-workflow-sink-mr.js` → `kaola-gitea-workflow-sink-pr.js`
3. `kaola-gitlab-workflow-` → `kaola-gitea-workflow-`
4. `kaola-gitlab-` → `kaola-gitea-`
5. `kaola-workflow-gitlab` → `kaola-workflow-gitea`
6. `glab issue view` → `tea issues view`
7. `glab issue list` → `tea issues list`
8. `glab issue note` → re-author contextually: wrap call as `createIssueComment()` call or `tea api` equivalent (see forge.js exports: `createIssueComment(project, issueNum, body, opts)`)
9. `glab mr merge` → re-author contextually: wrap call as `mergePullRequest()` call or `tea api` equivalent (see forge.js exports: `mergePullRequest(project, prNumber, opts)`)
10. `glab mr view` → `tea pr view`
11. `glab mr create` → `tea pr create`
12. `glab mr list` → `tea pr list`
13. `glab` (catch-all remaining) → `tea`
13.5. `tea mr ` → `tea pr ` (belt-and-suspenders: catches any `glab mr <other verb>` that became `tea mr` in step 13)
14. `merge request` → `pull request` / `Merge Request` → `Pull Request` / `Merge request` → `Pull request` / `merge Request` → `pull Request` (all 4 case variants)
15. `sink-mr` → `sink-pr`
16. `watch-mr` → `watch-pr`
17. `mr_url` → `pr_url`
18. `issue_iid:` → `issue_number:`
19. `KAOLA_SINK=mr` → `KAOLA_SINK=pr`
20. `MR sink` → `PR sink`
21. Bare `MR` flanked by non-alphanumeric: contextual → `PR`
22. `GitLab` → `Gitea`
23. `gitlab` (remaining lowercase) → `gitea`

**Notes on non-mechanical substitutions:**
- Steps 8/9: `glab issue note` and `glab mr merge` do NOT appear in current source files (verified). Steps are precautionary; apply contextually if encountered.
- forge.js confirmed exports: `createIssueComment(project, issueNum, body, opts)`, `mergePullRequest(project, prNumber, opts)` — use these if re-authoring is needed.
- Step 13.5: Only fires if `tea mr [verb]` appears after step 13; likely a no-op but prevents leaks.
- Step 21 (bare MR): Pattern `(^|[^A-Za-z0-9])MR([^A-Za-z0-9]|$)`. Apply to remaining instances not already covered by steps 15/19/20. Do NOT replace `MR` that is part of `mr_url` → already handled by step 17.
- brandColor in `.codex-plugin/plugin.json` only — do NOT add brandColor to `.claude-plugin/plugin.json` (field does not exist there).

- Validate:
  ```bash
  grep -rEn \
    'glab|[Gg]it[Ll]ab|[Mm]erge [Rr]equest|sink-mr|sink_mr|mr_url|issue_iid|kaola-gitlab|(^|[^A-Za-z0-9])MR([^A-Za-z0-9]|$)|(^|[^A-Za-z0-9])mr [a-z]+|KAOLA_SINK=mr|watch-mr|#FC6D26|tea mr ' \
    plugins/kaola-workflow-gitea/ \
    --include="*.md" --include="*.json" --include="*.toml" --include="*.sh" \
    | grep -v "scripts/" || true
  ```
  Expected: zero output lines. (Note: `|| true` prevents `grep` exit-code from failing the shell; check that the output is empty.)

---

### Final Combined Validation (after both tasks complete)

```bash
# 1. Verbatim files — must be byte-identical to gitlab source
SRC=plugins/kaola-workflow-gitlab
TGT=plugins/kaola-workflow-gitea
MISMATCH=0
for f in \
  commands/kaola-workflow-phase2.md commands/kaola-workflow-phase3.md \
  commands/kaola-workflow-phase4.md commands/kaola-workflow-phase5.md \
  skills/kaola-workflow-execute/SKILL.md skills/kaola-workflow-ideation/SKILL.md \
  skills/kaola-workflow-plan/SKILL.md skills/kaola-workflow-review/SKILL.md \
  hooks/kaola-workflow-phantom-advisor.sh hooks/kaola-workflow-pre-commit.sh \
  config/agents.toml \
  agents/build-error-resolver.toml agents/code-architect.toml \
  agents/code-explorer.toml agents/code-reviewer.toml \
  agents/doc-updater.toml agents/docs-lookup.toml \
  agents/planner.toml agents/security-reviewer.toml agents/tdd-guide.toml; do
  diff -q "$SRC/$f" "$TGT/$f" || { echo "MISMATCH: $f"; MISMATCH=1; }
done
echo "Verbatim check: $([ $MISMATCH -eq 0 ] && echo PASS || echo FAIL)"

# 2. Substitution files — must have zero forbidden tokens
HITS=$(grep -rEn \
  'glab|[Gg]it[Ll]ab|[Mm]erge [Rr]equest|sink-mr|sink_mr|mr_url|issue_iid|kaola-gitlab|(^|[^A-Za-z0-9])MR([^A-Za-z0-9]|$)|(^|[^A-Za-z0-9])mr [a-z]+|KAOLA_SINK=mr|watch-mr|#FC6D26|tea mr ' \
  plugins/kaola-workflow-gitea/ \
  --include="*.md" --include="*.json" --include="*.toml" --include="*.sh" \
  | grep -v "scripts/" 2>/dev/null | wc -l || echo 0)
echo "Forbidden-token check: $([ "$HITS" = "0" ] && echo "PASS (0 hits)" || echo "FAIL ($HITS hits)")"

# 3. File count check
ACTUAL=$(find plugins/kaola-workflow-gitea/ -type f | grep -v "scripts/" | wc -l | tr -d ' ')
echo "File count: $ACTUAL (expected: 33)"
```

## Advisor Notes

From `.cache/advisor-plan.md`:
- Added step 13.5 (`tea mr ` → `tea pr `) as belt-and-suspenders
- Added `(^|[^A-Za-z0-9])mr [a-z]+` and `tea mr ` to forbidden-token grep
- Expanded step 14 to cover all 4 case variants of "merge request"
- Confirmed forge.js exports: `createIssueComment` (not `addIssueComment`), `mergePullRequest`
- Verified: only `glab mr create` appears in source — no `glab issue note` or `glab mr merge` — steps 8/9 are precautionary

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | — | Advisor said "fold sharpenings in directly, not a redesign" |
