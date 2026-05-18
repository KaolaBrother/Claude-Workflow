# Architect Notes: issue-76

## Blueprint

1. Vendor upstream agent files into root `agents/`.
   - Preserve front matter.
   - Insert attribution after front matter.
   - Include source URL, pinned commit, upstream blob SHA, MIT notice, and managed marker.

2. Add `scripts/validate-vendored-agents.js`.
   - Assert exact required agent file set.
   - Assert front matter starts at byte 0.
   - Assert attribution metadata exists after front matter.
   - Assert docs/package/installer references stay in sync.

3. Update installer.
   - Remove ECC check and prompt.
   - Add `AGENTS_DIR`, `SOURCE_AGENTS_DIR`, required agent list, manifest path, portable sha256 helper.
   - Copy missing files.
   - If destination differs, overwrite only when manifest records the previous installed hash and current destination hash matches that record.
   - Skip unknown or modified files with a notice.
   - Verify required agent paths exist.

4. Update uninstaller.
   - Remove only required agent files containing the managed marker.
   - Leave user files without marker untouched.
   - Remove the manifest when no managed files remain.

5. Update docs/package.
   - Replace README ECC dependency section with vendored attribution.
   - Keep hook policy as legacy ECC hook guidance but remove install-prerequisite language.
   - Add `docs/agents-source.md`.
   - Add package files entries and remove ECC peer dependency metadata.

6. Validate.
   - Run targeted installer/uninstaller smoke checks.
   - Run full project tests.
