# Phase 2 - Ideation: issue-133

## Approaches Evaluated

### Option A: Minimal surgical fix
- Summary: Fix GitLab SKILL.md two lines, copy script to both forge plugins, add `scriptFiles` guard, add GitLab validator assertions, add regression tests.
- Pros: Smallest diff, mirrors GitHub reference exactly, each forge independently verifiable
- Cons: Two manually-maintained byte-identical copies (acceptable by design — excluded from validate-script-sync.js)
- Risk: Low
- Complexity: Small

### Option B: Option A + symmetric Gitea validator guards (SELECTED)
- Summary: Same as A, plus add `assertIncludes`/`assertNotIncludes` guards to Gitea validator as regression defense (Gitea SKILL.md is currently correct but unguarded).
- Pros: Symmetric protection across all three forges; cheap; prevents same regression recurring in Gitea
- Cons: Slightly beyond literal #133 scope (Gitea SKILL.md has no current bug)
- Risk: Low
- Complexity: Small + one additional assert pair

### Option C: Extract shared installer module
- Summary: Replace byte-identical copies with a single shared module required by per-plugin shims.
- Pros: Eliminates drift risk
- Cons: Breaks portable-copy design; reintroduces plugin_root ambiguity; large blast radius; contradicts `__dirname`-based portability intent
- Risk: Medium-High
- Complexity: Large

## Advisor Findings
Option B approved. Two refinements to fold into Phase 3:
1. **Regression test must discriminate the bug** — assert presence of a forge-distinguishing TOML filename (not just the managed block name which is identical across all forge plugins). Phase 3 must diff `plugins/kaola-workflow{,-gitlab,-gitea}/agents/` dirs to identify forge-specific TOML filenames before writing the test task.
2. **Lock assertIncludes literal exactly** — use `assertIncludes(skill, 'plugin_root="plugins/kaola-workflow-gitlab"')` with single-quote outer and literal double-quotes inside. A mismatched quoting style would silently match the wrong substring.

## Selected Approach
**Option B** — Minimal surgical fix with symmetric Gitea validator guards.

Rationale: Fixes all AC from #133, follows the GitHub reference pattern exactly, keeps each forge independently testable, and adds cheap symmetric protection against the identical regression recurring in Gitea at near-zero additional cost.

## Out of Scope (explicit)
- Do NOT add `install-codex-agent-profiles.js` to `installSupportScripts` (install.sh deliberately omits it; asserting it would be wrong)
- Do NOT add to `install.sh` SUPPORT_SCRIPT_NAMES (would trip stale-script cleanup loop at :198-204)
- Do NOT add to `scripts/validate-script-sync.js` (excluded by design at :33-34)
- Do NOT touch Gitea SKILL.md lines 116/118 (already correct)
- Do NOT run `assertNoForbidden` on the new scripts
- Do NOT refactor into a shared module (Option C — contradicts portable-copy design)

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |

## Notes / Future Considerations
- The `# BEGIN kaola-workflow agents` managed block uses the same name across all three forge plugins. A user with multiple forge plugins installed would have them clobber each other in `.codex/config.toml`. Pre-existing condition — #133 doesn't make it worse.
