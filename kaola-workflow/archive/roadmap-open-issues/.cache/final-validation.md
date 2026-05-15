Final validation for roadmap-open-issues.

Commands:
- npm test: passed
- git diff --check: passed
- node scripts/kaola-workflow-roadmap.js validate: passed
- Post-archive npm test: passed
- Post-archive git diff --check: passed
- Post-archive node scripts/kaola-workflow-roadmap.js validate: passed

Important npm test coverage:
- npm run test:kaola-workflow:claude:
  - bash -n install.sh uninstall.sh
  - package/plugin JSON parse
  - node scripts/validate-workflow-contracts.js
  - node scripts/simulate-workflow-walkthrough.js
  - claude plugin validate .
- npm run test:kaola-workflow:codex:
  - node scripts/validate-kaola-workflow-contracts.js
  - node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js

Result: PASS
