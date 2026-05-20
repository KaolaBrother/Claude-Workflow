# Planner Output — issue-133

## Summary

Three implementation options analyzed. Planner recommends Option B (Option A + symmetric Gitea guards).

### Fact #5 Conflict Resolved

Phase 1 said add to BOTH `scriptFiles` AND `installSupportScripts`. Planner findings:
- **Add to `scriptFiles` only** — this asserts the file exists under `pluginRoot/scripts/`. Correct.
- **Do NOT add to `installSupportScripts`** — that asserts `install.sh` includes the script name, but `install.sh` deliberately omits `install-codex-agent-profiles.js` (it's distributed via Codex plugin cache, not install.sh). Adding it would assert a string install.sh deliberately omits and would trip the stale-script cleanup loop at `install.sh:198-204`.

### Fact #7 Test Location Resolved

Regression tests go in `test-gitlab-workflow-scripts.js` and `test-gitea-workflow-scripts.js`, NOT in the thin `simulate-*-codex-workflow-walkthrough.js` orchestrators. Those test-scripts already import `fs`/`os`/`path`/`spawnSync` and have a `tempRoot()` helper and node-native `assert`, and they are already dispatched by the Codex walkthrough orchestrator.

---

## Option A — Minimal surgical fix

1. Fix GitLab SKILL.md lines 116 + 118
2. Copy `install-codex-agent-profiles.js` to both forge plugin scripts dirs
3. Add to `scriptFiles` existence array in both validators
4. Add GitLab-validator `assertIncludes`/`assertNotIncludes` guards
5. Add regression test to `test-gitlab-workflow-scripts.js` and `test-gitea-workflow-scripts.js`

- Pros: Smallest diff, mirrors GitHub reference, each forge independently verifiable
- Cons: Two manually-maintained byte-identical copies (acceptable by design)
- Risk: Low
- Complexity: Small

## Option B — Option A + symmetric Gitea validator guards (RECOMMENDED)

Same as A, plus: `assertIncludes(giteaInitSkill, 'plugin_root="plugins/kaola-workflow-gitea"')` and `assertNotIncludes` the wrong string in the Gitea validator.

- Pros: Symmetric protection, prevents the same regression in Gitea
- Cons: Slightly beyond literal #133 scope (Gitea SKILL.md has no current bug)
- Risk: Low — cheap guards
- Complexity: Small + one additional assert pair

## Option C — Extract shared installer module

Replace byte-identical copies with a single shared module required by per-plugin shims.

- Pros: Eliminates drift risk
- Cons: Breaks portable-copy design, reintroduces plugin_root ambiguity, large blast radius
- Risk: Medium-High
- Complexity: Large (out of scope)

---

## Explicit NOT to build

- Do NOT add to `installSupportScripts` (install.sh deliberately omits it)
- Do NOT add to `install.sh` SUPPORT_SCRIPT_NAMES
- Do NOT add to `scripts/validate-script-sync.js` (excluded by design at :33-34)
- Do NOT touch Gitea SKILL.md lines 116/118 (already correct)
- Do NOT run `assertNoForbidden` on the new script
- Do NOT refactor into shared module (Option C — contradicts portable-copy design)

---

## Key file paths

- `plugins/kaola-workflow/scripts/install-codex-agent-profiles.js` (source to copy)
- `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md` lines 116+118 (fix)
- `plugins/kaola-workflow-gitlab/scripts/install-codex-agent-profiles.js` (create)
- `plugins/kaola-workflow-gitea/scripts/install-codex-agent-profiles.js` (create)
- `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` (scriptFiles :121-134; new guards near :275-285)
- `plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js` (scriptFiles :120-133; symmetric guards)
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js` (regression)
- `plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js` (regression)
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` lines 36-81 (test pattern reference)
