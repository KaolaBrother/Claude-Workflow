# Phase 3 - Plan: issue-76

## Task 1: Vendor Agent Source Files

- File: `agents/*.md`
- Test File: `scripts/validate-vendored-agents.js`
- Write Set: `agents/`
- Depends On: none
- Parallel Group: serial
- Action: CREATE
- Implement: Fetch 9 pinned upstream ECC agent files, preserve YAML front matter, and insert Kaola/ECC attribution after front matter.
- Mirror: Codex agent list from `plugins/kaola-workflow/config/agents.toml`.
- Validate: `node scripts/validate-vendored-agents.js`

## Task 2: Add Vendored Agent Validator

- File: `scripts/validate-vendored-agents.js`, `package.json`
- Test File: `scripts/validate-vendored-agents.js`
- Write Set: `scripts/validate-vendored-agents.js`, `package.json`
- Depends On: Task 1
- Parallel Group: serial
- Action: CREATE/MODIFY
- Implement: Assert exact agent set, attribution metadata, pinned commit, README/package/docs sync.
- Mirror: `scripts/validate-workflow-contracts.js` assertion style.
- Validate: `node scripts/validate-vendored-agents.js`

## Task 3: Install And Uninstall Managed Agents

- File: `install.sh`, `uninstall.sh`
- Test File: shell smoke commands
- Write Set: `install.sh`, `uninstall.sh`
- Depends On: Task 1
- Parallel Group: serial
- Action: MODIFY
- Implement: Install agents into `~/.claude/agents`, remove ECC prompt, track managed hashes, skip unknown/user-modified destinations, and uninstall only marked files.
- Mirror: existing explicit command/support install and uninstall style.
- Validate: `bash -n install.sh uninstall.sh`; sandbox install/uninstall checks.

## Task 4: Update Documentation And Package Metadata

- File: `README.md`, `docs/agents-source.md`, `package.json`
- Test File: validator and package JSON parse
- Write Set: `README.md`, `docs/agents-source.md`, `package.json`
- Depends On: Task 1
- Parallel Group: serial
- Action: CREATE/MODIFY
- Implement: Replace ECC prerequisite docs with vendored attribution, document source commit/refresh, include package files, remove ECC peer dependency metadata.
- Mirror: README install section and package allowlist style.
- Validate: `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`; `node scripts/validate-vendored-agents.js`

## Task 5: Full Validation

- File: all changed files
- Test File: package scripts
- Write Set: workflow evidence only
- Depends On: Tasks 1-4
- Parallel Group: serial
- Action: VERIFY
- Implement: Run targeted acceptance and full test commands.
- Mirror: issue acceptance criteria.
- Validate: `npm test`; `npm run test:kaola-workflow:gitlab`

## Explicit Out Of Scope

- Prompt behavior changes beyond attribution metadata.
- Automatic upstream refresh.
- Settings hook merge.
- Codex-side agent profile changes.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | `.cache/architect.md` | Performed in current Codex session |
| advisor plan gate | invoked | `.cache/advisor-plan.md` | Performed in current Codex session |
| blueprint revisions | N/A | N/A | Advisor did not require a revision |
