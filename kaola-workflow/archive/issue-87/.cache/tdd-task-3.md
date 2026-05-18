Task 3: GitLab structural contract validation.

Changed:
- `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`

Implementation:
- Added assertions that the GitLab roadmap script contains the missing-source guard terms and atomic/exclusive helper names.
- Included `updated: issue-` in structural checks to cover the explicit update output path.

Validation:
- `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` passed.
- `npm run test:kaola-workflow:gitlab` passed.
