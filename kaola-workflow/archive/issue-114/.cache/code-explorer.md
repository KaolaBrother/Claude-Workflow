# Code Explorer: issue-114

## Directory Structures

### plugins/kaola-workflow-gitlab/ (mirror source)
commands/: 9 .md files + .gitkeep
skills/: 9 subdirs (execute/fast/finalize/ideation/init/next/plan/research/review), each with SKILL.md
hooks/: hooks.json, kaola-workflow-phantom-advisor.sh, kaola-workflow-pre-commit.sh, .gitkeep
config/: agents.toml, .gitkeep
agents/: 9 .toml agent overrides + .gitkeep
scripts/: 15+ JS files
.claude-plugin/plugin.json
.codex-plugin/plugin.json

### plugins/kaola-workflow-github/ — does NOT exist

### plugins/kaola-workflow-gitea/ — current state
scripts/: kaola-gitea-forge.js, test-gitea-forge-helpers.js
(no commands/, skills/, hooks/, config/, agents/, manifests)

## File Disposition

| File | Action |
|------|--------|
| commands/kaola-workflow-phase2.md | Copy verbatim |
| commands/kaola-workflow-phase3.md | Copy verbatim |
| commands/kaola-workflow-phase4.md | Copy verbatim |
| commands/kaola-workflow-phase5.md | Copy verbatim |
| commands/kaola-workflow-fast.md | Modify (1 line: "GitLab issue body" → "Gitea issue body") |
| commands/kaola-workflow-phase1.md | Modify (12+ lines: glab→tea CLI, script names, GitLab→Gitea labels, issue section header) |
| commands/kaola-workflow-phase6.md | Modify (heavy: MR→PR throughout, script names, issue_iid→issue_number, mr_url→pr_url, sink names) |
| commands/workflow-init.md | Modify (medium: glab→tea, GitLab→Gitea prose, script names) |
| commands/workflow-next.md | Modify (heavy: glab→tea, MR→PR throughout, script names, KAOLA_SINK=mr→pr) |
| skills/kaola-workflow-execute/SKILL.md | Copy verbatim |
| skills/kaola-workflow-ideation/SKILL.md | Copy verbatim |
| skills/kaola-workflow-plan/SKILL.md | Copy verbatim |
| skills/kaola-workflow-review/SKILL.md | Copy verbatim |
| skills/kaola-workflow-fast/SKILL.md | Modify (1 line: "GitLab issue body" → "Gitea issue body") |
| skills/kaola-workflow-finalize/SKILL.md | Modify (heavy: sink-mr→sink-pr, script names, issue_iid→issue_number, MR→PR) |
| skills/kaola-workflow-init/SKILL.md | Modify (4 lines: GitLab→Gitea, claim script name, watch-mr→watch-pr) |
| skills/kaola-workflow-next/SKILL.md | Modify (heavy: glab→tea, MR→PR throughout, script names) |
| skills/kaola-workflow-research/SKILL.md | Modify (medium: script paths, GitLab→Gitea prose) |
| hooks/kaola-workflow-phantom-advisor.sh | Copy verbatim |
| hooks/kaola-workflow-pre-commit.sh | Copy verbatim |
| hooks/hooks.json | Modify (1 value: kaola-gitlab-workflow-compact-context.js → kaola-gitea-workflow-compact-context.js) |
| config/agents.toml | Copy verbatim |
| agents/*.toml (all 9) | Copy verbatim |
| .claude-plugin/plugin.json | Modify (name, description, keywords) |
| .codex-plugin/plugin.json | Modify (name, description, keywords, brandColor, display strings) |

## Complete Substitution Map

| GitLab term | Gitea equivalent |
|-------------|-----------------|
| gitlab (in paths/names) | gitea |
| kaola-gitlab- (script prefix) | kaola-gitea- |
| kaola-workflow-gitlab (plugin dir/path) | kaola-workflow-gitea |
| glab (CLI binary) | tea |
| glab issue view N --json title -q .title | tea issues view N --output json (parse .title) |
| glab issue list --limit 100 --json ... | tea issues list --output json --limit 100 |
| GitLab / GitLab issue / GitLab remote | Gitea / Gitea issue / Gitea remote |
| MR / merge request / Merge Request | PR / pull request / Pull Request |
| sink-mr.js | sink-pr.js |
| sink-mr (command ref) | sink-pr |
| kaola-gitlab-workflow-sink-mr.js | kaola-gitea-workflow-sink-pr.js |
| kaola-gitlab-workflow-sink-merge.js | kaola-gitea-workflow-sink-merge.js |
| kaola-gitlab-workflow-claim.js | kaola-gitea-workflow-claim.js |
| kaola-gitlab-workflow-classifier.js | kaola-gitea-workflow-classifier.js |
| kaola-gitlab-workflow-roadmap.js | kaola-gitea-workflow-roadmap.js |
| kaola-gitlab-workflow-repair-state.js | kaola-gitea-workflow-repair-state.js |
| kaola-gitlab-workflow-compact-context.js | kaola-gitea-workflow-compact-context.js |
| watch-mr | watch-pr |
| mr_url | pr_url |
| mr_auto_merge | pr_auto_merge |
| issue_iid: (grep pattern) | issue_number: |
| KAOLA_SINK=mr | KAOLA_SINK=pr |
| "open an MR" / "create an MR" intent keyword | "open a PR" / "create a PR" |
| "MR sink" | "PR sink" |
| chore: record MR metadata | chore: record PR metadata |
| glab mr create (error ref) | tea pr create |
| kaola-workflow-gitlab/commands/kaola-workflow-fast.md (path ref) | kaola-workflow-gitea/commands/kaola-workflow-fast.md |
| ## GitLab Issue (phase file section header) | ## Gitea Issue |

## Key Architectural Notes
- tea uses `issues` plural, glab uses `issue` singular
- tea output flag: `--output json`; glab: `--json`
- Gitea issue field: `number` (not `iid`)
- Gitea claim script writes `issue_number:` to workflow-state.md (not `issue_iid:`)
- All bash kaola_script() blocks in commands/skills reference plugin dir + script name — both must be substituted
- Non-forge-specific skills (execute, ideation, plan, review) can be copied verbatim
- hooks.sh files are forge-agnostic; only hooks.json has a compact-context.js reference
