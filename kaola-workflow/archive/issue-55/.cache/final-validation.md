# Final Validation - issue-55

## Focused Acceptance Commands

```text
bash -n install.sh uninstall.sh
```

Result: pass.

```text
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8')); JSON.parse(require('fs').readFileSync('plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json','utf8')); JSON.parse(require('fs').readFileSync('plugins/kaola-workflow/.codex-plugin/plugin.json','utf8')); JSON.parse(require('fs').readFileSync('plugins/kaola-workflow-gitlab/.codex-plugin/plugin.json','utf8'));"
```

Result: pass.

```text
npm run test:kaola-workflow:gitlab
```

Result: pass. Output includes `gitlab tests pending #58`.

```text
claude plugin validate .
```

Result: pass. Output includes `Validation passed`.

```text
TMP_HOME=$(mktemp -d); HOME="$TMP_HOME" bash install.sh --forge=github --yes
```

Result: pass. Existing GitHub commands, support scripts, and support hook installed under temp `HOME`.

```text
TMP_HOME=$(mktemp -d); HOME="$TMP_HOME" bash install.sh --forge=gitlab --yes && HOME="$TMP_HOME" bash uninstall.sh --forge=gitlab
```

Result: pass. GitLab skeleton support directory was created under temp `HOME` and then removed.

```text
git diff --name-only -- plugins/kaola-workflow
```

Result before sink-gate repairs: pass. No output; the #55 GitLab skeleton implementation did not modify the existing GitHub plugin tree.

```text
git diff --check
```

Result: pass.

## Full Suite

```text
npm test
```

Initial result after rebase: failed before merge sink completion.

Sink-gate fixes applied:

- Synchronized `.claude-plugin/plugin.json` and `plugins/kaola-workflow-gitlab/.claude-plugin/plugin.json` to the rebased package version `3.7.0`.
- Restored missing Codex plugin mirror file `plugins/kaola-workflow/scripts/kaola-workflow-compact-context.js` from the root script.
- Made Epic Case 6J in both walkthrough simulators clear inherited Codex session variables so the orphan ticker assertion is deterministic inside Codex sessions.

Final result:

```text
npm test
```

Result: pass.

## Verdict

Focused #55 acceptance validation passed. The final branch also passes the default `npm test` gate after the separate sink-gate repairs above.
