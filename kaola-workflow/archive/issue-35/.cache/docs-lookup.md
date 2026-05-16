docs-lookup: N/A - internal patterns sufficient

The fix is entirely within `scripts/kaola-workflow-claim.js` (sortIssueRecords function).
Label data structure is already known from code-explorer: online path gives `{ name, color, description }`
objects via `gh issue list --json labels`, which is already consumed by existing helpers
(`issueHasLabel`, `issueLabelNames`). No external library, API, or framework docs are needed.
