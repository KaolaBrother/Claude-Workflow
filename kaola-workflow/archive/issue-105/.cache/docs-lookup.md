docs-lookup: N/A - internal patterns sufficient

All affected code is internal to kaola-workflow scripts and hooks. No external
library, framework, or API behavior needs to be verified. Node.js fs.renameSync,
git hooks, and shell scripting are stable, well-known primitives.
