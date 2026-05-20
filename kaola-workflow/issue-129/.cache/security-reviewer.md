security-reviewer: N/A

File-risk scan: `scripts/simulate-workflow-walkthrough.js` is a test infrastructure file.
No auth, payments, user data, filesystem access to user files, external API calls, or secrets in the changed code.
The shim conversion writes Node.js scripts to tmpdir and sets PATH — no new attack surface vs the previous shell scripts.
Security review not required.
