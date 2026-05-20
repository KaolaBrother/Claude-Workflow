# Phase 3 - Plan: issue-133

## Blueprint

### Files to Create
| File | Purpose | Key Interfaces |
|------|---------|----------------|
| `plugins/kaola-workflow-gitlab/scripts/install-codex-agent-profiles.js` | Codex agent profile installer for GitLab plugin | Byte-identical copy from GitHub plugin. `__dirname`-based `pluginRoot = path.resolve(__dirname, '..')` resolves to GitLab plugin root. |
| `plugins/kaola-workflow-gitea/scripts/install-codex-agent-profiles.js` | Codex agent profile installer for Gitea plugin | Same byte-identical copy. `__dirname` resolves to Gitea plugin root. |

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md` | Lines 116+118: `-workflow"` → `-workflow-gitlab"` and cache find path | Fix the two-line plugin_root bug (issue #133) |
| `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` | Add to scriptFiles array; add 4 init-skill assertions with negative-lookahead regex | Enforce script presence + correct plugin_root |
| `plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js` | Add to scriptFiles array; add 4 symmetric init-skill assertions | Symmetric regression guard for Gitea |
| `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js` | Add `testInstallProfilesFeaturesTableHandling()` before final promise chain | Regression test for GitLab script |
| `plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js` | Add `testInstallProfilesFeaturesTableHandling()` before final promise chain | Regression test for Gitea script |

### Build Sequence
1. CREATE `plugins/kaola-workflow-gitlab/scripts/install-codex-agent-profiles.js` — byte-identical copy from GitHub plugin
2. CREATE `plugins/kaola-workflow-gitea/scripts/install-codex-agent-profiles.js` — same byte-identical copy
3. MODIFY `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md` — fix lines 116+118
   *(Steps 1-3 are parallel — disjoint write sets)*
4. MODIFY `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` — depends on step 1
5. MODIFY `plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js` — depends on step 2
6. MODIFY `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js` — depends on step 1
7. MODIFY `plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js` — depends on step 2
   *(Steps 4-7 are parallel — all depend on steps 1-3, disjoint write sets)*

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | 1, 2, 3 | Disjoint files (two new scripts, one SKILL.md) |
| B | 4, 5, 6, 7 | Disjoint files (two validators, two test files); all depend on Group A |

### External Dependencies
- `require('fs')`, `require('path')`, `require('os')`, `require('child_process').spawnSync` — all Node built-ins, no new npm packages

---

## Task List

### Task 1: Create GitLab install-codex-agent-profiles.js
- File: `plugins/kaola-workflow-gitlab/scripts/install-codex-agent-profiles.js`
- Test File: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`
- Write Set: `plugins/kaola-workflow-gitlab/scripts/install-codex-agent-profiles.js`
- Depends On: none
- Parallel Group: A
- Action: CREATE
- Implement: Byte-identical copy of `plugins/kaola-workflow/scripts/install-codex-agent-profiles.js`. `__dirname`-based resolution (`path.resolve(__dirname, '..')`) makes it self-contained in any forge plugin dir.
- Mirror: `plugins/kaola-workflow/scripts/install-codex-agent-profiles.js`
- Validate: `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`

### Task 2: Create Gitea install-codex-agent-profiles.js
- File: `plugins/kaola-workflow-gitea/scripts/install-codex-agent-profiles.js`
- Test File: `plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js`
- Write Set: `plugins/kaola-workflow-gitea/scripts/install-codex-agent-profiles.js`
- Depends On: none
- Parallel Group: A
- Action: CREATE
- Implement: Same byte-identical copy. `__dirname` resolves to Gitea plugin root.
- Mirror: `plugins/kaola-workflow/scripts/install-codex-agent-profiles.js`
- Validate: `node plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js`

### Task 3: Fix GitLab SKILL.md plugin_root lines
- File: `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md`
- Test File: `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`
- Write Set: `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md`
- Depends On: none
- Parallel Group: A
- Action: MODIFY
- Implement:
  - Line 116: `plugin_root="plugins/kaola-workflow"` → `plugin_root="plugins/kaola-workflow-gitlab"`
  - Line 118: `*/kaola-workflow/*/scripts/install-codex-agent-profiles.js` → `*/kaola-workflow-gitlab/*/scripts/install-codex-agent-profiles.js`
- Mirror: `plugins/kaola-workflow-gitea/skills/kaola-workflow-init/SKILL.md` lines 116+118 (already correct — reference for expected state)
- Validate: `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`

### Task 4: Update GitLab validator — scriptFiles + init-skill assertions
- File: `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`
- Test File: N/A (this file IS the validator)
- Write Set: `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`
- Depends On: Task 1
- Parallel Group: B
- Action: MODIFY
- Implement:
  1. In `const scriptFiles = [` array (after `'simulate-gitlab-codex-workflow-walkthrough.js'`), add: `'install-codex-agent-profiles.js'`
  2. After `assertIncludes(gitlabInitSkill, '> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**');`, insert 4 assertions:
     ```javascript
     assertIncludes(gitlabInitSkill, 'plugin_root="plugins/kaola-workflow-gitlab"');
     assert(
       !/plugin_root="plugins\/kaola-workflow"(?!-)/.test(read(gitlabInitSkill)),
       gitlabInitSkill + ' must not contain bare plugin_root="plugins/kaola-workflow" (without -gitlab suffix)'
     );
     assertIncludes(gitlabInitSkill, "*/kaola-workflow-gitlab/*/scripts/install-codex-agent-profiles.js");
     assert(
       !/\*\/kaola-workflow\/\*\/scripts\/install-codex-agent-profiles\.js/.test(read(gitlabInitSkill)),
       gitlabInitSkill + ' must not contain bare */kaola-workflow/* find path (without -gitlab suffix)'
     );
     ```
- Mirror: Gitea validator (Task 5) — symmetric pattern
- Validate: `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`

### Task 5: Update Gitea validator — scriptFiles + init-skill assertions
- File: `plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js`
- Test File: N/A (this file IS the validator)
- Write Set: `plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js`
- Depends On: Task 2
- Parallel Group: B
- Action: MODIFY
- Implement:
  1. In `const scriptFiles = [` array (after `'simulate-gitea-codex-workflow-walkthrough.js'`), add: `'install-codex-agent-profiles.js'`
  2. After `assertIncludes(giteaInitSkill, '> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**');`, insert 4 assertions:
     ```javascript
     assertIncludes(giteaInitSkill, 'plugin_root="plugins/kaola-workflow-gitea"');
     assert(
       !/plugin_root="plugins\/kaola-workflow"(?!-)/.test(read(giteaInitSkill)),
       giteaInitSkill + ' must not contain bare plugin_root="plugins/kaola-workflow" (without -gitea suffix)'
     );
     assertIncludes(giteaInitSkill, "*/kaola-workflow-gitea/*/scripts/install-codex-agent-profiles.js");
     assert(
       !/\*\/kaola-workflow\/\*\/scripts\/install-codex-agent-profiles\.js/.test(read(giteaInitSkill)),
       giteaInitSkill + ' must not contain bare */kaola-workflow/* find path (without -gitea suffix)'
     );
     ```
- Mirror: GitLab validator (Task 4) — symmetric pattern
- Validate: `node plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js`

### Task 6: Add regression test to GitLab test file
- File: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`
- Test File: (this file IS the test)
- Write Set: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`
- Depends On: Task 1
- Parallel Group: B
- Action: MODIFY
- Implement: Insert before the final async promise chain (before `testGitLabRoadmapInitIssueExclusiveAndUpdate().then(...)`):
  ```javascript
  const gitlabPluginRoot = path.resolve(__dirname, '..');
  const installProfilesScript = path.join(gitlabPluginRoot, 'scripts', 'install-codex-agent-profiles.js');

  function runInstallProfiles(target) {
    const result = spawnSync(process.execPath, [installProfilesScript, target], {
      cwd: gitlabPluginRoot,
      encoding: 'utf8'
    });
    if (result.error) throw result.error;
    assert.ok(result.status === 0, 'install profiles failed: ' + result.stderr);
  }

  function countOccurrences(content, pattern) {
    return (content.match(pattern) || []).length;
  }

  function testInstallProfilesFeaturesTableHandling() {
    const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-gl-codex-install-fresh-'));
    const existing = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-gl-codex-install-existing-'));
    try {
      runInstallProfiles(fresh);
      const freshConfig = fs.readFileSync(path.join(fresh, '.codex', 'config.toml'), 'utf8');
      assert.ok(freshConfig.includes('[features]'), 'fresh install should include managed [features]');
      assert.ok(freshConfig.includes('multi_agent = true'), 'fresh install should enable multi_agent');
      assert.ok(freshConfig.includes('# BEGIN kaola-workflow agents'), 'fresh install should include managed block');
      assert.strictEqual(
        fs.readdirSync(path.join(fresh, '.codex', 'agents', 'kaola-workflow')).length,
        9,
        'should install 9 agent TOML files'
      );

      const existingCodexDir = path.join(existing, '.codex');
      fs.mkdirSync(existingCodexDir, { recursive: true });
      const existingConfigPath = path.join(existingCodexDir, 'config.toml');
      fs.writeFileSync(existingConfigPath, [
        '[features]', 'goals = true', '', '[projects."/tmp/example"]', 'trust_level = "trusted"', ''
      ].join('\n'));

      runInstallProfiles(existing);
      runInstallProfiles(existing);
      const updated = fs.readFileSync(existingConfigPath, 'utf8');
      assert.strictEqual(
        countOccurrences(updated, /^\[features\]$/gm),
        1,
        'existing config must contain exactly one [features] table'
      );
      assert.ok(updated.includes('goals = true'), 'existing [features] content must be preserved');
      assert.ok(updated.includes('[agents.code-explorer]'), 'managed agent block should still be installed');
    } finally {
      fs.rmSync(fresh, { recursive: true, force: true });
      fs.rmSync(existing, { recursive: true, force: true });
    }
  }

  testInstallProfilesFeaturesTableHandling();
  ```
- Mirror: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js:36-81`; Gitea test (Task 7)
- Validate: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js`

### Task 7: Add regression test to Gitea test file
- File: `plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js`
- Test File: (this file IS the test)
- Write Set: `plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js`
- Depends On: Task 2
- Parallel Group: B
- Action: MODIFY
- Implement: Identical to Task 6 except:
  - `gitlabPluginRoot` → `giteaPluginRoot`
  - tmpdir prefixes: `kw-gitea-codex-install-fresh-` / `kw-gitea-codex-install-existing-`
  - `cwd: giteaPluginRoot`
  - Insert before the final async promise chain in the Gitea test file
- Mirror: GitLab test (Task 6) — symmetric pattern
- Validate: `node plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js`

---

## Advisor Notes

Blueprint approved. Two pre-Phase-4 verifications passed:
1. GitLab SKILL.md has exactly ONE occurrence of `plugin_root="plugins/kaola-workflow"` — the line being fixed. No bare `*/kaola-workflow/*` find path present. Regex assertions will not produce false positives.
2. Gitea SKILL.md has zero occurrences of either wrong string. Symmetric guards will fire on regression only.

Key constraints for Phase 4:
- assertIncludes literals must use single-quote outer with embedded double-quotes: `'plugin_root="plugins/kaola-workflow-gitlab"'`
- agents count assertion must be exactly 9 (all three plugins have identical 9-file agent sets — no forge-distinguishing TOML filenames exist)
- Add to `scriptFiles` only — do NOT add to `installSupportScripts` (install.sh deliberately omits this script)
- Do NOT run `assertNoForbidden` on the new scripts
- Do NOT touch Gitea SKILL.md lines 116/118 (already correct)

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | | Blueprint approved without revision; no gaps found |
