docs-lookup: N/A - internal patterns sufficient

All three bugs are in internal Node.js scripts (kaola-workflow-classifier.js, kaola-workflow-claim.js).
No external library, API, or framework behavior needs to be verified.
Relevant APIs: Node.js `fs`, `child_process`, `process.ppid`, `os` — all stable standard library, no docs lookup needed.
