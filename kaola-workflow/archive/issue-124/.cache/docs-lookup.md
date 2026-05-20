docs-lookup: N/A - internal patterns sufficient

All changes are to npm scripts in package.json and contract assertions in existing validate-*.js scripts.
No external library or framework behavior needed — pattern is established by the existing assertIncludes guard at
scripts/validate-kaola-workflow-contracts.js:242.
