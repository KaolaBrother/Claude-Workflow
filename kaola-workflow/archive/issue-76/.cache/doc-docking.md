# Documentation Docking: issue-76

## Changed Behavior

- `install.sh` now installs vendored Claude Code agents and no longer prompts for external ECC setup.
- `uninstall.sh` now removes only Kaola-managed vendored agents.
- Package publication includes the vendored agents and source documentation.

## Docking Checks

- `README.md` no longer instructs users to install ECC separately.
- `README.md` links `docs/agents-source.md`.
- `docs/agents-source.md` records the pinned upstream commit and refresh procedure.
- `package.json` includes `agents/` and `docs/agents-source.md`.
- `scripts/validate-vendored-agents.js` enforces attribution metadata, pinned commit, README wording, installer wording, and package metadata.

## Verdict

DOCKED
