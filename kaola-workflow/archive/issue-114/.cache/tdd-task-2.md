# TDD Task 2: Substitution files — issue-114

## Task
Create 13 substitution files in plugins/kaola-workflow-gitea/ by applying the 24-step substitution map to gitlab sources.

## RED Evidence
N/A — pure file creation, no behavioral logic. Validation is forbidden-token grep.

## GREEN Evidence
```
Forbidden-token check: 0 hits (expected: 0)
Verbatim check: PASS (20 verbatim files still byte-identical)
File count: 33 (expected: 33)
```

## Files Written
All under plugins/kaola-workflow-gitea/:
1. commands/kaola-workflow-fast.md
2. commands/kaola-workflow-phase1.md
3. commands/kaola-workflow-phase6.md
4. commands/workflow-init.md
5. commands/workflow-next.md
6. skills/kaola-workflow-fast/SKILL.md
7. skills/kaola-workflow-finalize/SKILL.md
8. skills/kaola-workflow-init/SKILL.md
9. skills/kaola-workflow-next/SKILL.md
10. skills/kaola-workflow-research/SKILL.md
11. hooks/hooks.json
12. .claude-plugin/plugin.json
13. .codex-plugin/plugin.json

## Trivial Inline Edit Exception Applied (3 fixes post-agent)
1. commands/kaola-workflow-phase6.md: `PR/PR metadata...sink-pr.js or sink-pr.js` → `PR metadata...sink-pr.js` (over-substitution of original PR/MR compound form)
2. commands/workflow-next.md: `"sink=mr"` → `"sink=pr"` and `"open an PR", "create an PR"` → `"open a PR", "create a PR"` (missed substitution + article fix)
3. skills/kaola-workflow-next/SKILL.md: `"sink=mr"` → `"sink=pr"`, `"open an PR", "create an PR"` → `"open a PR", "create a PR"`, removed redundant compatibility aliases now incorporated in main list

## Deviations
None from write set. Trivial inline edits recorded above.

## Status
COMPLETE
