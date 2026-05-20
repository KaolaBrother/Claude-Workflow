# Code-Architect Blueprint — issue-133

## Design Decisions

- Option B (surgical fix): two-line SKILL.md patch on GitLab only + byte-identical copy of `install-codex-agent-profiles.js` into both forge plugin `scripts/` directories.
- Self-contained via `__dirname` resolution: no shared symlinks, no cross-plugin `require()`.
- Validator guards use negative-lookahead regex to distinguish `plugins/kaola-workflow"` (bad) from `plugins/kaola-workflow-gitlab` (good) without prefix-substring false matches.
- `install.sh`, `uninstall.sh`, `validate-script-sync.js` excluded by design.
- Gitea SKILL.md zero changes; symmetric validator guards added as regression locks.

---

## Files to CREATE

| File | Purpose | Key Interface |
|------|---------|---------------|
| `plugins/kaola-workflow-gitlab/scripts/install-codex-agent-profiles.js` | Codex agent profile installer for GitLab plugin | Byte-identical copy from `plugins/kaola-workflow/scripts/install-codex-agent-profiles.js`. `__dirname`-based `pluginRoot = path.resolve(__dirname, '..')` resolves to GitLab plugin root. |
| `plugins/kaola-workflow-gitea/scripts/install-codex-agent-profiles.js` | Codex agent profile installer for Gitea plugin | Same byte-identical copy. `__dirname` resolves to Gitea plugin root. |

## Files to MODIFY

| File | Changes | Why |
|------|---------|-----|
| `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md` | Lines 116+118: `-workflow"` → `-workflow-gitlab"` and cache find path | Fix the two-line plugin_root bug |
| `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` | Add to scriptFiles array; add 4 init-skill assertions using negative-lookahead regex | Enforce script presence + correct plugin_root |
| `plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js` | Add to scriptFiles array; add 4 symmetric init-skill assertions | Symmetric regression guard for Gitea |
| `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js` | Add `testInstallProfilesFeaturesTableHandling()` before final promise chain | Regression test for GitLab script |
| `plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js` | Add `testInstallProfilesFeaturesTableHandling()` before final promise chain | Regression test for Gitea script |

---

## Exact Modifications

### Mod 1: GitLab SKILL.md lines 116+118

Line 116:
- OLD: `  plugin_root="plugins/kaola-workflow"`
- NEW: `  plugin_root="plugins/kaola-workflow-gitlab"`

Line 118:
- OLD: `  script_path="$(find "$HOME/.codex/plugins/cache" -path '*/kaola-workflow/*/scripts/install-codex-agent-profiles.js' -print -quit 2>/dev/null)"`
- NEW: `  script_path="$(find "$HOME/.codex/plugins/cache" -path '*/kaola-workflow-gitlab/*/scripts/install-codex-agent-profiles.js' -print -quit 2>/dev/null)"`

### Mod 2: GitLab validator — scriptFiles array

In `const scriptFiles = [` array (currently line 121-133), ADD after `'simulate-gitlab-codex-workflow-walkthrough.js'`:
```javascript
  'install-codex-agent-profiles.js'
```

### Mod 3: GitLab validator — init-skill assertions (after line 277)

After `assertIncludes(gitlabInitSkill, '> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**');` insert:

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

### Mod 4: Gitea validator — scriptFiles array

In `const scriptFiles = [` array (currently line 120-132), ADD after `'simulate-gitea-codex-workflow-walkthrough.js'`:
```javascript
  'install-codex-agent-profiles.js'
```

### Mod 5: Gitea validator — init-skill assertions (after line 282)

After `assertIncludes(giteaInitSkill, '> **MANDATORY — READ CLAUDE.md BEFORE ANY ACTION THIS SESSION.**');` insert:

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

### Mod 6+7: Test files — add testInstallProfilesFeaturesTableHandling

Insert before the final async promise chain in each test file:

**GitLab** (`test-gitlab-workflow-scripts.js`):
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

**Gitea** — identical except `gitlabPluginRoot` → `giteaPluginRoot`, tmpdir prefixes `kw-gitea-codex-install-fresh-` / `kw-gitea-codex-install-existing-`, `cwd: giteaPluginRoot`.

---

## Build Sequence (dependency order)

1. CREATE `plugins/kaola-workflow-gitlab/scripts/install-codex-agent-profiles.js` — byte-identical copy
2. CREATE `plugins/kaola-workflow-gitea/scripts/install-codex-agent-profiles.js` — byte-identical copy
3. MODIFY `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md` — fix lines 116+118

   (Steps 1-3 are parallel with each other)

4. MODIFY `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` — depends on step 1
5. MODIFY `plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js` — depends on step 2
6. MODIFY `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js` — depends on step 1
7. MODIFY `plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js` — depends on step 2

   (Steps 4-7 are parallel with each other after 1-3)

---

## Edge Cases

1. **Prefix-substring collision**: assertNotIncludes would match the CORRECT string too (`-workflow-gitlab` contains `-workflow`). Resolved with negative-lookahead regex: `!/plugin_root="plugins\/kaola-workflow"(?!-)/.test(...)`.
2. **Per-file scripts scan in validators** (GitLab lines 303-309, Gitea lines 308-314): copied script uses only `require('fs')` and `require('path')`, no forge strings, no `gh`, no `plugins/kaola-workflow/scripts` literal. Passes cleanly.
3. **Agent count assertion (9)**: must match actual `agents/` count — verified all three plugins have 9 identical TOMLs.
4. **Idempotency**: test calls `runInstallProfiles(existing)` twice. `upsertBlock` logic replaces existing managed block; `countOccurrences` assertion confirms exactly one `[features]` table.
5. **`cwd` in spawnSync**: use plugin root (not repoRoot) — `__dirname` resolution means any cwd works, but pluginRoot is cleanest.

---

## Validation Commands

```bash
node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js
node plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js
node plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js
node plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js
node plugins/kaola-workflow-gitlab/scripts/simulate-gitlab-codex-workflow-walkthrough.js
node plugins/kaola-workflow-gitea/scripts/simulate-gitea-codex-workflow-walkthrough.js
node scripts/simulate-workflow-walkthrough.js
npm test
```
