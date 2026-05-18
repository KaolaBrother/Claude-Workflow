Task 2: GitLab roadmap helper port.

Changed:
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-roadmap.js`

Implementation:
- Added `isGeneratedRoadmap`, `parseRoadmapTable`, `guardAgainstMissingRoadmapSource`, `writeFileAtomicReplace`, `createFileExclusive`, and `issueRecordContent`.
- Routed generated ROADMAP writes through atomic temp-file replace.
- Kept `refreshFromGitLab()` issue records update-capable.
- Made default `init-issue` exclusive and added explicit `--update`.

Validation:
- `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js` passed.
- `npm run test:kaola-workflow:gitlab` passed.
