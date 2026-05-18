# Code Explorer Notes: issue-76

## Scope Facts

- `install.sh` currently checks for ECC-provided agents before installing commands and support files. The check starts at the `# Check ECC is installed` block and uses the 9 required names: `code-explorer`, `docs-lookup`, `planner`, `code-architect`, `tdd-guide`, `build-error-resolver`, `code-reviewer`, `security-reviewer`, `doc-updater`.
- The missing-agent branch prints an ECC warning and, unless `--yes` is set, prompts with `read -r -p "Continue installation anyway? [y/N]"`. In no-stdin mode this exits before command installation.
- `HOME=$(mktemp -d) bash install.sh < /dev/null` currently returns status 1 and does not install Kaola command/support files.
- `HOME=$(mktemp -d) bash install.sh --yes < /dev/null` currently returns status 0 and installs commands/support files, but no agent files.
- Root `agents/` does not exist.
- `uninstall.sh` currently removes commands and support directories only. It has no agent cleanup path.
- `README.md` has a user-facing ECC prerequisite section with install instructions and ECC hook policy text.
- `package.json` excludes root `agents/` and `docs/agents-source.md` from `files`, and still declares optional `ecc-universal` peer dependency metadata.
- Codex agent parity already exists under `plugins/kaola-workflow/agents/*.toml` and `plugins/kaola-workflow/config/agents.toml`.

## Implementation Surfaces

- Create root `agents/*.md` from upstream ECC `agents/*.md`.
- Modify `install.sh` to install managed agent files into `$HOME/.claude/agents`.
- Modify `uninstall.sh` to remove only Kaola-markered agent files.
- Update `README.md`, `package.json`, and add `docs/agents-source.md`.
- Add `scripts/validate-vendored-agents.js` and wire it into package test scripts.

## Test Surfaces

- `bash -n install.sh uninstall.sh`
- `node scripts/validate-vendored-agents.js`
- `HOME=$(mktemp -d) bash install.sh --yes`
- `HOME=$(mktemp -d) bash install.sh < /dev/null`
- `HOME=$(mktemp -d) bash install.sh --yes --forge=gitlab`
- `uninstall.sh --forge=all` sandbox check with user-added agent preservation
- `npm test`
- `npm run test:kaola-workflow:gitlab`
