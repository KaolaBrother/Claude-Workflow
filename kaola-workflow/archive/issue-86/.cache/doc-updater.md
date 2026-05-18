# Doc Updater — Issue #86

## Files Updated
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js`: added 2-line comment before `partitionActiveAndDrift` explaining purpose and export rationale

## Checklist Results
- README.md: SKIP — user-facing command interface unchanged; CWD guard is an error-prevention safeguard
- CHANGELOG.md: SKIP — already updated with issue #86 entry
- docs/api.md: SKIP — cmdStatus is workflow-internal, not public API
- .env.example: SKIP — no new env vars
- Architecture docs: SKIP — no structural changes
- Inline comments: UPDATED — partitionActiveAndDrift JSDoc added
