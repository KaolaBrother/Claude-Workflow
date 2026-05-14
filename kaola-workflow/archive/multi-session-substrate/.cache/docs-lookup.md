docs-lookup: N/A - internal patterns sufficient

Rationale:
- Node.js fs.openSync 'wx' flag (O_EXCL exclusive create): standard stdlib, no external lookup needed
- crypto.randomUUID(): standard stdlib since Node 14.17
- gh CLI commands (issue edit, comment, label create, api PATCH): well-known, stable CLI
- ISO-8601 date formatting: standard JS (new Date().toISOString())
- All implementation uses Node.js stdlib only — no external packages
