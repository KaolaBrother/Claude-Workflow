# Code Explorer Output — issue-133

## GitLab/Gitea Codex Init Agent Profile Installer Drift

### Key Finding: GitLab has TWO bugs, Gitea is missing the script only

---

### SKILL.md Codex Init Block (lines 116-119)

**GitHub (correct reference)** — `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md`:
```bash
plugin_root="plugins/kaola-workflow"
if [ ! -f "$plugin_root/scripts/install-codex-agent-profiles.js" ]; then
  script_path="$(find "$HOME/.codex/plugins/cache" -path '*/kaola-workflow/*/scripts/install-codex-agent-profiles.js' -print -quit 2>/dev/null)"
  plugin_root="$(dirname "$(dirname "$script_path")")"
fi
```

**GitLab (BUG — two errors)** — `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md`:
```bash
plugin_root="plugins/kaola-workflow"                          # BUG: should be "plugins/kaola-workflow-gitlab"
if [ ! -f "$plugin_root/scripts/install-codex-agent-profiles.js" ]; then
  script_path="$(find "$HOME/.codex/plugins/cache" -path '*/kaola-workflow/*/scripts/install-codex-agent-profiles.js' -print -quit 2>/dev/null)"  # BUG: should be '*/kaola-workflow-gitlab/*/...'
  plugin_root="$(dirname "$(dirname "$script_path")")"
fi
```

**Gitea (line 116 correct, cache path correct, but script doesn't exist)**:
```bash
plugin_root="plugins/kaola-workflow-gitea"                   # correct
if [ ! -f "$plugin_root/scripts/install-codex-agent-profiles.js" ]; then
  script_path="$(find "$HOME/.codex/plugins/cache" -path '*/kaola-workflow-gitea/*/scripts/install-codex-agent-profiles.js' -print -quit 2>/dev/null)"  # correct
  plugin_root="$(dirname "$(dirname "$script_path")")"
fi
test -f "$plugin_root/scripts/install-codex-agent-profiles.js"   # FAILS — script doesn't exist
node "$plugin_root/scripts/install-codex-agent-profiles.js" "$PWD"
```

---

### Reference Implementation

`plugins/kaola-workflow/scripts/install-codex-agent-profiles.js`:
- Uses `const pluginRoot = path.resolve(__dirname, '..')` — derives own plugin root from `__dirname`, fully portable
- Expects `{pluginRoot}/agents/*.toml` and `{pluginRoot}/config/agents.toml`
- Copies all `.toml` agent profiles to `{projectRoot}/.codex/agents/kaola-workflow/`
- Upserts a managed `# BEGIN kaola-workflow agents` block in `{projectRoot}/.codex/config.toml`
- Idempotent — calling multiple times leaves exactly one managed block
- Can be copied byte-for-byte to GitLab/Gitea plugins with no modification needed

---

### Script Directory Inventories

**`plugins/kaola-workflow/scripts/`** (GitHub):
- `install-codex-agent-profiles.js` ✓ present
- `simulate-kaola-workflow-walkthrough.js`, `kaola-workflow-claim.js`, etc.

**`plugins/kaola-workflow-gitlab/scripts/`** (GitLab — missing):
- NO `install-codex-agent-profiles.js`
- Has: `kaola-gitlab-forge.js`, `kaola-gitlab-workflow-claim.js`, `validate-kaola-workflow-gitlab-contracts.js`, `simulate-gitlab-codex-workflow-walkthrough.js`, etc.

**`plugins/kaola-workflow-gitea/scripts/`** (Gitea — missing):
- NO `install-codex-agent-profiles.js`
- Has: `kaola-gitea-forge.js`, `kaola-gitea-workflow-claim.js`, `validate-kaola-workflow-gitea-contracts.js`, `simulate-gitea-codex-workflow-walkthrough.js`, etc.

---

### Contract Validation Architecture

| Validator | Path | Run by |
|-----------|------|--------|
| `validate-workflow-contracts.js` | `scripts/` | `test:kaola-workflow:claude` |
| `validate-kaola-workflow-gitlab-contracts.js` | `plugins/kaola-workflow-gitlab/scripts/` | `test:kaola-workflow:gitlab` |
| `validate-kaola-workflow-gitea-contracts.js` | `plugins/kaola-workflow-gitea/scripts/` | `test:kaola-workflow:gitea` |

**Critical gap:** Current `assertNoForbidden` check does NOT catch the GitLab drift because `plugin_root="plugins/kaola-workflow"` alone doesn't trigger the forbidden pattern — only the runtime-expanded `$plugin_root/scripts/...` would, which isn't present as a literal string.

**Both gitlab and gitea validators need:**
1. Add `'install-codex-agent-profiles.js'` to `scriptFiles` array (line ~121)
2. Add `'install-codex-agent-profiles.js'` to `installSupportScripts` array (line ~137)
3. GitLab: add `assertIncludes(gitlabInitSkill, 'plugin_root="plugins/kaola-workflow-gitlab"')` 
4. GitLab: add `assertNotIncludes` to ban `plugin_root="plugins/kaola-workflow"` (without the -gitlab suffix)

---

### Regression Test Structure

GitHub template in `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` lines 36-81:
```javascript
const installProfilesScript = path.join(pluginRoot, 'scripts', 'install-codex-agent-profiles.js');

function runInstallProfiles(target) {
  const result = spawnSync(process.execPath, [installProfilesScript, target], {
    cwd: repoRoot, encoding: 'utf8'
  });
  if (result.error) throw result.error;
  assert(result.status === 0, 'install profiles failed: ' + result.stderr);
}

function testInstallProfilesFeaturesTableHandling() {
  // Creates fresh tmpdir, runs install, asserts [features]/multi_agent/managed block present
  // Creates existing tmpdir with custom [features], runs install twice, asserts idempotency
}
```

GitLab/Gitea simulate-*-codex-workflow-walkthrough.js are currently only 22 lines — just chain to validation and sink tests. Need to add `testInstallProfilesFeaturesTableHandling` equivalent.

**Note:** Do NOT add `install-codex-agent-profiles.js` to `scripts/validate-script-sync.js` — it explicitly excludes this file from byte-sync enforcement (line 33 comment).

---

### Complete Change Set

| File | Change |
|------|--------|
| `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md:116` | `plugin_root="plugins/kaola-workflow"` → `"plugins/kaola-workflow-gitlab"` |
| `plugins/kaola-workflow-gitlab/skills/kaola-workflow-init/SKILL.md:118` | cache find path `*/kaola-workflow/*/` → `*/kaola-workflow-gitlab/*/` |
| `plugins/kaola-workflow-gitlab/scripts/install-codex-agent-profiles.js` | Copy from GitHub (byte-identical, `__dirname` makes it self-locating) |
| `plugins/kaola-workflow-gitea/scripts/install-codex-agent-profiles.js` | Copy from GitHub (byte-identical, `__dirname` makes it self-locating) |
| `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` | Add to scriptFiles, installSupportScripts; add assertIncludes/assertNotIncludes for plugin_root |
| `plugins/kaola-workflow-gitea/scripts/validate-kaola-workflow-gitea-contracts.js` | Add to scriptFiles, installSupportScripts; add regression guard |
| `plugins/kaola-workflow-gitlab/scripts/simulate-gitlab-codex-workflow-walkthrough.js` | Add testInstallProfilesFeaturesTableHandling |
| `plugins/kaola-workflow-gitea/scripts/simulate-gitea-codex-workflow-walkthrough.js` | Add testInstallProfilesFeaturesTableHandling |
