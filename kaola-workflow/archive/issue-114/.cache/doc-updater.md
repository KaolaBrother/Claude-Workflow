# Doc Updater: issue-114

## Files Updated

### CHANGELOG.md
Added comprehensive Gitea plugin entry under [Unreleased], covering:
- Forge adapter (kaola-gitea-forge.js)
- Commands (9 .md files)
- Skills (9 SKILL.md files)
- Agent profiles (9 .toml files)
- Hooks (pre-commit, phantom-advisor, hooks.json)
- Config (agents.toml)
- Plugin manifests (.claude-plugin, .codex-plugin)

### README.md
Updated 4 sections:
- Codex packs section: Added Gitea edition to list of available editions
- Marketplace description: Updated to mention all three entries
- Codex installation: Updated to include gitea entry in example config
- Release versioning: Added Gitea plugin manifest version and clarified three Codex packs

### .agents/plugins/marketplace.json
Added kaola-workflow-gitea entry with:
- source: local, path: ./plugins/kaola-workflow-gitea
- policy: AVAILABLE, ON_INSTALL
- category: Coding

## Files Reviewed — No Changes Needed

- **docs/api.md**: Already documents Gitea forge module exports comprehensively
- **docs/architecture.md**: Focuses on phase flow, not plugin structure; no impact
- **.env.example**: Already includes GITEA_TOKEN and GITEA_SERVER_URL documentation
- **Inline comments**: No public API interfaces changed in existing code
