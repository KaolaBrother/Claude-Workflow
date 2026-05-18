# TDD Task 2 Evidence: Launch Documentation And Metadata

## Change

Updated `README.md` and `CHANGELOG.md` to document:

- GitHub default edition and GitLab opt-in edition.
- Claude Code one-liner and local `--forge=github|gitlab` installs.
- `./uninstall.sh --forge=github|gitlab|all`.
- GitLab prerequisites: authenticated `glab`, GitLab project selection, issues/MRs enabled, and workflow labels.
- Claude marketplace and Codex marketplace entries for both editions.
- Current release metadata: Claude `3.8.0`, Codex `1.4.0`, and packaged `plugins/` surface.
- `[Unreleased]` GitLab launch gate entry linked to #65 and child issues #66, #72, #67, #68, #69, #70, #71.

## Validation

Command:

```bash
node - <<'NODE'
const fs=require('fs');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const root=JSON.parse(fs.readFileSync('.claude-plugin/plugin.json','utf8'));
const gl=JSON.parse(fs.readFileSync('plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json','utf8'));
const codex=JSON.parse(fs.readFileSync('plugins/kaola-workflow/.codex-plugin/plugin.json','utf8'));
const codexGl=JSON.parse(fs.readFileSync('plugins/kaola-workflow-gitlab/.codex-plugin/plugin.json','utf8'));
if (pkg.version !== root.version || pkg.version !== gl.version) throw new Error('Claude/package versions differ');
if (codex.version !== codexGl.version) throw new Error('Codex edition versions differ');
if (!pkg.files.includes('plugins/')) throw new Error('package files missing plugins/');
console.log(`metadata consistent: claude=${pkg.version}, codex=${codex.version}, plugins packaged`);
NODE
```

Result:

```text
metadata consistent: claude=3.8.0, codex=1.4.0, plugins packaged
```
