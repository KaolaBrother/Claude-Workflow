# Changelog

## 2.1.1 - 2026-05-11

### Fixed

- Made `codex-workflow-next` locate the Codex repair-state script from the
  installed Codex plugin cache when the workflow pack is not checked out inside
  the target project.

## 2.1.0 - 2026-05-11

### Added

- Added Codex-native agent profile installation for the Codex workflow pack.
- Added Codex install, update, verification, and release-versioning guidance to
  the README.

### Changed

- Bumped the root workflow package and Claude plugin manifest to `2.1.0`.
- Bumped the Codex workflow plugin manifest to `0.2.0` for the new Codex agent
  profile install surface.
