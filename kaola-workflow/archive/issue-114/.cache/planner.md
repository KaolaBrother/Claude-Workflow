# Planner: issue-114

## Recommendation: Single-agent two-phase approach

### Phase A — Verbatim copies (20 files)
Copy: phase2–5 commands, execute/ideation/plan/review SKILL.md, hook .sh files, 9 agent .toml, config/agents.toml.

### Phase B — Substitution files (13 files, canonical order)
Apply longest-first replacement order:
1. kaola-gitlab-workflow-sink-merge.js → kaola-gitea-workflow-sink-merge.js
2. kaola-gitlab-workflow-sink-mr.js → kaola-gitea-workflow-sink-pr.js
3. kaola-gitlab-workflow- (script prefix) → kaola-gitea-workflow-
4. kaola-gitlab- → kaola-gitea-
5. kaola-workflow-gitlab → kaola-workflow-gitea
6. glab issue view → tea issues view
7. glab issue list → tea issues list
8. glab issue note → tea api -X POST .../comments (re-author contextually)
9. glab mr merge → tea api -X POST .../pulls/N/merge (re-author contextually)
10. glab mr view → tea pr view
11. glab mr create → tea pr create
12. glab mr list → tea pr list
13. glab (catch-all) → tea
14. merge request / Merge Request → pull request / Pull Request
15. sink-mr → sink-pr
16. watch-mr → watch-pr
17. mr_url → pr_url
18. issue_iid: → issue_number:
19. KAOLA_SINK=mr → KAOLA_SINK=pr
20. MR sink → PR sink
21. \bMR\b (word-boundary, contextual) → PR
22. GitLab → Gitea
23. gitlab (remaining) → gitea

Also:
- hooks.json: one value change (compact-context script name)
- .claude-plugin/plugin.json + .codex-plugin/plugin.json: name, description, keywords, brandColor (#FC6D26 → #609926)

### Phase C — Validation
- Forbidden-token grep (glab|gitlab|merge request|sink-mr|watch-mr|mr_url|KAOLA_SINK=mr|kaola-gitlab + \bMR\b) → 0 hits
- Directory equivalence check vs gitlab plugin minus scripts/
- Positive-token spot-check on 3 files

## Alternatives Rejected
- Bulk sed across all files in parallel: rejected (bare-MR and note/merge re-authoring need contextual judgment)
- Parallel sub-agents per file group: rejected (coordination cost > benefit for 13-file work)
- Defer manifests to separate issue: rejected (manifests are part of acceptance criteria)

## What NOT to Build
- No new JS files in scripts/
- No simulate/validate/test scripts
- No kaola-gitea-workflow-claim.js or other workflow scripts (those are issue #112, #113)
- No edits to plugins/kaola-workflow-gitlab/
- No .gitkeep files in directories that now contain real files
- No top-level README.md for the gitea plugin

## Risks
1. Bare-MR substitution mis-hits → use full surrounding line as old_string, review contextually
2. glab issue note / glab mr merge have no clean tea sub-command → re-author against kaola-gitea-forge.js shapes
3. Incomplete CLI syntax map for note/merge → reconcile against forge.js when in doubt
4. brandColor change is a judgment call → document in PR, revert if spec says otherwise
5. Dangling forward references to .js files not yet in tree → document as known forward references

## Validation Command
grep -rEi "glab|gitlab|\bMR\b|merge.request|sink-mr|watch-mr|mr_url|KAOLA_SINK=mr|kaola-gitlab" plugins/kaola-workflow-gitea/ --include="*.md" --include="*.json" --include="*.toml" --include="*.sh" | grep -v scripts/ | wc -l
→ must be 0
