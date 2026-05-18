# TDD Task 1 Evidence: Installer And GitLab Validator

## RED

Command:

```bash
node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js
```

Result: failed after adding the new GitLab install-script assertions.

Key failure:

```text
Error: install.sh must install GitLab support script: kaola-gitlab-forge.js
```

## GREEN

Changed `install.sh` GitLab `SUPPORT_SCRIPT_NAMES` to the actual `kaola-gitlab-*` support scripts.

Command:

```bash
node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js
```

Result:

```text
Kaola-Workflow GitLab contract validation passed
```

## REFACTOR / Targeted Validation

Commands:

```bash
bash -n install.sh uninstall.sh
node --check plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js
git diff --check
npm run test:kaola-workflow:gitlab
```

Result: all passed.

Additional isolated `HOME` smoke tests passed:

```text
github install/uninstall smoke passed
gitlab install/uninstall smoke passed
all uninstall smoke passed
```
