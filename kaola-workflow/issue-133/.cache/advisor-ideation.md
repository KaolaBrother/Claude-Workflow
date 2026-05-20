# Advisor Output — Phase 2 Ideation Gate — issue-133

## Verdict: Option B approved. Proceed.

The planner correctly resolved both Phase 1 ambiguities (the `installSupportScripts` exclusion and the test-file location).

## Two refinements for Phase 3 task breakdown

### 1. Regression test must discriminate the bug

The reference test (`simulate-kaola-workflow-walkthrough.js:36-81`) asserts `[features]/multi_agent/managed block present` — but the managed block name (`# BEGIN kaola-workflow agents`) is the same regardless of which forge plugin ran the script. A future regression that re-points GitLab's script to copy GitHub's agents would still pass the test.

**Fix:** After install, also assert presence of a forge-distinguishing TOML name (a file that exists in the forge plugin's `agents/` dir but NOT in other forks). Phase 3 must diff `plugins/kaola-workflow{,-gitlab,-gitea}/agents/` directories first to identify forge-specific TOML filenames before writing the test task.

### 2. Lock the assertIncludes literal exactly

The discriminator depends on the trailing `"` distinguishing `plugin_root="plugins/kaola-workflow-gitlab"` from `plugin_root="plugins/kaola-workflow"`. The task spec must use: `assertIncludes(skill, 'plugin_root="plugins/kaola-workflow-gitlab"')` (single-quote outer, literal double-quotes inside). A mismatched quoting style would silently match the wrong substring.

## Non-blocking future consideration (record, do not expand scope)

The `# BEGIN kaola-workflow agents` managed block uses the same name across all three forge plugins. A user with multiple forge plugins installed would have them clobber each other in `.codex/config.toml`. Pre-existing condition — #133 doesn't make it worse. Record in "Future Considerations."
