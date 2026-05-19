# TDD Task 1: Create directories + verbatim copies — issue-114

## Task
Create 15 directories and copy 20 files verbatim from plugins/kaola-workflow-gitlab/ to plugins/kaola-workflow-gitea/.

## RED Evidence
N/A — pure file creation, no behavioral logic. Validation is diff -q byte-identity.

## GREEN Evidence
```
Verbatim check: PASS
```
No MISMATCH lines. All 20 files byte-for-byte identical to sources.

## Files Written
All under plugins/kaola-workflow-gitea/:
1. commands/kaola-workflow-phase2.md
2. commands/kaola-workflow-phase3.md
3. commands/kaola-workflow-phase4.md
4. commands/kaola-workflow-phase5.md
5. skills/kaola-workflow-execute/SKILL.md
6. skills/kaola-workflow-ideation/SKILL.md
7. skills/kaola-workflow-plan/SKILL.md
8. skills/kaola-workflow-review/SKILL.md
9. hooks/kaola-workflow-phantom-advisor.sh
10. hooks/kaola-workflow-pre-commit.sh
11. config/agents.toml
12. agents/build-error-resolver.toml
13. agents/code-architect.toml
14. agents/code-explorer.toml
15. agents/code-reviewer.toml
16. agents/doc-updater.toml
17. agents/docs-lookup.toml
18. agents/planner.toml
19. agents/security-reviewer.toml
20. agents/tdd-guide.toml

## Directories Created (15)
commands/, skills/kaola-workflow-execute/, skills/kaola-workflow-ideation/,
skills/kaola-workflow-plan/, skills/kaola-workflow-review/, hooks/, config/,
agents/, .claude-plugin/, .codex-plugin/, skills/kaola-workflow-fast/,
skills/kaola-workflow-finalize/, skills/kaola-workflow-init/,
skills/kaola-workflow-next/, skills/kaola-workflow-research/

## Deviations
None. .gitkeep not copied.

## Status
COMPLETE
